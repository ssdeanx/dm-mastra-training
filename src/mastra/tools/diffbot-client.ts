import { assert, getEnv, sanitizeSearchParams, throttleKy } from '@agentic/core'
import defaultKy, { type KyInstance } from 'ky'
import pThrottle from 'p-throttle'
import { z } from 'zod'
import { createTool } from "@mastra/core/tools";
import { PinoLogger } from '@mastra/loggers';
import { RuntimeContext } from '@mastra/core/di';

const logger = new PinoLogger({ name: 'diffbot', level: 'info' });

export const API_BASE_URL = 'https://api.diffbot.com'
export const KNOWLEDGE_GRAPH_API_BASE_URL = 'https://kg.diffbot.com'

export const throttle = pThrottle({
  limit: 5,
  interval: 1000,
  strict: true
})

export interface ClassificationItem {
  code: string
  name: string
  level?: number
}

export interface EmployeeCategory {
  name: string
  count?: number
  percentage?: number
}

export type Gender = 'male' | 'female' | 'other' | 'unknown'

export interface DiffbotImage {
  url: string
  title?: string
  height?: number
  width?: number
  naturalHeight?: number
  naturalWidth?: number
  primary?: boolean
  meta?: DiffbotObjectMeta
}

export interface BasicEntity {
  id: string
  name: string
  diffbotUri?: string
  type?: string
}

export interface Employment {
  title: string
  employer: BasicEntity
  isCurrent?: boolean
  startDate?: DateTime
  endDate?: DateTime
  location?: Location
}

export interface Location {
  name: string
  latitude?: number
  longitude?: number
  country?: string
  region?: string
  city?: string
}

export interface NameDetail {
  firstName?: string
  lastName?: string
  middleName?: string
  fullName?: string
}

export interface DateTime {
  str: string
  precision?: number
  timestamp?: number
}

export interface Education {
  institution: BasicEntity
  degree?: string
  major?: string
  startDate?: DateTime
  endDate?: DateTime
  isCurrent?: boolean
}

export interface Nationality {
  name: string
  country?: string
}

export interface Union {
  name: string
  startDate?: DateTime
  endDate?: DateTime
}

export interface Language {
  name: string
  proficiency?: string
}

export interface Award {
  name: string
  date?: DateTime
  description?: string
}

export interface Amount {
  value: number
  currency: string
  str?: string
}

export interface Interest {
  name: string
  score?: number
}

export interface EmailAddress {
  address: string
  type?: string
}

export interface Investment {
  company: BasicEntity
  amount?: Amount
  date?: DateTime
  round?: string
}

export interface Category {
  name: string
  score?: number
}

export interface Technographic {
  name: string
  category?: string
  vendor?: string
}

export interface Stock {
  symbol: string
  exchange?: string
  price?: number
  marketCap?: Amount
}

export interface AnnualRevenue {
  year: number
  amount: Amount
}

export interface DiffbotError {
  message: string
  code?: string
  type?: string
}

export interface DiffbotObjectMeta {
  [key: string]: string | number | boolean | null
}

export interface ExtractOptions {
  url: string
  fields?: string[]
  paging?: boolean
  discussion?: boolean
  timeout?: number
  proxy?: string
  proxyAuth?: string
  customJs?: string
  customHeaders?: Record<string, string>
}

export interface ExtractAnalyzeOptions extends ExtractOptions {
  mode?: 'article' | 'product' | 'image' | 'video'
}

export interface ExtractArticleOptions extends ExtractOptions {
  maxPages?: number
}

export interface ExtractResponse {
  objects: Array<{
    type: string
    pageUrl: string
    humanLanguage?: string
    title?: string
    text?: string
    html?: string
    url?: string
    diffbotUri?: string
    date?: string
    estimatedDate?: string
    author?: string
    authorUrl?: string
    discussion?: {
      confidence: number
      pageUrl: string
    }
    sentiment?: number
    tags?: Array<{
      id: number
      count: number
      prevalence: number
      label: string
      uri: string
      type: string
    }>
    images?: DiffbotImage[]
    videos?: Array<{
      primary: boolean
      url: string
    }>
    breadcrumb?: Array<{
      link: string
      name: string
    }>
    links?: string[]
    meta?: DiffbotObjectMeta
  }>
  request: DiffbotRequest
  errorCode?: number
  error?: string
}

