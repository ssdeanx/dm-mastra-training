import { aiFunction, AIFunctionsProvider, assert, getEnv } from '@agentic/core'
import pThrottle from 'p-throttle'
import { z } from 'zod'
import { PinoLogger } from '@mastra/loggers';
import { createTool } from "@mastra/core/tools";


import type * as types from './types'
import { handleTwitterError } from './utils'

const logger = new PinoLogger({ name: 'twitter', level: 'info' });

/**
 * This file contains rate-limited wrappers around all of the core Twitter API
 * methods that this project uses.
 *
 * NOTE: Twitter has different API rate limits and quotas per plan, so in order
 * to rate-limit effectively, our throttles need to either use the lowest common
 * denominator OR vary based on the twitter developer plan you're using. We
 * chose to go with the latter.
 *
 * @see https://docs.x.com/x-api/fundamentals/rate-limits
 */

type TwitterApiMethod =
  | 'createTweet'
  | 'getTweetById'
  | 'getTweetsById'
  | 'searchRecentTweets'
  | 'listTweetMentionsByUserId'
  | 'listTweetsLikedByUserId'
  | 'listTweetsByUserId'
  | 'getUserById'
  | 'getUserByUsername'

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000

const twitterApiRateLimitsByPlan: Record<
  types.TwitterApiPlan,
  Record<
    TwitterApiMethod,
    {
      readonly limit: number
      readonly interval: number
    }
  >
> = {
  free: {
    // 50 per 24h per user
    // 50 per 24h per app
    createTweet: { limit: 50, interval: TWENTY_FOUR_HOURS_MS },

    getTweetById: { limit: 1, interval: FIFTEEN_MINUTES_MS },
    getTweetsById: { limit: 1, interval: FIFTEEN_MINUTES_MS },
    searchRecentTweets: { limit: 1, interval: FIFTEEN_MINUTES_MS },
    listTweetMentionsByUserId: { limit: 1, interval: FIFTEEN_MINUTES_MS },
    listTweetsLikedByUserId: { limit: 1, interval: FIFTEEN_MINUTES_MS },
    listTweetsByUserId: { limit: 1, interval: FIFTEEN_MINUTES_MS },
    getUserById: { limit: 1, interval: FIFTEEN_MINUTES_MS },
    getUserByUsername: { limit: 1, interval: FIFTEEN_MINUTES_MS }
  },

  basic: {
    // 100 per 24h per user
    // 1667 per 24h per app
    createTweet: { limit: 100, interval: TWENTY_FOUR_HOURS_MS },

    // 15 per 15m per user
    // 15 per 15m per app
    getTweetById: { limit: 15, interval: FIFTEEN_MINUTES_MS },
    getTweetsById: { limit: 15, interval: FIFTEEN_MINUTES_MS },

    // 60 per 15m per user
    // 60 per 15m per app
    searchRecentTweets: { limit: 60, interval: FIFTEEN_MINUTES_MS },

    // 10 per 15m per user
    // 10 per 15m per app
    listTweetMentionsByUserId: { limit: 180, interval: FIFTEEN_MINUTES_MS },

    // 5 per 15min per user
    // 5 per 15min per app
    listTweetsLikedByUserId: { limit: 5, interval: FIFTEEN_MINUTES_MS },

    // 5 per 15min per user
    // 10 per 15min per app
    listTweetsByUserId: { limit: 5, interval: FIFTEEN_MINUTES_MS },

    // 100 per 24h per user
    // 500 per 24h per app
    getUserById: { limit: 100, interval: TWENTY_FOUR_HOURS_MS },
    getUserByUsername: { limit: 100, interval: TWENTY_FOUR_HOURS_MS }
  },

  pro: {
    // 100 per 15m per user
    // 10k per 24h per app
    createTweet: { limit: 100, interval: FIFTEEN_MINUTES_MS },

    // TODO: why would the per-user rate-limit be more than the per-app one?!
    // 900 per 15m per user
    // 450 per 15m per app
    getTweetById: { limit: 450, interval: FIFTEEN_MINUTES_MS },
    getTweetsById: { limit: 450, interval: FIFTEEN_MINUTES_MS },

    // 300 per 15m per user
    // 450 per 15m per app
    searchRecentTweets: { limit: 300, interval: FIFTEEN_MINUTES_MS },

    // 300 per 15m per user
    // 450 per 15m per app
    listTweetMentionsByUserId: { limit: 300, interval: FIFTEEN_MINUTES_MS },

    // 75 per 15min per user
    // 75 per 15min per app
    listTweetsLikedByUserId: { limit: 75, interval: FIFTEEN_MINUTES_MS },

    // 900 per 15min per user
    // 1500 per 15min per app
    listTweetsByUserId: { limit: 900, interval: FIFTEEN_MINUTES_MS },

    // 900 per 15m per user
    // 300 per 15m per app
    getUserById: { limit: 300, interval: FIFTEEN_MINUTES_MS },
    getUserByUsername: { limit: 300, interval: FIFTEEN_MINUTES_MS }
  },

  enterprise: {
    // NOTE: these are just placeholders; the enterprise plan seems to be
    // completely customizable, but it's still useful to define rate limits
    // for robustness. These values just 10x those of the pro plan.
    createTweet: { limit: 1000, interval: FIFTEEN_MINUTES_MS },

    getTweetById: { limit: 4500, interval: FIFTEEN_MINUTES_MS },
    getTweetsById: { limit: 4500, interval: FIFTEEN_MINUTES_MS },

    searchRecentTweets: { limit: 3000, interval: FIFTEEN_MINUTES_MS },
    listTweetMentionsByUserId: { limit: 3000, interval: FIFTEEN_MINUTES_MS },
    listTweetsLikedByUserId: { limit: 750, interval: FIFTEEN_MINUTES_MS },
    listTweetsByUserId: { limit: 9000, interval: FIFTEEN_MINUTES_MS },

    getUserById: { limit: 3000, interval: FIFTEEN_MINUTES_MS },
    getUserByUsername: { limit: 3000, interval: FIFTEEN_MINUTES_MS }
  }
}

