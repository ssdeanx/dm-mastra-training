import { pruneEmpty, sanitizeSearchParams } from '@agentic/core';
import { XMLParser } from 'fast-xml-parser';
import defaultKy, { type KyInstance } from 'ky';
import { z } from 'zod';
import { createTool } from "@mastra/core/tools";
import { PinoLogger } from '@mastra/loggers';

const logger = new PinoLogger({ name: 'arxiv', level: 'info' });

// Local utility functions (since they are not exported from @agentic/core)
function castArray<T>(value: T | T[]): T[] {
  if (Array.isArray(value)) {
    return value;
  }
  return [value];
}

function getProp<T>(obj: Record<string, unknown>, path: string[], defaultValue: T): T {
  let current: unknown = obj;
  for (const key of path) {
    if (current === null || typeof current !== 'object' || !(key in (current as Record<string, unknown>))) {
      return defaultValue;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current as T;
}

function isAuthorObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const ARXIV_API_BASE_URL = 'https://export.arxiv.org/api';

export const ArxivSortType = {
  RELEVANCE: 'relevance',
  LAST_UPDATED_DATE: 'lastUpdatedDate',
  SUBMITTED_DATE: 'submittedDate'
} as const;

export const ArxivSortOrder = {
  ASCENDING: 'ascending',
  DESCENDING: 'descending'
} as const;

export const ArxivFilterType = {
  ALL: 'all',
  TITLE: 'title',
  AUTHOR: 'author',
  ABSTRACT: 'abstract',
  COMMENT: 'comment',
  JOURNAL_REFERENCE: 'journal_reference',
  SUBJECT_CATEGORY: 'subject_category',
  REPORT_NUMBER: 'report_number'
} as const;

export type ValueOf<T extends NonNullable<unknown>> = T[keyof T];

export const ArxivFilterTypeMapping: Record<ValueOf<typeof ArxivFilterType>, string> = {
  all: 'all',
  title: 'ti',
  author: 'au',
  abstract: 'abs',
  comment: 'co',
  journal_reference: 'jr',
  subject_category: 'cat',
  report_number: 'rn'
};

export const ArxivSeparators = {
  AND: '+AND+',
  OR: '+OR+',
  ANDNOT: '+ANDNOT+'
} as const;

export const ArxivAuthorSchema = z.object({
  name: z.string(),
  affiliation: z.array(z.string()).optional(),
});

export const ArxivEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  published: z.string(),
  updated: z.string(),
  authors: z.array(ArxivAuthorSchema),
  doi: z.string().optional(),
  comment: z.string().optional(),
  journalReference: z.string().optional(),
  primaryCategory: z.string(),
  categories: z.array(z.string()),
  links: z.array(z.string()),
});

export const ArxivResponseSchema = z.object({
  totalResults: z.number(),
  startIndex: z.number(),
  itemsPerPage: z.number(),
  entries: z.array(ArxivEntrySchema),
});

export type ArxivResponse = z.infer<typeof ArxivResponseSchema>;

export const extractArxivId = (value: string) =>
  value
    .replace('https://arxiv.org/abs/', '')
    .replace('https://arxiv.org/pdf/', '')
    .replace(/v\d$/, '');

export const ArxivSearchParamsEntrySchema = z.object({
  field: z.nativeEnum(ArxivFilterType).default(ArxivFilterType.ALL),
  value: z.string().min(1)
});

export const ArxivSearchParamsSchema = z
  .object({
    ids: z.array(z.string().min(1)).optional(),
    searchQuery: z
      .union([
        z.string(),
        z.object({
          include: z
            .array(ArxivSearchParamsEntrySchema)
            .nonempty()
            .describe('Filters to include results.'),
          exclude: z
            .array(ArxivSearchParamsEntrySchema)
            .optional()
            .describe('Filters to exclude results.')
        })
      ])
      .optional(),
    start: z.number().int().min(0).default(0),
    maxResults: z.number().int().min(1).max(100).default(5)
  })
  .describe('Sorting by date is not supported.');

export type ArxivSearchParams = z.infer<typeof ArxivSearchParamsSchema>;

/**
 * Runtime context type for Arxiv tools configuration
 */
export type ArxivRuntimeContext = {
  'user-id'?: string;
  'session-id'?: string;
  'max-results'?: number;
  'debug'?: boolean;
};

/**
 * Lightweight wrapper around ArXiv for academic / scholarly research articles.
 *
 * @see https://arxiv.org
 */
export class ArXivClient {
  protected readonly ky: KyInstance;
  protected readonly apiBaseUrl: string;

  constructor({
    apiBaseUrl = ARXIV_API_BASE_URL,
    ky = defaultKy
  }: {
    apiBaseUrl?: string;
    ky?: KyInstance;
  } = {}) {
    this.apiBaseUrl = apiBaseUrl;

    this.ky = ky.extend({
      prefixUrl: this.apiBaseUrl
    });
  }

