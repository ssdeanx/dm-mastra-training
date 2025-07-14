import type * as wikibase from 'wikibase-sdk'
import { assert, getEnv, throttleKy } from '@agentic/core'
import defaultKy, { type KyInstance } from 'ky'
import pThrottle from 'p-throttle'
import wdk from 'wikibase-sdk/wikidata.org'
import { z } from 'zod'
import { createTool } from "@mastra/core/tools";
import { PinoLogger } from '@mastra/loggers';

const logger = new PinoLogger({ name: 'wikidata', level: 'info' });

// Allow up to 200 requests per second by default.
export const wikidataThrottle = pThrottle({
  limit: 200,
  interval: 1000
})

export type SimplifiedEntityMap = Record<string, SimplifiedEntity>

export interface SimplifiedEntity {
  id: string
  type: string
  claims: Claims
  modified: string
  labels?: Descriptions
  descriptions?: Descriptions
  aliases?: Record<string, string[]>
  sitelinks?: Sitelinks
}

export interface Claims {
  [key: string]: Claim[]
}

export interface Claim {
  value: string
  qualifiers: Record<string, string[] | number[]>
  references: Record<string, string[]>[]
}

export type Descriptions = Record<string, string>
export type Sitelinks = Record<string, string>

/**
 * Interface for raw Wikidata API response
 */
interface WikidataApiResponse {
  entities: wikibase.Entities
}

/**
 * Output schemas for Wikidata API responses
 */
const WikidataClaimSchema = z.object({
  value: z.string(),
  qualifiers: z.record(z.string(), z.union([z.array(z.string()), z.array(z.number())])),
  references: z.array(z.record(z.string(), z.array(z.string())))
});

const WikidataEntitySchema = z.object({
  id: z.string(),
  type: z.string(),
  claims: z.record(z.string(), z.array(WikidataClaimSchema)),
  modified: z.string(),
  labels: z.record(z.string(), z.any()).optional(),
  descriptions: z.record(z.string(), z.any()).optional(),
  aliases: z.any().optional(),
  sitelinks: z.record(z.string(), z.any()).optional()
});

const WikidataEntityMapSchema = z.record(z.string(), WikidataEntitySchema);

/**
 * Basic Wikidata client.
 *
 * @see https://github.com/maxlath/wikibase-sdk
 *
 * TODO: support any wikibase instance
 */
export class WikidataClient {
  protected readonly ky: KyInstance
  protected readonly apiUserAgent: string

  constructor({
    apiUserAgent = getEnv('WIKIDATA_API_USER_AGENT') ??
      'Agentic (https://github.com/transitive-bullshit/agentic)',
    throttle = true,
    ky = defaultKy
  }: {
    apiBaseUrl?: string
    apiUserAgent?: string
    throttle?: boolean
    ky?: KyInstance
  } = {}) {
    assert(apiUserAgent, 'WikidataClient missing required "apiUserAgent"')

    this.apiUserAgent = apiUserAgent

    const throttledKy = throttle ? (throttleKy(ky, wikidataThrottle) as typeof ky) : ky

    this.ky = throttledKy.extend({
      headers: {
        'user-agent': apiUserAgent
      }
    })
  }

  async getEntityById(
    idOrOpts: string | { id: string; languages?: string[] }
  ): Promise<SimplifiedEntity> {
    const { id, languages = ['en'] } =
      typeof idOrOpts === 'string' ? { id: idOrOpts } : idOrOpts

    const url = wdk.getEntities({
      ids: id as wikibase.EntityId,
      languages
    })

    const res = await this.ky.get(url).json<WikidataApiResponse>()
    const entities = wdk.simplify.entities(res.entities, {
      // TODO: Make this configurable and double-check defaults.
      keepQualifiers: true,
      keepReferences: true
    })

    const entity = entities[id]
    return entity as SimplifiedEntity
  }

  async getEntitiesByIds(
    idsOrOpts: string[] | { ids: string; languages?: string[] }
  ): Promise<SimplifiedEntityMap> {
    const { ids, languages = ['en'] } = Array.isArray(idsOrOpts)
      ? { ids: idsOrOpts }
      : idsOrOpts

    // TODO: Separate between wdk.getEntities and wdk.getManyEntities depending
    // on how many `ids` there are.
    const url = wdk.getEntities({
      ids: ids as wikibase.EntityId[],
      languages
    })

    const res = await this.ky.get(url).json<WikidataApiResponse>()
    const entities = wdk.simplify.entities(res.entities, {
      keepQualifiers: true,
      keepReferences: true
    })

    return entities as SimplifiedEntityMap
  }
}

export function createWikidataClientTools(config: {
  apiBaseUrl?: string;
  apiUserAgent?: string;
  throttle?: boolean;
  ky?: KyInstance;
} = {}) {
  const wikidataClient = new WikidataClient(config);

  return {
    wikidataGetEntityById: createTool({
      id: "wikidata-get-entity-by-id",
      description: "Gets a Wikidata entity by ID.",
      inputSchema: z.object({
        id: z.string().describe('The ID of the Wikidata entity.'),
        languages: z.array(z.string()).optional().describe('Optional array of language codes (e.g., "en", "fr") to retrieve labels and descriptions in.')
      }),
      outputSchema: WikidataEntitySchema,
      execute: async ({ context }) => {
        logger.info('Getting Wikidata entity by ID', { id: context.id });
        try {
          const response = await wikidataClient.getEntityById(context.id);
          logger.info('Wikidata entity retrieved successfully', { id: context.id });
          return response;
        } catch (error) {
          logger.error('Wikidata entity retrieval failed', { id: context.id, error: error instanceof Error ? error.message : 'Unknown error' });
          throw new Error(`Wikidata entity retrieval failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      },
    }),
    wikidataGetEntitiesByIds: createTool({
      id: "wikidata-get-entities-by-ids",
      description: "Gets multiple Wikidata entities by their IDs.",
      inputSchema: z.object({
        ids: z.array(z.string()).describe('An array of Wikidata entity IDs.'),
        languages: z.array(z.string()).optional().describe('Optional array of language codes (e.g., "en", "fr") to retrieve labels and descriptions in.')
      }),
      outputSchema: WikidataEntityMapSchema,
      execute: async ({ context }) => {
        logger.info('Getting Wikidata entities by IDs', { ids: context.ids });
        try {
          const response = await wikidataClient.getEntitiesByIds(context.ids);
          logger.info('Wikidata entities retrieved successfully', { ids: context.ids });
          return response;
        } catch (error) {
          logger.error('Wikidata entities retrieval failed', { ids: context.ids, error: error instanceof Error ? error.message : 'Unknown error' });
          throw new Error(`Wikidata entities retrieval failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      },
    }),
  };
}

export const wikidataTools = createWikidataClientTools();