/**
 * Twitter/X API v2 client wrapper with rate-limited methods and `@aiFunction`
 * compatibility.
 *
 * Rate limits differ by plan, so make sure the `twitterApiPlan` parameter is
 * properly set to maximize your rate-limit usage.
 *
 * @note This class does not handle distributed rate-limits. It assumes a
 * single, local client is accessing the API at a time, which is a better fit
 * for serverful environments.
 *
 * @see https://docs.x.com/x-api/fundamentals/rate-limits
 * @see https://docs.x.com/x-api
 */
export class TwitterClient extends AIFunctionsProvider {
  readonly client: types.TwitterV2Client
  readonly twitterApiPlan: types.TwitterApiPlan

  // Declare private throttled functions
  private _throttledCreateTweet: ReturnType<typeof createTweetImpl>;
  private _throttledGetTweetById: ReturnType<typeof getTweetByIdImpl>;
  private _throttledGetTweetsById: ReturnType<typeof getTweetsByIdImpl>;
  private _throttledSearchRecentTweets: ReturnType<typeof searchRecentTweetsImpl>;
  private _throttledListTweetMentionsByUserId: ReturnType<typeof listTweetMentionsByUserIdImpl>;
  private _throttledListTweetsLikedByUserId: ReturnType<typeof listTweetsLikedByUserIdImpl>;
  private _throttledListTweetsByUserId: ReturnType<typeof listTweetsByUserIdImpl>;
  private _throttledGetUserById: ReturnType<typeof getUserByIdImpl>;
  private _throttledGetUserByUsername: ReturnType<typeof getUserByUsernameImpl>;


