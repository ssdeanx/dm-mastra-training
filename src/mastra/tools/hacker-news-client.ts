import { assert, getEnv, sanitizeSearchParams } from '@agentic/core';
import defaultKy, { type KyInstance } from 'ky';
import { z } from 'zod';
import { createTool } from "@mastra/core/tools";
import { PinoLogger } from '@mastra/loggers';
import { RuntimeContext } from '@mastra/core/di';

const logger = new PinoLogger({ name: 'hacker-news', level: 'info' });

export const HACKER_NEWS_API_BASE_URL = 'https://hacker-news.firebaseio.com';
export const HACKER_NEWS_API_SEARCH_BASE_URL = 'https://hn.algolia.com';
export const HACKER_NEWS_API_USER_AGENT = 'Agentic (https://github.com/transitive-bullshit/agentic)';

export const ItemTypeSchema = z.union([
  z.literal('story'), z.literal('comment'), z.literal('ask'), z.literal('job'), z.literal('poll'), z.literal('pollopt')
]);
export type ItemType = z.infer<typeof ItemTypeSchema>;

export const ItemSchema = z.object({ // This is for hackernews.Item (Firebase API)
  id: z.number(),
  type: ItemTypeSchema,
  by: z.string(),
  time: z.number(),
  score: z.number(),
  title: z.string().optional(),
  url: z.string().optional(),
  text: z.string().optional(),
  descendants: z.number().optional(),
  parent: z.number().optional(),
  kids: z.array(z.number()).optional(),
  parts: z.array(z.number()).optional(),
});
export type Item = z.infer<typeof ItemSchema>;

export const UserSchema = z.object({ // This is for hackernews.User (Firebase API)
  id: z.string(),
  created: z.number(),
  about: z.string(),
  karma: z.number(),
  submitted: z.array(z.number()),
});
export type User = z.infer<typeof UserSchema>;

export const SearchItemSchema = z.object({ // This is for hackernews.SearchItem (Algolia API)
  id: z.number(),
  created_at: z.string(),
  created_at_i: z.number(),
  title: z.string().optional(),
  url: z.string().optional(),
  author: z.string(),
  text: z.string().nullable(),
  points: z.number().nullable(),
  parent_id: z.number().nullable(),
  story_id: z.number().nullable(),
  type: ItemTypeSchema,
  children: z.array(z.any()),
  options: z.array(z.any()).optional(),
});
export type SearchItem = z.infer<typeof SearchItemSchema>;

export const SearchUserSchema = z.object({ // This is for hackernews.SearchUser (Algolia API)
  username: z.string(),
  about: z.string(),
  karma: z.number(),
});
export type SearchUser = z.infer<typeof SearchUserSchema>;

export const SearchTagSchema = z.union([
  z.literal('story'), z.literal('comment'), z.literal('poll'), z.literal('pollopt'), z.literal('show_hn'), z.literal('ask_hn'), z.literal('front_page')
]);
export type SearchTag = z.infer<typeof SearchTagSchema>;

export const SearchNumericFilterFieldSchema = z.union([
  z.literal('created_at_i'), z.literal('points'), z.literal('num_comments')
]);
export type SearchNumericFilterField = z.infer<typeof SearchNumericFilterFieldSchema>;

export const SearchNumericFilterConditionSchema = z.union([
  z.literal('<'), z.literal('<='), z.literal('='), z.literal('>='), z.literal('>')
]);
export type SearchNumericFilterCondition = z.infer<typeof SearchNumericFilterConditionSchema>;

export const SearchSortBySchema = z.union([
  z.literal('relevance'), z.literal('recency')
]);
export type SearchSortBy = z.infer<typeof SearchSortBySchema>;

export const SearchOptionsSchema = z.object({
  query: z.string().optional().describe('Full-text search query'),
  author: z.string().optional().describe("Filter by author's HN username"),
  story: z.string().optional().describe('Filter by story id'),
  tags: z.array(SearchTagSchema).optional().describe("Filter by type of item (story, comment, etc.)"),
  numericFilters: z.array(z.string()).optional().describe('Filter by numeric range (created_at_i, points, or num_comments); (created_at_i is a timestamp in seconds)'),
  page: z.number().int().optional().describe('Page number to return'),
  hitsPerPage: z.number().int().optional().describe('Number of results to return per page'),
  sortBy: SearchSortBySchema.optional().describe('How to sort the results'),
});
export type SearchOptions = z.infer<typeof SearchOptionsSchema>;

