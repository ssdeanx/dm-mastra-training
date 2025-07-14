import { pick, sanitizeSearchParams } from '@agentic/core';
import defaultKy, { type KyInstance } from 'ky';
import { z } from 'zod';
import { createTool } from "@mastra/core/tools";
import { PinoLogger } from '@mastra/loggers';
//import { RuntimeContext } from '@mastra/core/di'; // FIXME: Uncomment if needed

const logger = new PinoLogger({ name: 'reddit', level: 'info' });

export const BASE_URL = 'https://www.reddit.com';

export const PostSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  subreddit: z.string(),
  selftext: z.string().optional(),
  author: z.string(),
  author_fullname: z.string(),
  url: z.string(),
  permalink: z.string(),
  thumbnail: z.string().optional(),
  thumbnail_width: z.number().optional(),
  thumbnail_height: z.number().optional(),
  score: z.number(),
  ups: z.number(),
  downs: z.number(),
  num_comments: z.number(),
  created_utc: z.number(),
  is_self: z.boolean(),
  is_video: z.boolean(),
});
export type Post = z.infer<typeof PostSchema>;

export const ImageSchema = z.object({
  url: z.string(),
  width: z.number(),
  height: z.number(),
});
export type Image = z.infer<typeof ImageSchema>;

export const FullPostSchema = z.object({
  id: z.string(),
  name: z.string(),
  author: z.string(),
  title: z.string(),
  subreddit: z.string(),
  subreddit_name_prefixed: z.string(),
  score: z.number(),
  approved_at_utc: z.string().nullable(),
  selftext: z.string().optional(),
  author_fullname: z.string(),
  is_self: z.boolean(),
  saved: z.boolean(),
  url: z.string(),
  permalink: z.string(),
  mod_reason_title: z.string().nullable(),
  gilded: z.number(),
  clicked: z.boolean(),
  link_flair_richtext: z.array(z.any()),
  hidden: z.boolean(),
  pwls: z.number(),
  link_flair_css_class: z.string(),
  downs: z.number(),
  thumbnail_height: z.any(),
  top_awarded_type: z.any(),
  hide_score: z.boolean(),
  quarantine: z.boolean(),
  link_flair_text_color: z.string(),
  upvote_ratio: z.number(),
  author_flair_background_color: z.any(),
  subreddit_type: z.string(),
  ups: z.number(),
  total_awards_received: z.number(),
  media_embed: z.any().optional(),
  secure_media_embed: z.any().optional(),
  thumbnail_width: z.any(),
  author_flair_template_id: z.any(),
  is_original_content: z.boolean(),
  user_reports: z.array(z.any()),
  secure_media: z.any(),
  is_reddit_media_domain: z.boolean(),
  is_meta: z.boolean(),
  category: z.any(),
  link_flair_text: z.string(),
  can_mod_post: z.boolean(),
  approved_by: z.any(),
  is_created_from_ads_ui: z.boolean(),
  author_premium: z.boolean(),
  thumbnail: z.string().optional(),
  edited: z.boolean(),
  author_flair_css_class: z.any(),
  author_flair_richtext: z.array(z.any()),
  gildings: z.any().optional(),
  content_categories: z.any(),
  mod_note: z.any(),
  created: z.number(),
  link_flair_type: z.string(),
  wls: z.number(),
  removed_by_category: z.any(),
  banned_by: z.any(),
  author_flair_type: z.string(),
  domain: z.string(),
  allow_live_comments: z.boolean(),
  selftext_html: z.string(),
  likes: z.any(),
  suggested_sort: z.any(),
  banned_at_utc: z.any(),
  view_count: z.any(),
  archived: z.boolean(),
  no_follow: z.boolean(),
  is_crosspostable: z.boolean(),
  pinned: z.boolean(),
  over_18: z.boolean(),
  all_awardings: z.array(z.any()),
  awarders: z.array(z.any()),
  media_only: z.boolean(),
  link_flair_template_id: z.string(),
  can_gild: z.boolean(),
  spoiler: z.boolean(),
  locked: z.boolean(),
  author_flair_text: z.any(),
  treatment_tags: z.array(z.any()),
  visited: z.boolean(),
  removed_by: z.any(),
  num_reports: z.any(),
  distinguished: z.any(),
  subreddit_id: z.string(),
  author_is_blocked: z.boolean(),
  mod_reason_by: z.any(),
  removal_reason: z.any(),
  link_flair_background_color: z.string(),
  is_robot_indexable: z.boolean(),
  report_reasons: z.any(),
  discussion_type: z.any(),
  num_comments: z.number(),
  send_replies: z.boolean(),
  contest_mode: z.boolean(),
  mod_reports: z.array(z.any()),
  author_patreon_flair: z.boolean(),
  author_flair_text_color: z.any(),
  stickied: z.boolean(),
  subreddit_subscribers: z.number(),
  created_utc: z.number(),
  num_crossposts: z.number(),
  media: z.any().optional(),
  is_video: z.boolean(),
  preview: z.object({
    enabled: z.boolean(),
    images: z.array(z.object({
      id: z.string(),
      source: ImageSchema,
      resolutions: z.array(ImageSchema),
      variants: z.record(z.string(), z.object({
        id: z.string(),
        source: ImageSchema,
        resolutions: z.array(ImageSchema),
      })).optional(),
    })),
  }).optional(),
});
export type FullPost = z.infer<typeof FullPostSchema>;