  constructor({
    client,
    twitterApiPlan = (getEnv('TWITTER_API_PLAN') as types.TwitterApiPlan) ??
      'free'
  }: {
    client: types.TwitterV2Client
    twitterApiPlan?: types.TwitterApiPlan
  }) {
    assert(
      client,
      'TwitterClient missing required "client" which should be an instance of "twitter-api-sdk" (use `getTwitterV2Client` to initialize the underlying V2 Twitter SDK using Nango OAuth)'
    )
    assert(twitterApiPlan, 'TwitterClient missing required "twitterApiPlan"')

    super()

    this.client = client
    this.twitterApiPlan = twitterApiPlan

    const twitterApiRateLimits = twitterApiRateLimitsByPlan[twitterApiPlan]!
    assert(twitterApiRateLimits, `Invalid twitter api plan: ${twitterApiPlan}`)

    // Assign throttled Impl functions to private properties
    this._throttledCreateTweet = pThrottle(twitterApiRateLimits.createTweet)(createTweetImpl(this.client));
    this._throttledGetTweetById = pThrottle(twitterApiRateLimits.getTweetById)(getTweetByIdImpl(this.client));
    this._throttledGetTweetsById = pThrottle(twitterApiRateLimits.getTweetsById)(getTweetsByIdImpl(this.client));
    this._throttledSearchRecentTweets = pThrottle(twitterApiRateLimits.searchRecentTweets)(searchRecentTweetsImpl(this.client));
    this._throttledListTweetMentionsByUserId = pThrottle(twitterApiRateLimits.listTweetMentionsByUserId)(listTweetMentionsByUserIdImpl(this.client));
    this._throttledListTweetsLikedByUserId = pThrottle(twitterApiRateLimits.listTweetsLikedByUserId)(listTweetsLikedByUserIdImpl(this.client));
    this._throttledListTweetsByUserId = pThrottle(twitterApiRateLimits.listTweetsByUserId)(listTweetsByUserIdImpl(this.client));
    this._throttledGetUserById = pThrottle(twitterApiRateLimits.getUserById)(getUserByIdImpl(this.client));
    this._throttledGetUserByUsername = pThrottle(twitterApiRateLimits.getUserByUsername)(getUserByUsernameImpl(this.client));
  }

  /**
   * Creates a new tweet
   */
  @aiFunction({
    name: 'create_tweet',
    description: 'Creates a new tweet',
    inputSchema: z.object({
      text: z.string().nonempty()
    })
  })
  async createTweet(
    params: types.CreateTweetParams
  ): Promise<types.CreatedTweet> {
    return this._throttledCreateTweet(params);
  }

  /**
   * Fetch a tweet by its ID
   */
  @aiFunction({
    name: 'get_tweet_by_id',
    description: 'Fetch a tweet by its ID',
    inputSchema: z.object({
      id: z.string().nonempty()
    })
  })
  async getTweetById(params: { id: string } & types.GetTweetByIdParams) {
    return this._throttledGetTweetById(params.id, params);
  }

  /**
   * Fetch an array of tweets by their IDs
   */
  @aiFunction({
    name: 'get_tweets_by_id',
    description: 'Fetch an array of tweets by their IDs',
    inputSchema: z.object({
      ids: z.array(z.string().nonempty())
    })
  })
  async getTweetsById({ ids, ...params }: types.GetTweetsByIdParams) {
    return this._throttledGetTweetsById(ids, params);
  }

  /**
   * Searches for recent tweets
   */
  @aiFunction({
    name: 'search_recent_tweets',
    description: 'Searches for recent tweets',
    inputSchema: z.object({
      query: z.string().nonempty(),
      sort_order: z
        .enum(['recency', 'relevancy'])
        .default('relevancy')
        .optional(),
      max_results: z.number().min(10).max(100).optional(),
      pagination_token: z.string().optional()
    })
  })
  async searchRecentTweets(
    this: TwitterClient,
    params: types.SearchRecentTweetsParams
  ): Promise<ReturnType<typeof this._throttledSearchRecentTweets>> {
    return this._throttledSearchRecentTweets(params);
  }

  /**
   * Lists tweets which mention the given user.
   */
  @aiFunction({
    name: 'list_tweet_mentions_by_user_id',
    description: 'Lists tweets which mention the given user.',
    inputSchema: z.object({
      userId: z.string().nonempty(),
      max_results: z.number().min(5).max(100).optional(),
      pagination_token: z.string().optional()
    })
  })
  async listTweetMentionsByUserId({
    userId,
    ...params
  }: { userId: string } & types.ListTweetMentionsByUserIdParams) {
    return this._throttledListTweetMentionsByUserId(userId, params);
  }