export const HighlightSchema = z.object({
  value: z.string(),
  matchLevel: z.string(),
  matchedWords: z.array(z.string()),
  fullyHighlighted: z.boolean().optional(),
});
export type Highlight = z.infer<typeof HighlightSchema>;

export const SearchHighlightResultSchema = z.object({
  author: HighlightSchema,
  title: HighlightSchema.optional(),
  url: HighlightSchema.optional(),
  comment_text: HighlightSchema.optional(),
  story_title: HighlightSchema.optional(),
  story_url: HighlightSchema.optional(),
});
export type SearchHighlightResult = z.infer<typeof SearchHighlightResultSchema>;

export const SearchHitSchema = z.object({
  objectID: z.string(),
  url: z.string(),
  title: z.string(),
  author: z.string(),
  story_text: z.string().optional(),
  story_id: z.number().optional(),
  story_url: z.string().optional(),
  comment_text: z.string().optional(),
  points: z.number().optional(),
  num_comments: z.number().optional(),
  created_at: z.string(),
  created_at_i: z.number(),
  updated_at: z.string(),
  parts: z.array(z.number()).optional(),
  children: z.array(z.number()),
  _tags: z.array(z.string()),
  _highlightResult: SearchHighlightResultSchema,
});
export type SearchHit = z.infer<typeof SearchHitSchema>;

export const SearchResponseSchema = z.object({
  hits: z.array(SearchHitSchema),
  page: z.number(),
  nbHits: z.number(),
  nbPages: z.number(),
  hitsPerPage: z.number(),
  query: z.string(),
  params: z.string(),
  processingTimeMS: z.number(),
  serverTimeMS: z.number(),
  processingTimingsMS: z.any().optional(),
});
export type SearchResponse = z.infer<typeof SearchResponseSchema>;

export const GetItemOptionsSchema = z.object({
  itemId: z.union([z.string(), z.number()]).describe('The ID of the HN story or comment.'),
});

export const GetUserOptionsSchema = z.object({
  username: z.union([z.string(), z.number()]).describe('The username of the HN user.'),
});

export type GetItemOptionsSchema = z.infer<typeof GetItemOptionsSchema>;
export type GetUserOptionsSchema = z.infer<typeof GetUserOptionsSchema>;

/**
 * Configuration options for the HackerNewsClient constructor
 */
export interface HackerNewsClientOptions {
  apiBaseUrl?: string;
  apiSearchBaseUrl?: string;
  apiUserAgent?: string;
  ky?: KyInstance;
  timeoutMs?: number;
}

/**
 * Basic client for the official Hacker News API.
 *
 * The normal API methods (`getItem`) use the official Firebase API, while the
 * search-prefixed methods use the more powerful Algolia API. The tradeoff is
 * that the official Firebase API is generally more reliable in my experience,
 * which is why we opted to support both.
 *
 * @see https://github.com/HackerNews/API
 * @see https://hn.algolia.com/api
 */
export class HackerNewsClient {
  protected readonly apiKy: KyInstance;
  protected readonly apiSearchKy: KyInstance;

  protected readonly apiBaseUrl: string;
  protected readonly apiSearchBaseUrl: string;
  protected readonly apiUserAgent: string;

  constructor({
    apiBaseUrl = getEnv('HACKER_NEWS_API_BASE_URL') ?? HACKER_NEWS_API_BASE_URL,
    apiSearchBaseUrl = getEnv('HACKER_NEWS_API_SEARCH_BASE_URL') ?? HACKER_NEWS_API_SEARCH_BASE_URL,
    apiUserAgent = getEnv('HACKER_NEWS_API_USER_AGENT') ?? HACKER_NEWS_API_USER_AGENT,
    ky = defaultKy,
    timeoutMs = 60_000
  }: HackerNewsClientOptions = {}) {
    assert(apiBaseUrl, 'HackerNewsClient missing required "apiBaseUrl"');
    assert(apiSearchBaseUrl, 'HackerNewsClient missing required "apiSearchBaseUrl"');

    this.apiBaseUrl = apiBaseUrl;
    this.apiSearchBaseUrl = apiSearchBaseUrl;
    this.apiUserAgent = apiUserAgent;

    this.apiKy = ky.extend({
      prefixUrl: apiBaseUrl,
      timeout: timeoutMs,
      headers: {
        'user-agent': apiUserAgent
      }
    });

    this.apiSearchKy = ky.extend({
      prefixUrl: apiSearchBaseUrl,
      timeout: timeoutMs,
      headers: {
        'user-agent': apiUserAgent
      }
    });
  }