export interface ExtractAnalyzeResponse extends ExtractResponse {
  stats?: {
    confidenceScore: number
  }
}

export interface ExtractArticleResponse extends ExtractResponse {
  nextPages?: string[]
}

export interface DiffbotRequest {
  pageUrl: string
  api: string
  version: number
}

export interface KnowledgeGraphSearchOptions {
  type?: 'query' | 'text' | 'queryTextFallback' | 'crawl'
  query: string
  col?: string
  from?: number
  size?: number
  filter?: string
  jsonmode?: 'extended' | 'id'
  nonCanonicalFacts?: boolean
  noDedupArticles?: boolean
  cluster?: 'all' | 'best' | 'dedupe'
  report?: boolean
}

export interface KnowledgeGraphEnhanceOptions {
  type: EntityType
  id?: string
  name?: string
  url?: string
  phone?: string
  email?: string
  employer?: string
  title?: string
  school?: string
  location?: string
  ip?: string
  customId?: string
  size?: number
  threshold?: number
  refresh?: boolean
  search?: boolean
  useCache?: boolean
  filter?: string
  jsonmode?: 'extended' | 'id'
  nonCanonicalFacts?: boolean
}

export interface KnowledgeGraphResponse {
  data: KnowledgeGraphNode[]
  version: number
  hits: number
  results: number
  kgversion: string
  diffbot_type: string
  facet?: boolean
  errors?: DiffbotError[]
}

export interface KnowledgeGraphNode {
  score: number
  esscore?: number
  entity: KnowledgeGraphEntity
  entity_ctx: Record<string, unknown>
  errors: string[]
  callbackQuery: string
  upperBound: number
  lowerBound: number
  count: number
  value: string
  uri: string
}

export interface KnowledgeGraphEntity {
  id: string
  diffbotUri: string
  type?: string
  name: string
  images: DiffbotImage[]
  origins: string[]
  nbOrigins?: number
  gender?: Gender
  githubUri?: string
  importance?: number
  description?: string
  homepageUri?: string
  allNames?: string[]
  skills?: Partial<BasicEntity>[]
  crawlTimestamp?: number
  summary?: string
  image?: string
  types?: string[]
  nbIncomingEdges?: number
  allUris?: string[]
  employments?: Employment[]
  locations?: Location[]
  location?: Location
  allOriginHashes?: string[]
  nameDetail?: NameDetail
}

export type EntityType = 'Organization' | 'Person' | 'Place'

export type EnhanceEntityType = 'Organization' | 'Person';

export const EnhanceEntityOptionsSchema = z.object({
  type: z.enum(['Person', 'Organization']),
  id: z
    .string()
    .optional()
    .describe('Diffbot ID of the entity to enhance if known'),
  name: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe('Name of the entity'),
  url: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe('Origin or homepage URL of the entity'),
  phone: z.string().optional().describe('Phone number of the entity'),
  email: z.string().optional().describe('Email of the entity'),
  employer: z
    .string()
    .optional()
    .describe("Name of the entity's employer (for Person entities)"),
  title: z
    .string()
    .optional()
    .describe('Title of the entity (for Person entities)'),
  school: z
    .string()
    .optional()
    .describe('School of the entity (for Person entities)'),
  location: z.string().optional().describe('Location of the entity'),
  ip: z.string().optional().describe('IP address of the entity'),
  customId: z.string().optional().describe('User-defined ID for correlation'),
  threshold: z.number().optional().describe('Similarity threshold'),
  refresh: z
    .boolean()
    .optional()
    .describe(
      'If set, will attempt to refresh the entity data by recrawling the source URLs.'
    ),
  search: z
    .boolean()
    .optional()
    .describe(
      'If set, will attempt to search the web for the entity and merge the results into its knowledge base.'
    ),
  size: z
    .number()
    .int()
    .max(100)
    .optional()
    .describe('Number of results to return')
})
export type EnhanceEntityOptions = z.infer<typeof EnhanceEntityOptionsSchema>

export type EnhanceEntityInputForAiFunction = z.infer<
  ReturnType<typeof EnhanceEntityOptionsSchema.omit>