  /**
   * Lists tweets liked by a user.
   */
  @aiFunction({
    name: 'list_tweets_liked_by_user_id',
    description: 'Lists tweets liked by a user.',
    inputSchema: z.object({
      userId: z.string().nonempty(),
      max_results: z.number().min(5).max(100).optional(),
      pagination_token: z.string().optional()
    })
  })
  async listTweetsLikedByUserId({
    userId,
    ...params
  }: { userId: string } & types.ListTweetsLikedByUserIdParams) {
    return this._throttledListTweetsLikedByUserId(userId, params);
  }

  /**
   * Lists tweets authored by a user.
   */
  @aiFunction({
    name: 'list_tweets_by_user_id',
    description: 'Lists tweets authored by a user.',
    inputSchema: z.object({
      userId: z.string().nonempty(),
      max_results: z.number().min(5).max(100).optional(),
      pagination_token: z.string().optional(),
      exclude: z
        .array(z.union([z.literal('replies'), z.literal('retweets')]))
        .optional()
        .describe(
          'By default, replies and retweets are included. Use this parameter if you want to exclude either or both of them.'
        )
    })
  })
  async listTweetsByUserId({
    userId,
    ...params
  }: { userId: string } & types.ListTweetsByUserIdParams) {
    return this._throttledListTweetsByUserId(userId, params);
  }

  /**
   * Fetch a twitter user by ID
   */
  @aiFunction({
    name: 'get_twitter_user_by_id',
    description: 'Fetch a twitter user by ID',
    inputSchema: z.object({
      id: z.string().min(1)
    })
  })
  async getUserById({
    id,
    ...params
  }: { id: string } & types.GetUserByIdParams) {
    return this._throttledGetUserById(id, params);
  }

  /**
   * Fetch a twitter user by username
   */
  @aiFunction({
    name: 'get_twitter_user_by_username',
    description: 'Fetch a twitter user by username',
    inputSchema: z.object({
      username: z.string().min(1)
    })
  })
  async getUserByUsername({
    username,
    ...params
  }: { username: string } & types.GetUserByUsernameParams) {
    return this._throttledGetUserByUsername(username, params);
  }
}

const defaultTwitterQueryTweetFields: types.TwitterQueryTweetFields = [
  'attachments',
  'author_id',
  'conversation_id',
  'created_at',
  'entities',
  'geo',
  'id',
  'in_reply_to_user_id',
  'lang',
  'public_metrics',
  'possibly_sensitive',
  'referenced_tweets',
  'text'
  // 'context_annotations', // not needed (way too verbose and noisy)
  // 'edit_controls', / not needed
  // 'non_public_metrics', // don't have access to
  // 'organic_metrics', // don't have access to
  // 'promoted_metrics, // don't have access to
  // 'reply_settings', / not needed
  // 'source', // not needed
  // 'withheld' // not needed
]

const defaultTwitterQueryUserFields: types.TwitterQueryUserFields = [
  'created_at',
  'description',
  'entities',
  'id',
  'location',
  'name',
  'pinned_tweet_id',
  'profile_image_url',
  'protected',
  'public_metrics',
  'url',
  'username',
  'verified'
  // 'most_recent_tweet_id',
  // 'verified_type',
  // 'withheld'
]

const defaultTweetQueryParams: types.TweetsQueryOptions = {
  // https://developer.twitter.com/en/docs/twitter-api/expansions
  expansions: [
    'author_id',
    'in_reply_to_user_id',
    'referenced_tweets.id',
    'referenced_tweets.id.author_id',
    'entities.mentions.username',
    // TODO
    'attachments.media_keys',
    'geo.place_id',
    'attachments.poll_ids'
  ],
  'tweet.fields': defaultTwitterQueryTweetFields,
  'user.fields': defaultTwitterQueryUserFields
}