  async getSearchItem(itemIdOrOpts: string | number | { itemId: string | number }): Promise<SearchItem> {
    const { itemId } =
      typeof itemIdOrOpts === 'string' || typeof itemIdOrOpts === 'number'
        ? { itemId: itemIdOrOpts }
        : itemIdOrOpts;

    return this.apiSearchKy
      .get(`api/v1/items/${itemId}`)
      .json<SearchItem>();
  }

  async getSearchUser(usernameOrOpts: string | number | { username: string | number }): Promise<SearchUser> {
    const { username } =
      typeof usernameOrOpts === 'string' || typeof usernameOrOpts === 'number'
        ? { username: usernameOrOpts }
        : usernameOrOpts;

    return this.apiSearchKy
      .get(`api/v1/users/${username}`)
      .json<SearchUser>();
  }

  async searchItems(queryOrOpts: string | SearchOptions): Promise<SearchResponse> {
    const {
      query,
      numericFilters,
      page,
      hitsPerPage,
      sortBy = 'relevance',
      ...opts
    } = typeof queryOrOpts === 'string' ? { query: queryOrOpts } : queryOrOpts;

    // Tags are AND'ed together; we do not support OR'ing tags via parentheses.
    const tags = [
      ...(opts.tags ?? []),
      opts.story ? `story_${opts.story}` : undefined,
      opts.author ? `author_${opts.author}` : undefined
    ].filter(Boolean);

    return this.apiSearchKy
      .get(sortBy === 'relevance' ? 'api/v1/search' : 'api/v1/search_by_date', {
        searchParams: sanitizeSearchParams(
          {
            query,
            tags,
            numericFilters,
            page,
            hitsPerPage
          },
          { csv: true }
        )
      })
      .json<SearchResponse>();
  }

  async getSearchTopStories(queryOrOpts: string | SearchOptions): Promise<SearchResponse> {
    const opts =
      typeof queryOrOpts === 'string' ? { query: queryOrOpts } : queryOrOpts;

    return this.searchItems({
      ...opts,
      tags: ['front_page', ...(opts.tags ?? [])]
    });
  }

  async getItem(id: string | number): Promise<Item> {
    return this.apiKy.get(`v0/item/${id}.json`).json<Item>();
  }

  async getTopStories(): Promise<number[]> {
    return this.apiKy.get('v0/topstories.json').json<number[]>();
  }

  async getNewStories(): Promise<number[]> {
    return this.apiKy.get('v0/newstories.json').json<number[]>();
  }

  async getBestStories(): Promise<number[]> {
    return this.apiKy.get('v0/beststories.json').json<number[]>();
  }
}

export type HackerNewsRuntimeContext = {
  'debug'?: boolean;
};

/**
 * Configuration options for creating a HackerNews client
 */
export interface CreateHackerNewsClientOptions {
  apiBaseUrl?: string;
  apiSearchBaseUrl?: string;
  apiUserAgent?: string;
  ky?: KyInstance;
  timeoutMs?: number;
}

/**
 * Return type for createHackerNewsClient function
 */
export interface HackerNewsClientTools {
  hackerNewsGetSearchItem: ReturnType<typeof createTool>;
  hackerNewsGetSearchUser: ReturnType<typeof createTool>;
  hackerNewsSearchItems: ReturnType<typeof createTool>;
  hackerNewsGetSearchTopStories: ReturnType<typeof createTool>;
  hackerNewsGetItem: ReturnType<typeof createTool>;
  hackerNewsGetTopStories: ReturnType<typeof createTool>;
  hackerNewsGetNewStories: ReturnType<typeof createTool>;
  hackerNewsGetBestStories: ReturnType<typeof createTool>;
}