>;

export interface EnhanceEntityResponse {
  version: number
  hits: number
  kgversion: string
  request_ctx: RequestCtx
  data: EnhanceEntityResult[]
  errors: DiffbotError[]
}

export interface RequestCtx {
  query: Query
  query_ctx: QueryCtx
}

export interface Query {
  type: string
  name: string[]
}

export interface QueryCtx {
  search: string
}

export interface EnhanceEntityResult {
  score: number
  esscore: number
  entity: Entity
  errors: DiffbotError[]
}

export interface Entity {
  name: string
  type: EnhanceEntityType // Fix: restrict to only "Organization" | "Person"
  id: string
  summary?: string
  description?: string
  homepageUri?: string
  twitterUri?: string
  linkedInUri?: string
  githubUri?: string
  crunchbaseUri?: string
  googlePlusUri?: string
  facebookUri?: string
  angellistUri?: string
  wikipediaUri?: string
  diffbotUri?: string
  origin?: string
  origins?: string[]
  allUris?: string[]
  nbOrigins?: number
  nbIncomingEdges?: number
  nbFollowers?: number
  nbLocations?: number
  nbEmployees?: number
  nbEmployeesMin?: number
  nbEmployeesMax?: number
  nbActiveEmployeeEdges?: number
  nbUniqueInvestors?: number
  educations?: Education[]
  nationalities?: Nationality[]
  fullName?: string
  allNames?: string[]
  skills?: Partial<BasicEntity>[]
  children?: BasicEntity[]
  height?: number
  image?: string
  images?: DiffbotImage[]
  allOriginHashes?: string[]
  nameDetail?: NameDetail
  parents?: BasicEntity[]
  gender?: Gender
  importance?: number
  monthlyTraffic?: number
  monthlyTrafficGrowth?: number
  wikipediaPageviews?: number
  wikipediaPageviewsLastQuarterGrowth?: number
  wikipediaPageviewsLastYear?: number
  wikipediaPageviewsLastYearGrowth?: number
  wikipediaPageviewsLastQuarter?: number
  wikipediaPageviewsGrowth?: number
  birthPlace?: Location
  types?: string[]
  unions?: Union[]
  languages?: Language[]
  employments?: Employment[]
  birthDate?: DateTime
  religion?: Partial<BasicEntity>
  awards?: Award[]
  netWorth?: Amount
  allDescriptions?: string[]
  locations?: Location[]
  location?: Location
  interests?: Interest[]
  suppliers?: BasicEntity[]
  subsidiaries?: BasicEntity[]
  ipo?: {
    date: DateTime
    stockExchange: string
  }
  motto?: string
  logo?: string
  foundingDate?: DateTime
  totalInvestment?: Amount
  naicsClassification2017?: ClassificationItem[]
  naicsClassification?: ClassificationItem[]
  sicClassification?: ClassificationItem[]
  naceClassification?: ClassificationItem[]
  iSicClassification?: ClassificationItem[]
  employeeCategories?: EmployeeCategory[]
  emailAddresses?: EmailAddress[]
  age?: number
  isPublic?: boolean
  isAcquired?: boolean
  isDissolved?: boolean
  isNonProfit?: boolean
  crawlTimestamp?: number
  founders?: BasicEntity[]
  boardMembers?: BasicEntity[]
  ceo?: BasicEntity
  investments?: Investment[]
  acquiredBy?: BasicEntity[]
  diffbotClassification?: ClassificationItem[]
  blogUri?: string
  descriptors?: string[]
  industries?: string[]
  partnerships?: BasicEntity[]
  categories?: Category[]
  customers?: BasicEntity[]
  technographics?: Technographic[]
  stock?: Stock
  companiesHouseIds?: string[]
  yearlyRevenues?: AnnualRevenue[]
  revenue?: Amount
  parentCompany?: BasicEntity
  legalEntities?: BasicEntity[]
}

const DiffbotImageSchema = z.object({
  url: z.string(),
  title: z.string().optional(),
  height: z.number().optional(),
  width: z.number().optional(),
  naturalHeight: z.number().optional(),
  naturalWidth: z.number().optional(),
  primary: z.boolean().optional(),
  meta: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional()
});