const defaultUserQueryParams: types.TwitterUserQueryOptions = {
  // https://developer.twitter.com/en/docs/twitter-api/expansions
  expansions: ['pinned_tweet_id'],
  'tweet.fields': defaultTwitterQueryTweetFields,
  'user.fields': defaultTwitterQueryUserFields
}

// Impl functions with logging and proper error handling
function createTweetImpl(client: types.TwitterV2Client) {
  return async (
    params: types.CreateTweetParams
  ): Promise<types.CreatedTweet> => {
    logger.info('Creating tweet', { text: params.text });
    try {
      const { data: tweet } = await client.tweets.createTweet(params)

      if (!tweet?.id) {
        throw new Error('invalid createTweet response')
      }
      logger.info('Tweet created successfully', { tweetId: tweet.id });
      return tweet
    } catch (error: unknown) {
      logger.error('Failed to create tweet', { error: error instanceof Error ? error.message : 'Unknown error' });
      handleTwitterError(error, { label: 'error creating tweet' })
    }
  }
}

function getTweetByIdImpl(client: types.TwitterV2Client) {
  return async (tweetId: string, params?: types.GetTweetByIdParams) => {
    logger.info('Fetching tweet by ID', { tweetId });
    try {
      const response = await client.tweets.findTweetById(tweetId, {
        ...defaultTweetQueryParams,
        ...params
      })
      logger.info('Tweet fetched successfully', { tweetId });
      return response;
    } catch (error: unknown) {
      logger.error('Failed to fetch tweet by ID', { tweetId, error: error instanceof Error ? error.message : 'Unknown error' });
      handleTwitterError(error, { label: `error fetching tweet ${tweetId}` })
    }
  }
}

function getTweetsByIdImpl(client: types.TwitterV2Client) {
  return async (
    ids: string[],
    params?: Omit<types.GetTweetsByIdParams, 'ids'>
  ) => {
    logger.info('Fetching tweets by IDs', { ids });
    try {
      const response = await client.tweets.findTweetsById({
        ...defaultTweetQueryParams,
        ...params,
        ids
      })
      logger.info('Tweets fetched successfully', { ids });
      return response;
    } catch (error: unknown) {
      logger.error('Failed to fetch tweets by IDs', { ids, error: error instanceof Error ? error.message : 'Unknown error' });
      handleTwitterError(error, { label: `error fetching ${ids.length} tweets` })
    }
  }
}

function searchRecentTweetsImpl(client: types.TwitterV2Client) {
  return async (params: types.SearchRecentTweetsParams) => {
    logger.info('Searching recent tweets', { query: params.query });
    try {
      const response = await client.tweets.tweetsRecentSearch({
        ...defaultTweetQueryParams,
        ...params
      })
      logger.info('Recent tweets search completed successfully', { query: params.query });
      return response;
    } catch (error: unknown) {
      logger.error('Failed to search recent tweets', { query: params.query, error: error instanceof Error ? error.message : 'Unknown error' });
      handleTwitterError(error, {
        label: `error searching tweets query "${params.query}"`
      })
    }
  }
}

function getUserByIdImpl(client: types.TwitterV2Client) {
  return async (userId: string, params?: types.GetUserByIdParams) => {
    logger.info('Fetching user by ID', { userId });
    try {
      const response = await client.users.findUserById(userId, {
        ...defaultUserQueryParams,
        ...params
      })
      logger.info('User fetched successfully', { userId });
      return response;
    } catch (error: unknown) {
      logger.error('Failed to fetch user by ID', { userId, error: error instanceof Error ? error.message : 'Unknown error' });
      handleTwitterError(error, {
        label: `error fetching user ${userId}`
      })
    }
  }
}

function getUserByUsernameImpl(client: types.TwitterV2Client) {
  return async (username: string, params?: types.GetUserByUsernameParams) => {
    logger.info('Fetching user by username', { username });
    try {
      const response = await client.users.findUserByUsername(username, {
        ...defaultUserQueryParams,
        ...params
      })
      logger.info('User fetched successfully', { username });
      return response;
    } catch (error: unknown) {
      logger.error('Failed to fetch user by username', { username, error: error instanceof Error ? error.message : 'Unknown error' });
      handleTwitterError(error, {
        label: `error fetching user with username ${username}`
      })
    }
  }
}