  async search(queryOrOpts: string | ArxivSearchParams): Promise<ArxivResponse> {
    const opts =
      typeof queryOrOpts === 'string'
        ? ({ searchQuery: queryOrOpts } as ArxivSearchParams)
        : queryOrOpts;

    if (!opts.ids?.length && !opts.searchQuery) {
      throw new Error(
        `The 'searchQuery' property must be non-empty if the 'ids' property is not provided.`
      );
    }

    const searchParams = sanitizeSearchParams({
      start: opts.start,
      max_results: opts.maxResults,
      id_list: opts.ids?.map(extractArxivId),
      search_query: opts.searchQuery
        ? typeof opts.searchQuery === 'string'
          ? opts.searchQuery
          : [
              opts.searchQuery.include
                .map(
                  (tag) => `${ArxivFilterTypeMapping[tag.field]}:${tag.value}`
                )
                .join(ArxivSeparators.AND),
              (opts.searchQuery.exclude ?? [])
                .map(
                  (tag) => `${ArxivFilterTypeMapping[tag.field]}:${tag.value}`
                )
                .join(ArxivSeparators.ANDNOT)
            ]
              .filter(Boolean)
              .join(ArxivSeparators.ANDNOT)
        : undefined,
      sortBy: ArxivSortType.RELEVANCE,
      sortOrder: ArxivSortOrder.DESCENDING
    });

    const responseText = await this.ky.get('query', { searchParams }).text();

    const parser = new XMLParser({
      allowBooleanAttributes: true,
      alwaysCreateTextNode: false,
      attributeNamePrefix: '@_',
      attributesGroupName: false,
      cdataPropName: '#cdata',
      ignoreAttributes: true,
      numberParseOptions: { hex: false, leadingZeros: true },
      parseAttributeValue: false,
      parseTagValue: true,
      preserveOrder: false,
      removeNSPrefix: true,
      textNodeName: '#text',
      trimValues: true,
      ignoreDeclaration: true
    });

    const parsedData = parser.parse(responseText);

    let entries: Record<string, unknown>[] = getProp(
      parsedData,
      ['feed', 'entry'],
      []
    );
    entries = castArray(entries);

    const result = {
      totalResults: Math.max(
        getProp(parsedData, ['feed', 'totalResults'], 0) as number,
        entries.length
      ),
      startIndex: getProp(parsedData, ['feed', 'startIndex'], 0) as number,
      itemsPerPage: getProp(parsedData, ['feed', 'itemsPerPage'], 0) as number,
      entries: entries.map((entry: Record<string, unknown>) =>
        pruneEmpty({
          id: extractArxivId(entry.id as string),
          url: entry.id as string,
          title: entry.title as string,
          summary: entry.summary as string,
          published: entry.published as string,
          updated: entry.updated as string,
          authors: castArray(entry.author)
            .filter(Boolean)
            .filter(isAuthorObject)
            .map((author: Record<string, unknown>) => ({
              name: author.name as string,
              affiliation: castArray(author.affiliation ?? []) as string[]
            })),
          doi: entry.doi as string,
          comment: entry.comment as string,
          journalReference: entry.journal_ref as string,
          primaryCategory: entry.primary_category as string,
          categories: castArray(entry.category).filter(Boolean) as string[],
          links: castArray(entry.link).filter(Boolean) as string[]
        })
      )
    };
    return ArxivResponseSchema.parse(result);
  }
}

export function createArxivClient(options?: {
  apiBaseUrl?: string;
  ky?: KyInstance;
}) {
  const arxivClient = new ArXivClient(options);

  return {
    arxivSearch: createTool({
      id: "arxiv-search",
      description: "Searches for research articles published on arXiv.",
      inputSchema: ArxivSearchParamsSchema,
      outputSchema: ArxivResponseSchema,
      execute: async ({ context, runtimeContext }) => {
        // Ensure maxResults is a number, defaulting to 5 if not provided or invalid
        const effectiveMaxResults = (runtimeContext?.get('max-results') as number | undefined) ?? (typeof context.maxResults === 'number' ? context.maxResults : 5);
        const debug = (runtimeContext?.get('debug') as boolean | undefined) ?? false;

        if (debug) {
          logger.info('Searching arXiv', { query: context.searchQuery || context.ids, maxResults: effectiveMaxResults });
        }
        
        try {
          const response = await arxivClient.search({ ...context, maxResults: effectiveMaxResults });
          if (debug) {
            logger.info('arXiv search completed successfully', { query: context.searchQuery || context.ids, totalResults: response.totalResults });
          }
          return response;
        } catch (error) {
          logger.error('arXiv search failed', { query: context.searchQuery || context.ids, error: error instanceof Error ? error.message : 'Unknown error' });
          throw new Error(`arXiv search failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      },
    }),
  };
}

export const { arxivSearch } = createArxivClient();

/**
 * Runtime context instance for Arxiv tools with defaults
 */
import { RuntimeContext } from '@mastra/core/di';
export const arxivRuntimeContext = new RuntimeContext<ArxivRuntimeContext>();
arxivRuntimeContext.set('user-id', 'anonymous');
arxivRuntimeContext.set('session-id', 'default');
arxivRuntimeContext.set('max-results', 5);
arxivRuntimeContext.set('debug', false);