const DiffbotRequestSchema = z.object({
  pageUrl: z.string(),
  api: z.string(),
  version: z.number()
});

const ExtractResponseSchema = z.object({
  objects: z.array(z.object({
    type: z.string(),
    pageUrl: z.string(),
    humanLanguage: z.string().optional(),
    title: z.string().optional(),
    text: z.string().optional(),
    html: z.string().optional(),
    url: z.string().optional(),
    diffbotUri: z.string().optional(),
    date: z.string().optional(),
    estimatedDate: z.string().optional(),
    author: z.string().optional(),
    authorUrl: z.string().optional(),
    discussion: z.object({
      confidence: z.number(),
      pageUrl: z.string()
    }).optional(),
    sentiment: z.number().optional(),
    tags: z.array(z.object({
      id: z.number(),
      count: z.number(),
      prevalence: z.number(),
      label: z.string(),
      uri: z.string(),
      type: z.string()
    })).optional(),
    images: z.array(DiffbotImageSchema).optional(),
    videos: z.array(z.object({
      primary: z.boolean(),
      url: z.string()
    })).optional(),
    breadcrumb: z.array(z.object({
      link: z.string(),
      name: z.string()
    })).optional(),
    links: z.array(z.string()).optional(),
    meta: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional()
  })),
  request: DiffbotRequestSchema,
  errorCode: z.number().optional(),
  error: z.string().optional()
});

const ExtractAnalyzeResponseSchema = ExtractResponseSchema.extend({
  stats: z.object({
    confidenceScore: z.number()
  }).optional()
});

const ExtractArticleResponseSchema = ExtractResponseSchema.extend({
  nextPages: z.array(z.string()).optional()
});

const BasicEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  diffbotUri: z.string().optional(),
  type: z.string().optional()
});

const LocationSchema = z.object({
  name: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  country: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional()
});

const DateTimeSchema = z.object({
  str: z.string(),
  precision: z.number().optional(),
  timestamp: z.number().optional()
});

const AmountSchema = z.object({
  value: z.number(),
  currency: z.string(),
  str: z.string().optional()
});

const EmploymentSchema = z.object({
  title: z.string(),
  employer: BasicEntitySchema,
  isCurrent: z.boolean().optional(),
  startDate: DateTimeSchema.optional(),
  endDate: DateTimeSchema.optional(),
  location: LocationSchema.optional()
});

const EducationSchema = z.object({
  institution: BasicEntitySchema,
  degree: z.string().optional(),
  major: z.string().optional(),
  startDate: DateTimeSchema.optional(),
  endDate: DateTimeSchema.optional(),
  isCurrent: z.boolean().optional()
});

const NameDetailSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  middleName: z.string().optional(),
  fullName: z.string().optional()
});

const NationalitySchema = z.object({
  name: z.string(),
  country: z.string().optional()
});