export const PostT3Schema = z.object({
  kind: z.literal('t3'),
  data: FullPostSchema,
});
export type PostT3 = z.infer<typeof PostT3Schema>;

export const PostListingResponseSchema = z.object({
  kind: z.literal('Listing'),
  data: z.object({
    after: z.string(),
    dist: z.number(),
    modhash: z.string(),
    geo_filter: z.null().optional(),
    children: z.array(PostT3Schema),
  }),
  before: z.null().optional(),
});
export type PostListingResponse = z.infer<typeof PostListingResponseSchema>;

export const PostFilterSchema = z.union([
  z.literal('hot'),
  z.literal('top'),
  z.literal('new'),
  z.literal('rising'),
]);
export type PostFilter = z.infer<typeof PostFilterSchema>;

export const GeoFilterSchema = z.union([
  z.literal('GLOBAL'), z.literal('US'), z.literal('AR'), z.literal('AU'), z.literal('BG'), z.literal('CA'), z.literal('CL'), z.literal('CO'), z.literal('HR'), z.literal('CZ'), z.literal('FI'), z.literal('FR'), z.literal('DE'), z.literal('GR'), z.literal('HU'), z.literal('IS'), z.literal('IN'), z.literal('IE'), z.literal('IT'), z.literal('JP'), z.literal('MY'), z.literal('MX'), z.literal('NZ'), z.literal('PH'), z.literal('PL'), z.literal('PT'), z.literal('PR'), z.literal('RO'), z.literal('RS'), z.literal('SG'), z.literal('ES'), z.literal('SE'), z.literal('TW'), z.literal('TH'), z.literal('TR'), z.literal('GB'), z.literal('US_WA'), z.literal('US_DE'), z.literal('US_DC'), z.literal('US_WI'), z.literal('US_WV'), z.literal('US_HI'), z.literal('US_FL'), z.literal('US_WY'), z.literal('US_NH'), z.literal('US_NJ'), z.literal('US_NM'), z.literal('US_TX'), z.literal('US_LA'), z.literal('US_NC'), z.literal('US_ND'), z.literal('US_NE'), z.literal('US_TN'), z.literal('US_NY'), z.literal('US_PA'), z.literal('US_CA'), z.literal('US_NV'), z.literal('US_VA'), z.literal('US_CO'), z.literal('US_AK'), z.literal('US_AL'), z.literal('US_AR'), z.literal('US_VT'), z.literal('US_IL'), z.literal('US_GA'), z.literal('US_IN'), z.literal('US_IA'), z.literal('US_OK'), z.literal('US_AZ'), z.literal('US_ID'), z.literal('US_CT'), z.literal('US_ME'), z.literal('US_MD'), z.literal('US_MA'), z.literal('US_OH'), z.literal('US_UT'), z.literal('US_MO'), z.literal('US_MN'), z.literal('US_MI'), z.literal('US_RI'), z.literal('US_KS'), z.literal('US_MT'), z.literal('US_MS'), z.literal('US_SC'), z.literal('US_KY'), z.literal('US_OR'), z.literal('US_SD')
]);
export type GeoFilter = z.infer<typeof GeoFilterSchema>;

export const TimePeriodSchema = z.union([
  z.literal('hour'), z.literal('day'), z.literal('week'), z.literal('month'), z.literal('year'), z.literal('all')
]);
export type TimePeriod = z.infer<typeof TimePeriodSchema>;