function listTweetMentionsByUserIdImpl(client: types.TwitterV2Client) {
  return async (
    userId: string,
    params?: types.ListTweetMentionsByUserIdParams
  ) => {
    logger.info('Listing tweet mentions by user ID', { userId });
    try {
      const response = await client.tweets.usersIdMentions(userId, {
        ...defaultTweetQueryParams,
        ...params
      })
      logger.info('Tweet mentions listed successfully', { userId });
      return response;
    } catch (error: unknown) {
      logger.error('Failed to list tweet mentions by user ID', { userId, error: error instanceof Error ? error.message : 'Unknown error' });
      handleTwitterError(error, {
        label: `error fetching tweets mentions for user ${userId}`
      })
    }
  }
}

function listTweetsLikedByUserIdImpl(client: types.TwitterV2Client) {
  return async (
    userId: string,
    params?: types.ListTweetsLikedByUserIdParams
  ) => {
    logger.info('Listing tweets liked by user ID', { userId });
    try {
      const response = await client.tweets.usersIdLikedTweets(userId, {
        ...defaultTweetQueryParams,
        ...params
      })
      logger.info('Tweets liked by user listed successfully', { userId });
      return response;
    } catch (error: unknown) {
      logger.error('Failed to list tweets liked by user ID', { userId, error: error instanceof Error ? error.message : 'Unknown error' });
      handleTwitterError(error, {
        label: `error fetching tweets liked by user ${userId}`
      })
    }
  }
}

function listTweetsByUserIdImpl(client: types.TwitterV2Client) {
  return async (userId: string, params?: types.ListTweetsByUserIdParams) => {
    logger.info('Listing tweets by user ID', { userId });
    try {
      const response = await client.tweets.usersIdTweets(userId, {
        ...defaultTweetQueryParams,
        ...params
      })
      logger.info('Tweets by user listed successfully', { userId });
      return response;
    } catch (error: unknown) {
      logger.error('Failed to list tweets by user ID', { userId, error: error instanceof Error ? error.message : 'Unknown error' });
      handleTwitterError(error, {
        label: `error fetching tweets by user ${userId}`
      })
    }
  }
}