const EntitySchema = z.object({
  name: z.string(),
  type: z.enum(['Organization', 'Person']), // Fix: restrict to only "Organization" | "Person"
  id: z.string(),
  summary: z.string().optional(),
  description: z.string().optional(),
  homepageUri: z.string().optional(),
  twitterUri: z.string().optional(),
  linkedInUri: z.string().optional(),
  githubUri: z.string().optional(),
  crunchbaseUri: z.string().optional(),
  googlePlusUri: z.string().optional(),
  facebookUri: z.string().optional(),
  angellistUri: z.string().optional(),
  wikipediaUri: z.string().optional(),
  diffbotUri: z.string().optional(),
  origin: z.string().optional(),
  origins: z.array(z.string()).optional(),
  allUris: z.array(z.string()).optional(),
  nbOrigins: z.number().optional(),
  nbIncomingEdges: z.number().optional(),
  nbFollowers: z.number().optional(),
  nbLocations: z.number().optional(),
  nbEmployees: z.number().optional(),
  nbEmployeesMin: z.number().optional(),
  nbEmployeesMax: z.number().optional(),
  nbActiveEmployeeEdges: z.number().optional(),
  nbUniqueInvestors: z.number().optional(),
  educations: z.array(EducationSchema).optional(),
  nationalities: z.array(NationalitySchema).optional(),
  fullName: z.string().optional(),
  allNames: z.array(z.string()).optional(),
  skills: z.array(BasicEntitySchema.partial()).optional(),
  children: z.array(BasicEntitySchema).optional(),
  height: z.number().optional(),
  image: z.string().optional(),
  images: z.array(DiffbotImageSchema).optional(),
  allOriginHashes: z.array(z.string()).optional(),
  nameDetail: NameDetailSchema.optional(),
  parents: z.array(BasicEntitySchema).optional(),
  gender: z.enum(['male', 'female', 'other', 'unknown']).optional(),
  importance: z.number().optional(),
  birthPlace: LocationSchema.optional(),
  types: z.array(z.string()).optional(),
  employments: z.array(EmploymentSchema).optional(),
  birthDate: DateTimeSchema.optional(),
  religion: BasicEntitySchema.partial().optional(),
  netWorth: AmountSchema.optional(),
  allDescriptions: z.array(z.string()).optional(),
  locations: z.array(LocationSchema).optional(),
  location: LocationSchema.optional(),
  suppliers: z.array(BasicEntitySchema).optional(),
  subsidiaries: z.array(BasicEntitySchema).optional(),
  ipo: z.object({
    date: DateTimeSchema,
    stockExchange: z.string()
  }).optional(),
  motto: z.string().optional(),
  logo: z.string().optional(),
  foundingDate: DateTimeSchema.optional(),
  totalInvestment: AmountSchema.optional(),
  emailAddresses: z.array(z.object({
    address: z.string(),
    type: z.string().optional()
  })).optional(),
  age: z.number().optional(),
  isPublic: z.boolean().optional(),
  isAcquired: z.boolean().optional(),
  isDissolved: z.boolean().optional(),
  isNonProfit: z.boolean().optional(),
  crawlTimestamp: z.number().optional(),
  founders: z.array(BasicEntitySchema).optional(),
  boardMembers: z.array(BasicEntitySchema).optional(),
  ceo: BasicEntitySchema.optional(),
  acquiredBy: z.array(BasicEntitySchema).optional(),
  blogUri: z.string().optional(),
  descriptors: z.array(z.string()).optional(),
  industries: z.array(z.string()).optional(),
  partnerships: z.array(BasicEntitySchema).optional(),
  categories: z.array(z.object({
    name: z.string(),
    score: z.number().optional()
  })).optional(),
  customers: z.array(BasicEntitySchema).optional(),
  revenue: AmountSchema.optional(),
  parentCompany: BasicEntitySchema.optional(),
  legalEntities: z.array(BasicEntitySchema).optional()
});

const EnhanceEntityResponseSchema = z.object({
  version: z.number(),
  hits: z.number(),
  kgversion: z.string(),
  request_ctx: z.object({
    query: z.object({
      type: z.string(),
      name: z.array(z.string())
    }),
    query_ctx: z.object({
      search: z.string()
    })
  }),
  data: z.array(z.object({
    score: z.number(),
    esscore: z.number(),
    entity: EntitySchema,
    errors: z.array(z.object({
      message: z.string(),
      code: z.string().optional(),
      type: z.string().optional()
    }))
  })),
  errors: z.array(z.object({
    message: z.string(),
    code: z.string().optional(),
    type: z.string().optional()
  }))
});

const KnowledgeGraphEntitySchema = z.object({
  id: z.string(),
  diffbotUri: z.string(),
  type: z.string().optional(),
  name: z.string(),
  images: z.array(DiffbotImageSchema),
  origins: z.array(z.string()),
  nbOrigins: z.number().optional(),
  gender: z.enum(['male', 'female', 'other', 'unknown']).optional(),
  githubUri: z.string().optional(),
  importance: z.number().optional(),
  description: z.string().optional(),
  homepageUri: z.string().optional(),
  allNames: z.array(z.string()).optional(),
  skills: z.array(BasicEntitySchema.partial()).optional(),
  crawlTimestamp: z.number().optional(),
  summary: z.string().optional(),
  image: z.string().optional(),
  types: z.array(z.string()).optional(),
  nbIncomingEdges: z.number().optional(),
  allUris: z.array(z.string()).optional(),
  employments: z.array(EmploymentSchema).optional(),
  locations: z.array(LocationSchema).optional(),
  location: LocationSchema.optional(),
  allOriginHashes: z.array(z.string()).optional(),
  nameDetail: NameDetailSchema.optional()
});