export const GetSubredditPostsOptionsSchema = z.object({
  subreddit: z.string(),
  type: PostFilterSchema.optional(),
  limit: z.number().int().max(100).optional(),
  count: z.number().int().optional(),
  before: z.string().optional(),
  after: z.string().optional(),
  geo: GeoFilterSchema.optional(),
  time: TimePeriodSchema.optional(),
});
export type GetSubredditPostsOptions = z.infer<typeof GetSubredditPostsOptionsSchema>;

export const PostListingResultSchema = z.object({
  subreddit: z.string(),
  type: PostFilterSchema,
  geo: GeoFilterSchema.optional(),
  time: TimePeriodSchema.optional(),
  posts: z.array(PostSchema),
});
export type PostListingResult = z.infer<typeof PostListingResultSchema>;

/**
 * Basic readonly Reddit API for fetching top/hot/new/rising posts from subreddits.
 *
 * Uses Reddit's legacy JSON API aimed at RSS feeds.
 *
 * @see https://old.reddit.com/dev/api
 */
export class RedditClient {
  protected readonly ky: KyInstance;
  protected readonly baseUrl: string;

  constructor({
    baseUrl = BASE_URL,
    userAgent = 'agentic-reddit-client/1.0.0',
    timeoutMs = 60_000,
    ky = defaultKy
  }: {
    baseUrl?: string;
    userAgent?: string;
    timeoutMs?: number;
    ky?: KyInstance;
  } = {}) {
    this.baseUrl = baseUrl;

    this.ky = ky.extend({
      prefixUrl: this.baseUrl,
      timeout: timeoutMs,
      headers: {
        'User-Agent': userAgent
      }
    });
  }

  async getSubredditPosts(
    subredditOrOpts: string | GetSubredditPostsOptions
  ): Promise<PostListingResult> {
    const params =
      typeof subredditOrOpts === 'string'
        ? { subreddit: subredditOrOpts }
        : subredditOrOpts;
    const { subreddit, type = 'hot', limit = 5, geo, time, ...opts } = params;

    const res = await this.ky
      .get(`r/${subreddit}/${type}.json`, {
        searchParams: sanitizeSearchParams({
          ...opts,
          limit,
          g: type === 'hot' ? geo : undefined,
          t: type === 'top' ? time : undefined
        })
      })
      .json<PostListingResponse>();

    return {
      subreddit,
      type,
      geo: type === 'hot' ? geo : undefined,
      time: type === 'top' ? time : undefined,
      posts: res.data.children.map((child) => {
        const post = child.data;

        return {
          ...pick(
            post,
            'id',
            'name',
            'title',
            'subreddit',
            'selftext',
            'author',
            'author_fullname',
            'url',
            'permalink',
            'thumbnail',
            'thumbnail_width',
            'thumbnail_height',
            'score',
            'ups',
            'downs',
            'num_comments',
            'created_utc',
            'is_self',
            'is_video'
          ),
          permalink: `${this.baseUrl}${post.permalink}`,
          thumbnail:
            post.thumbnail !== 'self' &&
            post.thumbnail !== 'default' &&
            post.thumbnail !== 'spoiler' &&
            post.thumbnail !== 'nsfw'
              ? post.thumbnail
              : undefined,
        };
      }),
    };
  }
}

export function createRedditClient(options?: {
  baseUrl?: string;
  userAgent?: string;
  timeoutMs?: number;
  ky?: KyInstance;
}) {
  const redditClient = new RedditClient(options);
  
  return {
    redditGetSubredditPosts: createTool({
      id: "reddit-get-subreddit-posts",
      description: "Fetches posts from a subreddit.",
      inputSchema: GetSubredditPostsOptionsSchema,
      outputSchema: PostListingResultSchema,
      execute: async ({ context }: { context: GetSubredditPostsOptions }) => {
        logger.info('Fetching subreddit posts', { subreddit: context.subreddit, type: context.type });
        try {
          const response = await redditClient.getSubredditPosts(context);
          logger.info('Subreddit posts fetched successfully', { subreddit: context.subreddit, type: context.type });
          return response;
        } catch (error) {
          logger.error('Failed to fetch subreddit posts', { subreddit: context.subreddit, type: context.type, error: error instanceof Error ? error.message : 'Unknown error' });
          throw new Error(`Failed to fetch subreddit posts: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      },
    }),
  };
}

export const { redditGetSubredditPosts } = createRedditClient();