export function createHackerNewsClient(options?: CreateHackerNewsClientOptions): HackerNewsClientTools {
  const hackerNewsClient: HackerNewsClient = new HackerNewsClient(options);

  const hackerNewsRuntimeContext: RuntimeContext<HackerNewsRuntimeContext> = new RuntimeContext<HackerNewsRuntimeContext>();
  hackerNewsRuntimeContext.set('debug', false);

  return {
    hackerNewsGetSearchItem: createTool({
      id: "hacker-news-get-search-item",
      description: "Fetches a HN story or comment by its ID from the Algolia search API.",
      inputSchema: GetItemOptionsSchema,
      outputSchema: SearchItemSchema,
      execute: async ({ context, runtimeContext }: { context: GetItemOptionsSchema; runtimeContext?: RuntimeContext<HackerNewsRuntimeContext> }) => {
        const debug = (runtimeContext?.get('debug') as boolean | undefined) ?? false;
        if (debug) {
          logger.info('Fetching HN search item', { itemId: context.itemId });
        }
        try {
          const response = await hackerNewsClient.getSearchItem(context.itemId);
          if (debug) {
            logger.info('HN search item fetched successfully', { itemId: context.itemId });
          }
          return response;
        } catch (error) {
          logger.error('Failed to fetch HN search item', { itemId: context.itemId, error: error instanceof Error ? error.message : 'Unknown error' });
          throw new Error(`Failed to fetch HN search item: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      },
    }),
    hackerNewsGetSearchUser: createTool({
      id: "hacker-news-get-search-user",
      description: "Fetches a HN user by username from the Algolia search API.",
      inputSchema: GetUserOptionsSchema,
      outputSchema: SearchUserSchema,
      execute: async ({ context, runtimeContext }: { context: GetUserOptionsSchema; runtimeContext?: RuntimeContext<HackerNewsRuntimeContext> }) => {
        const debug = (runtimeContext?.get('debug') as boolean | undefined) ?? false;
        if (debug) {
          logger.info('Fetching HN search user', { username: context.username });
        }
        try {
          const response = await hackerNewsClient.getSearchUser(context.username);
          if (debug) {
            logger.info('HN search user fetched successfully', { username: context.username });
          }
          return response;
        } catch (error) {
          logger.error('Failed to fetch HN search user', { username: context.username, error: error instanceof Error ? error.message : 'Unknown error' });
          throw new Error(`Failed to fetch HN search user: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      },
    }),
    hackerNewsSearchItems: createTool({
      id: "hacker-news-search-items",
      description: "Searches HN for stories and comments matching the given query using the Algolia search API.",
      inputSchema: SearchOptionsSchema,
      outputSchema: SearchResponseSchema,
      execute: async ({ context, runtimeContext }: { context: SearchOptions; runtimeContext?: RuntimeContext<HackerNewsRuntimeContext> }) => {
        const debug = (runtimeContext?.get('debug') as boolean | undefined) ?? false;
        if (debug) {
          logger.info('Searching HN items', { query: context.query });
        }
        try {
          const response = await hackerNewsClient.searchItems(context);
          if (debug) {
            logger.info('HN items search completed successfully', { query: context.query });
          }
          return response;
        } catch (error) {
          logger.error('Failed to search HN items', { query: context.query, error: error instanceof Error ? error.message : 'Unknown error' });
          throw new Error(`Failed to search HN items: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      },
    }),
    hackerNewsGetSearchTopStories: createTool({
      id: "hacker-news-get-search-top-stories",
      description: "Fetches/searches the top stories currently on the front page of HN using the Algolia search API.",
      inputSchema: SearchOptionsSchema,
      outputSchema: SearchResponseSchema,
      execute: async ({ context, runtimeContext }: { context: SearchOptions; runtimeContext?: RuntimeContext<HackerNewsRuntimeContext> }) => {
        const debug = (runtimeContext?.get('debug') as boolean | undefined) ?? false;
        if (debug) {
          logger.info('Fetching HN top stories', { query: context.query });
        }
        try {
          const response = await hackerNewsClient.getSearchTopStories(context);
          if (debug) {
            logger.info('HN top stories fetched successfully', { query: context.query });
          }
          return response;
        } catch (error) {
          logger.error('Failed to fetch HN top stories', { query: context.query, error: error instanceof Error ? error.message : 'Unknown error' });
          throw new Error(`Failed to fetch HN top stories: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      },
    }),
    hackerNewsGetItem: createTool({
      id: "hacker-news-get-item",
      description: "Fetches a HN story or comment by its ID from the official Firebase API.",
      inputSchema: GetItemOptionsSchema,
      outputSchema: ItemSchema,
      execute: async ({ context, runtimeContext }: { context: GetItemOptionsSchema; runtimeContext?: RuntimeContext<HackerNewsRuntimeContext> }) => {
        const debug = (runtimeContext?.get('debug') as boolean | undefined) ?? false;
        if (debug) {
          logger.info('Fetching HN item', { id: context.itemId });
        }
        try {
          const response = await hackerNewsClient.getItem(context.itemId);
          if (debug) {
            logger.info('HN item fetched successfully', { id: context.itemId });
          }
          return response;
        } catch (error) {
          logger.error('Failed to fetch HN item', { id: context.itemId, error: error instanceof Error ? error.message : 'Unknown error' });
          throw new Error(`Failed to fetch HN item: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      },
    }),
    hackerNewsGetTopStories: createTool({
      id: "hacker-news-get-top-stories",
      description: "Fetches the IDs of the top stories from the official Firebase API.",
      inputSchema: z.object({}),
      outputSchema: z.array(z.number()),
      execute: async ({ runtimeContext }) => {
        const debug = (runtimeContext?.get('debug') as boolean | undefined) ?? false;
        if (debug) {
          logger.info('Fetching HN top stories IDs');
        }
        try {
          const response = await hackerNewsClient.getTopStories();
          if (debug) {
            logger.info('HN top stories IDs fetched successfully');
          }
          return response;
        } catch (error) {
          logger.error('Failed to fetch HN top stories IDs', { error: error instanceof Error ? error.message : 'Unknown error' });
          throw new Error(`Failed to fetch HN top stories IDs: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      },
    }),
    hackerNewsGetNewStories: createTool({
      id: "hacker-news-get-new-stories",
      description: "Fetches the IDs of the new stories from the official Firebase API.",
      inputSchema: z.object({}),
      outputSchema: z.array(z.number()),
      execute: async ({ runtimeContext }) => {
        const debug = (runtimeContext?.get('debug') as boolean | undefined) ?? false;
        if (debug) {
          logger.info('Fetching HN new stories IDs');
        }
        try {
          const response = await hackerNewsClient.getNewStories();
          if (debug) {
            logger.info('HN new stories IDs fetched successfully');
          }
          return response;
        } catch (error) {
          logger.error('Failed to fetch HN new stories IDs', { error: error instanceof Error ? error.message : 'Unknown error' });
          throw new Error(`Failed to fetch HN new stories IDs: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      },
    }),
    hackerNewsGetBestStories: createTool({
      id: "hacker-news-get-best-stories",
      description: "Fetches the IDs of the best stories from the official Firebase API.",
      inputSchema: z.object({}),
      outputSchema: z.array(z.number()),
      execute: async ({ runtimeContext }) => {
        const debug = (runtimeContext?.get('debug') as boolean | undefined) ?? false;
        if (debug) {
          logger.info('Fetching HN best stories IDs');
        }
        try {
          const response = await hackerNewsClient.getBestStories();
          if (debug) {
            logger.info('HN best stories IDs fetched successfully');
          }
          return response;
        } catch (error) {
          logger.error('Failed to fetch HN best stories IDs', { error: error instanceof Error ? error.message : 'Unknown error' });
          throw new Error(`Failed to fetch HN best stories IDs: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      },
    }),
  };
}

export const {
  hackerNewsGetSearchItem,
  hackerNewsGetSearchUser,
  hackerNewsSearchItems,
  hackerNewsGetSearchTopStories,
  hackerNewsGetItem,
  hackerNewsGetTopStories,
  hackerNewsGetNewStories,
  hackerNewsGetBestStories,
} = createHackerNewsClient();
export const hackerNewsRuntimeContext: RuntimeContext<HackerNewsRuntimeContext> = new RuntimeContext<HackerNewsRuntimeContext>();
hackerNewsRuntimeContext.set('debug', false);