const KnowledgeGraphResponseSchema = z.object({
  data: z.array(z.object({
    score: z.number(),
    esscore: z.number().optional(),
    entity: KnowledgeGraphEntitySchema,
    entity_ctx: z.record(z.unknown()),
    errors: z.array(z.string()),
    callbackQuery: z.string(),
    upperBound: z.number(),
    lowerBound: z.number(),
    count: z.number(),
    value: z.string(),
    uri: z.string()
  })),
  version: z.number(),
  hits: z.number(),
  results: z.number(),
  kgversion: z.string(),
  diffbot_type: z.string(),
  facet: z.boolean().optional(),
  errors: z.array(z.object({
    message: z.string(),
    code: z.string().optional(),
    type: z.string().optional()
  })).optional()
});

const KnowledgeGraphSearchOptionsSchema = z.object({
  type: z.enum(['query', 'text', 'queryTextFallback', 'crawl']).optional(),
  query: z.string().describe('The search query'),
  col: z.string().optional(),
  from: z.number().optional(),
  size: z.number().optional(),
  filter: z.string().optional(),
  jsonmode: z.enum(['extended', 'id']).optional(),
  nonCanonicalFacts: z.boolean().optional(),
  noDedupArticles: z.boolean().optional(),
  cluster: z.enum(['all', 'best', 'dedupe']).optional(),
  report: z.boolean().optional()
});

const KnowledgeGraphEnhanceOptionsSchema = z.object({
  type: z.enum(['Organization', 'Person', 'Place']),
  id: z.string().optional(),
  name: z.string().optional(),
  url: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  employer: z.string().optional(),
  title: z.string().optional(),
  school: z.string().optional(),
  location: z.string().optional(),
  ip: z.string().optional(),
  customId: z.string().optional(),
  size: z.number().optional(),
  threshold: z.number().optional(),
  refresh: z.boolean().optional(),
  search: z.boolean().optional(),
  useCache: z.boolean().optional(),
  filter: z.string().optional(),
  jsonmode: z.enum(['extended', 'id']).optional(),
  nonCanonicalFacts: z.boolean().optional()
});

export interface DiffbotClientOptions {
  apiKey: string
  apiBaseUrl?: string
  apiKnowledgeGraphBaseUrl?: string
  throttle?: boolean
}

/**
 * Diffbot API client for web scraping and knowledge graph operations
 */
export class DiffbotClient {
  private readonly apiKey: string
  private readonly apiBaseUrl: string
  private readonly apiKnowledgeGraphBaseUrl: string
  private readonly ky: KyInstance

  constructor(options: DiffbotClientOptions) {
    assert(options.apiKey, 'DiffbotClient missing required "apiKey"')
    
    this.apiKey = options.apiKey
    this.apiBaseUrl = options.apiBaseUrl ?? API_BASE_URL
    this.apiKnowledgeGraphBaseUrl = options.apiKnowledgeGraphBaseUrl ?? KNOWLEDGE_GRAPH_API_BASE_URL
    
    const ky = defaultKy.extend({
      timeout: 60000,
      retry: 2
    })
    
    this.ky = options.throttle ? throttleKy(ky, throttle) : ky
  }

  /**
   * Analyzes a URL using Diffbot's automatic extraction
   */
  async analyzeUrl(options: ExtractAnalyzeOptions): Promise<ExtractAnalyzeResponse> {
    const { url, ...params } = options
    
    const searchParams = sanitizeSearchParams({
      token: this.apiKey,
      url,
      ...params
    })

    const response = await this.ky.get(`${this.apiBaseUrl}/v3/analyze`, {
      searchParams
    }).json<ExtractAnalyzeResponse>()

    return ExtractAnalyzeResponseSchema.parse(response)
  }

  /**
   * Extracts article content from a URL
   */
  async extractArticleFromUrl(options: ExtractArticleOptions): Promise<ExtractArticleResponse> {
    const { url, ...params } = options
    
    const searchParams = sanitizeSearchParams({
      token: this.apiKey,
      url,
      ...params
    })

    const response = await this.ky.get(`${this.apiBaseUrl}/v3/article`, {
      searchParams
    }).json<ExtractArticleResponse>()

    return ExtractArticleResponseSchema.parse(response)
  }