export function createTwitterTools(config: {
  client: types.TwitterV2Client;
  twitterApiPlan?: types.TwitterApiPlan;
}) {
  const twitterClient = new TwitterClient(config);

  return {
    twitterCreateTweet: createTool({
      id: "twitter-create-tweet",
      description: "Creates a new tweet.",
      inputSchema: z.object({ text: z.string().nonempty().describe('The text content of the tweet.') }),
      outputSchema: z.object({ id: z.string(), text: z.string() }), // Simplified output schema
      execute: async ({ context }) => twitterClient.createTweet(context),
    }),
    twitterGetTweetById: createTool({
      id: "twitter-get-tweet-by-id",
      description: "Fetches a tweet by its ID.",
      inputSchema: z.object({ id: z.string().nonempty().describe('The ID of the tweet to fetch.') }),
      outputSchema: z.any(), // TODO: Define a more specific schema
      execute: async ({ context }) => twitterClient.getTweetById(context),
    }),
    twitterGetTweetsById: createTool({
      id: "twitter-get-tweets-by-id",
      description: "Fetches an array of tweets by their IDs.",
      inputSchema: z.object({ ids: z.array(z.string().nonempty()).describe('An array of tweet IDs to fetch.') }),
      outputSchema: z.any(), // TODO: Define a more specific schema
      execute: async ({ context }) => twitterClient.getTweetsById(context),
    }),
    twitterSearchRecentTweets: createTool({
      id: "twitter-search-recent-tweets",
      description: "Searches for recent tweets.",
      inputSchema: z.object({
        query: z.string().nonempty().describe('The search query.'),
        sort_order: z.enum(['recency', 'relevancy']).default('relevancy').optional().describe('Order of results.'),
        max_results: z.number().min(10).max(100).optional().describe('Maximum number of results to return.'),
        pagination_token: z.string().optional().describe('Token for pagination.')
      }),
      outputSchema: z.any(), // TODO: Define a more specific schema
      execute: async ({ context }) => twitterClient.searchRecentTweets(context),
    }),
    twitterListTweetMentionsByUserId: createTool({
      id: "twitter-list-tweet-mentions-by-user-id",
      description: "Lists tweets which mention the given user.",
      inputSchema: z.object({
        userId: z.string().nonempty().describe('The ID of the user.'),
        max_results: z.number().min(5).max(100).optional().describe('Maximum number of results to return.'),
        pagination_token: z.string().optional().describe('Token for pagination.')
      }),
      outputSchema: z.any(), // TODO: Define a more specific schema
      execute: async ({ context }) => twitterClient.listTweetMentionsByUserId(context),
    }),
    twitterListTweetsLikedByUserId: createTool({
      id: "twitter-list-tweets-liked-by-user-id",
      description: "Lists tweets liked by a user.",
      inputSchema: z.object({
        userId: z.string().nonempty().describe('The ID of the user.'),
        max_results: z.number().min(5).max(100).optional().describe('Maximum number of results to return.'),
        pagination_token: z.string().optional().describe('Token for pagination.')
      }),
      outputSchema: z.any(), // TODO: Define a more specific schema
      execute: async ({ context }) => twitterClient.listTweetsLikedByUserId(context),
    }),
    twitterListTweetsByUserId: createTool({
      id: "twitter-list-tweets-by-user-id",
      description: "Lists tweets authored by a user.",
      inputSchema: z.object({
        userId: z.string().nonempty().describe('The ID of the user.'),
        max_results: z.number().min(5).max(100).optional().describe('Maximum number of results to return.'),
        pagination_token: z.string().optional().describe('Token for pagination.'),
        exclude: z.array(z.union([z.literal('replies'), z.literal('retweets')])).optional().describe('Exclude replies or retweets.')
      }),
      outputSchema: z.any(), // TODO: Define a more specific schema
      execute: async ({ context }) => twitterClient.listTweetsByUserId(context),
    }),
    twitterGetUserById: createTool({
      id: "twitter-get-user-by-id",
      description: "Fetches a Twitter user by ID.",
      inputSchema: z.object({ id: z.string().min(1).describe('The ID of the Twitter user to fetch.') }),
      outputSchema: z.any(), // TODO: Define a more specific schema
      execute: async ({ context }) => twitterClient.getUserById(context),
    }),
    twitterGetUserByUsername: createTool({
      id: "twitter-get-user-by-username",
      description: "Fetches a Twitter user by username.",
      inputSchema: z.object({ username: z.string().min(1).describe('The username of the Twitter user to fetch.') }),
      outputSchema: z.any(), // TODO: Define a more specific schema
      execute: async ({ context }) => twitterClient.getUserByUsername(context),
    }),
  };
}

export const twitterTools = createTwitterTools({
  client: {} as types.TwitterV2Client, // Placeholder, client will be initialized at runtime
  twitterApiPlan: (getEnv('TWITTER_API_PLAN') as types.TwitterApiPlan) ?? 'free'
});

// Export each Twitter tool individually for granular usage
export const twitterCreateTweetTool = twitterTools.twitterCreateTweet;
export const twitterGetTweetByIdTool = twitterTools.twitterGetTweetById;
export const twitterGetTweetsByIdTool = twitterTools.twitterGetTweetsById;
export const twitterSearchRecentTweetsTool = twitterTools.twitterSearchRecentTweets;
export const twitterListTweetMentionsByUserIdTool = twitterTools.twitterListTweetMentionsByUserId;
export const twitterListTweetsLikedByUserIdTool = twitterTools.twitterListTweetsLikedByUserId;
export const twitterListTweetsByUserIdTool = twitterTools.twitterListTweetsByUserId;
export const twitterGetUserByIdTool = twitterTools.twitterGetUserById;
export const twitterGetUserByUsernameTool = twitterTools.twitterGetUserByUsername;