  /**
   * Enhances an entity using Diffbot Knowledge Graph
   */
  async enhanceEntity(options: EnhanceEntityOptions): Promise<EnhanceEntityResponse> {
    const searchParams = sanitizeSearchParams({
      token: this.apiKey,
      ...options
    })

    const response = await this.ky.get(`${this.apiKnowledgeGraphBaseUrl}/v1/enhance`, {
      searchParams
    }).json<EnhanceEntityResponse>()

    return EnhanceEntityResponseSchema.parse(response)
  }

  /**
   * Searches the Diffbot Knowledge Graph
   */
  async searchKnowledgeGraph(options: KnowledgeGraphSearchOptions): Promise<KnowledgeGraphResponse> {
    const searchParams = sanitizeSearchParams({
      token: this.apiKey,
      ...options
    })

    const response = await this.ky.get(`${this.apiKnowledgeGraphBaseUrl}/v1/search`, {
      searchParams
    }).json<KnowledgeGraphResponse>()

    return KnowledgeGraphResponseSchema.parse(response)
  }

  /**
   * Enhances entities in the Knowledge Graph
   */
  async enhanceKnowledgeGraph(options: KnowledgeGraphEnhanceOptions): Promise<KnowledgeGraphResponse> {
    const searchParams = sanitizeSearchParams({
      token: this.apiKey,
      ...options
    })

    const response = await this.ky.get(`${this.apiKnowledgeGraphBaseUrl}/v1/enhance`, {
      searchParams
    }).json<KnowledgeGraphResponse>()

    return KnowledgeGraphResponseSchema.parse(response)
  }
}

export function createDiffbotClient(options?: {
  apiKey?: string
  apiBaseUrl?: string
  apiKnowledgeGraphBaseUrl?: string
  throttle?: boolean
}) {
  const apiKey = options?.apiKey ?? getEnv('DIFFBOT_API_KEY');
  if (!apiKey) {
    throw new Error('DiffbotClient requires a valid apiKey. Please provide it in options or set the DIFFBOT_API_KEY environment variable.');
  }
  const diffbot = new DiffbotClient({
    apiKey,
    apiBaseUrl: options?.apiBaseUrl ?? API_BASE_URL,
    apiKnowledgeGraphBaseUrl: options?.apiKnowledgeGraphBaseUrl ?? KNOWLEDGE_GRAPH_API_BASE_URL,
    throttle: options?.throttle ?? true
  })

  return {
    diffbotAnalyzeUrl: createTool({
      id: "diffbot-analyze-url",
      description: "Scrapes and extracts structured data from a web page using Diffbot.",
      inputSchema: z.object({ url: z.string().url().describe('The URL to process.') }),
      outputSchema: ExtractAnalyzeResponseSchema,
      execute: async ({ context, runtimeContext }) => {
        const debug = (runtimeContext?.get('debug') as boolean | undefined) ?? false;
        if (debug) {
          logger.info('Analyzing URL with Diffbot', { url: context.url });
        }
        try {
          const response = await diffbot.analyzeUrl(context);
          if (debug) {
            logger.info('Diffbot analyze URL completed successfully', { url: context.url });
          }
          return response;
        } catch (error) {
          logger.error('Diffbot analyze URL failed', { url: context.url, error: error instanceof Error ? error.message : 'Unknown error' });
          throw new Error(`Diffbot analyze URL failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      },
    }),
    diffbotExtractArticleFromUrl: createTool({
      id: "diffbot-extract-article-from-url",
      description: "Scrapes and extracts clean article text from web pages using Diffbot.",
      inputSchema: z.object({ url: z.string().url().describe('The URL to process.') }),
      outputSchema: ExtractArticleResponseSchema,
      execute: async ({ context, runtimeContext }) => {
        const debug = (runtimeContext?.get('debug') as boolean | undefined) ?? false;
        if (debug) {
          logger.info('Extracting article with Diffbot', { url: context.url });
        }
        try {
          const response = await diffbot.extractArticleFromUrl(context);
          if (debug) {
            logger.info('Diffbot extract article completed successfully', { url: context.url });
          }
          return response;
        } catch (error) {
          logger.error('Diffbot extract article failed', { url: context.url, error: error instanceof Error ? error.message : 'Unknown error' });
          throw new Error(`Diffbot extract article failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      },
    }),
    diffbotEnhanceEntity: createTool({
      id: "diffbot-enhance-entity",
      description: "Resolves and enriches a partial person or organization entity using Diffbot Knowledge Graph.",
      inputSchema: EnhanceEntityOptionsSchema.omit({ refresh: true, search: true, customId: true, threshold: true }),
      outputSchema: EnhanceEntityResponseSchema,
      execute: async ({ context, runtimeContext }) => {
        const debug = (runtimeContext?.get('debug') as boolean | undefined) ?? false;
        if (debug) {
          logger.info('Enhancing entity with Diffbot', { context });
        }
        try {
          const response = await diffbot.enhanceEntity(context);
          if (debug) {
            logger.info('Diffbot enhance entity completed successfully', { context });
          }
          return response;
        } catch (error) {
          logger.error('Diffbot enhance entity failed', { context, error: error instanceof Error ? error.message : 'Unknown error' });
          throw new Error(`Diffbot enhance entity failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      },
    }),
    diffbotSearchKnowledgeGraph: createTool({
      id: "diffbot-search-knowledge-graph",
      description: "Performs searches against the Diffbot Knowledge Graph.",
      inputSchema: KnowledgeGraphSearchOptionsSchema,
      outputSchema: KnowledgeGraphResponseSchema,
      execute: async ({ context, runtimeContext }) => {
        const debug = (runtimeContext?.get('debug') as boolean | undefined) ?? false;
        if (debug) {
          logger.info('Searching Knowledge Graph with Diffbot', { query: context.query });
        }
        try {
          const response = await diffbot.searchKnowledgeGraph(context);
          if (debug) {
            logger.info('Diffbot Knowledge Graph search completed successfully', { query: context.query });
          }
          return response;
        } catch (error) {
          logger.error('Diffbot Knowledge Graph search failed', { query: context.query, error: error instanceof Error ? error.message : 'Unknown error' });
          throw new Error(`Diffbot Knowledge Graph search failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      },
    }),
    diffbotEnhanceKnowledgeGraph: createTool({
      id: "diffbot-enhance-knowledge-graph",
      description: "Enhances entities in the Diffbot Knowledge Graph.",
      inputSchema: KnowledgeGraphEnhanceOptionsSchema,
      outputSchema: KnowledgeGraphResponseSchema,
      execute: async ({ context, runtimeContext }) => {
        const debug = (runtimeContext?.get('debug') as boolean | undefined) ?? false;
        if (debug) {
          logger.info('Enhancing Knowledge Graph with Diffbot', { context });
        }
        try {
          const response = await diffbot.enhanceKnowledgeGraph(context);
          if (debug) {
            logger.info('Diffbot Knowledge Graph enhance completed successfully', { context });
          }
          return response;
        } catch (error) {
          logger.error('Diffbot Knowledge Graph enhance failed', { context, error: error instanceof Error ? error.message : 'Unknown error' });
          throw new Error(`Diffbot Knowledge Graph enhance failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      },
    }),
  };
}

export type DiffbotRuntimeContext = {
  'debug'?: boolean;
};

export const diffbotRuntimeContext = new RuntimeContext<DiffbotRuntimeContext>();
diffbotRuntimeContext.set('debug', false);


// Export each Diffbot tool individually for granular usage
const diffbotClient = createDiffbotClient();
export const diffbotAnalyzeUrlTool = diffbotClient.diffbotAnalyzeUrl;
export const diffbotExtractArticleFromUrlTool = diffbotClient.diffbotExtractArticleFromUrl;
export const diffbotEnhanceEntityTool = diffbotClient.diffbotEnhanceEntity;
export const diffbotSearchKnowledgeGraphTool = diffbotClient.diffbotSearchKnowledgeGraph;
export const diffbotEnhanceKnowledgeGraphTool = diffbotClient.diffbotEnhanceKnowledgeGraph;
// Optionally export the client for advanced use

