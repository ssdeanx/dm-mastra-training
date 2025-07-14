import { Agent } from "@mastra/core/agent";
import { mastraMemory } from '../upstashMemory';
import { createGemini25Provider } from '../config/googleProvider';
import { chunkerTool } from "../tools/chunker-tool";
import { z } from "zod";
import { UPSTASH_PROMPT } from "@mastra/upstash";
import { PinoLogger } from "@mastra/loggers";
import {
  vectorQueryTool,
  hybridVectorSearchTool,
  createBraveSearchTool,
  createTavilySearchTool,
  webScraperTool,
  gitOperationsTool,
  diffbotAnalyzeUrlTool,
  diffbotExtractArticleFromUrlTool,
  diffbotEnhanceKnowledgeGraphTool,
  diffbotSearchKnowledgeGraphTool,
  diffbotEnhanceEntityTool,
  arxivSearch,
  redditGetSubredditPosts,
  hackerNewsGetBestStories,
  hackerNewsGetSearchUser,
  hackerNewsSearchItems,
  hackerNewsGetSearchTopStories,
  hackerNewsGetSearchItem,
  hackerNewsGetItem,
  hackerNewsGetTopStories,
  hackerNewsGetNewStories,
  graphRAGTool,
  graphRAGQueryTool,
  graphRAGUpsertTool,
  rerankTool,
  listDataDirTool,
  readDataFileTool,
  writeDataFileTool,
  deleteDataFileTool,
  mem0RememberTool,
  mem0MemorizeTool,
  stockPriceTool,
  weatherTool,
  historicalStockPriceTool,
  stockNewsTool,
  earningsCalendarTool,
  sportsOddsTool,
  historicalOddsTool,
  listSportsTool,
  listBookmakersTool,
  cryptoPriceTool,
  historicalCryptoPriceTool,
  cryptoMarketDataTool,
  listCryptoCoinsTool
} from "../tools";

const logger = new PinoLogger({ name: 'MappingAgent', level: 'info' });
logger.info('Initializing MappingAgent');

/**
 * Runtime context type for the Mapping Agent
 * Stores preferences for data transformation and schema mapping.
 */
export type MappingAgentRuntimeContext = {
  /** Unique identifier for the user */
  "user-id": string;
  /** Unique identifier for the session */
  "session-id": string;
  /** Format of the source data (e.g., json, csv, xml) */
  "source-data-format": "json" | "csv" | "xml" | "yaml" | "plaintext" | "auto";
  /** Format of the target data (e.g., json, csv, xml) */
  "target-data-format": "json" | "csv" | "xml" | "yaml" | "plaintext";
  /** Strategy for applying mapping transformations */
  "mapping-strategy": "direct" | "transform" | "aggregate" | "normalize" | "enrich";
  /** Level of validation to apply during mapping */
  "validation-level": "none" | "schema" | "strict";
  /** Strategy for handling errors during mapping */
  "error-handling-strategy": "skip" | "flag" | "halt" | "retry";
  /** Flag to enable or disable visualization of data mappings */
  "visualization-enabled": boolean;
  /** Domain context for data mapping */
  "domain-context": string;
};

/**
 * Zod schema for validating Mapping Agent input
 * Ensures valid source data, target schema, and mapping instructions.
 */
const mappingAgentInputSchema = z.object({
  sourceData: z.any().describe('The data to be mapped, can be string, object, or array'),
  sourceSchema: z.record(z.any()).optional().describe('Optional schema of the source data'),
  targetSchema: z.record(z.any()).describe('The desired schema for the output data'),
  mappingInstructions: z.string().describe('Instructions for how to map source fields to target fields'),
  context: z.record(z.any()).optional().describe('Optional context information relevant to the mapping'),
  requestId: z.string().optional().describe('Optional request identifier'),
  metadata: z.record(z.any()).optional().describe('Optional metadata'),
  userId: z.string().optional().describe('User identifier'),
  sessionId: z.string().optional().describe('Session identifier'),
  sourceDataFormat: z.enum(["json", "csv", "xml", "yaml", "plaintext", "auto"]).optional().describe('Format of the source data'),
  targetDataFormat: z.enum(["json", "csv", "xml", "yaml", "plaintext"]).optional().describe('Format of the target data'),
  mappingStrategy: z.enum(["direct", "transform", "aggregate", "normalize", "enrich"]).optional().describe('Strategy for mapping transformations'),
  validationLevel: z.enum(["none", "schema", "strict"]).optional().describe('Level of validation to apply'),
  errorHandler: z.enum(["skip", "flag", "halt", "retry"]).optional().describe('Strategy for handling errors'),
  visualizationEnabled: z.boolean().optional().describe('Enable or disable visualization of mappings'),
  domainContext: z.string().optional().describe('Domain context for data mapping'),
}).strict();

/**
 * Zod schema for validating Mapping Agent output
 * Ensures mapped data, mapping report, and success status are provided.
 */
const mappingAgentOutputSchema = z.object({
  mappedData: z.any().describe('The data after applying the mapping transformations'),
  mappingReport: z.object({
    status: z.enum(["success", "partial-success", "failure"]).describe('Overall status of the mapping operation'),
    transformedRecords: z.number().describe('Number of records successfully transformed'),
    failedRecords: z.number().describe('Number of records that failed transformation'),
    errors: z.array(z.string()).optional().describe('List of errors encountered during mapping'),
    warnings: z.array(z.string()).optional().describe('List of warnings generated during mapping'),
    transformationLog: z.array(z.string()).optional().describe('Detailed log of transformations applied'),
  }).describe('Report detailing the mapping process and outcomes'),
  success: z.boolean().describe('Whether the mapping operation was successful'),
  toolsUsed: z.array(z.string()).optional().describe('Tools used during the mapping process'),
  requestId: z.string().describe('Unique request identifier'),
  timestamp: z.string().datetime().describe('Mapping timestamp'),
}).strict();

/**
 * Enhanced Mapping Agent configuration with Zod validation
 * Prevents ZodNull errors and ensures type safety.
 */
const mappingAgentConfigSchema = z.object({
  name: z.string().min(1).describe('Agent name identifier'),
  instructions: z.string().describe('Detailed instructions for the agent'),
  runtimeContext: z.object({
    'user-id': z.string().describe('User identifier'),
    'session-id': z.string().describe('Session identifier'),
    'source-data-format': z.enum(["json", "csv", "xml", "yaml", "plaintext", "auto"]).optional().describe('Format of the source data'),
    'target-data-format': z.enum(["json", "csv", "xml", "yaml", "plaintext"]).optional().describe('Format of the target data'),
    'mapping-strategy': z.enum(["direct", "transform", "aggregate", "normalize", "enrich"]).optional().describe('Strategy for applying mapping transformations'),
    'validation-level': z.enum(["none", "schema", "strict"]).optional().describe('Level of validation to apply'),
    'error-handling-strategy': z.enum(["skip", "flag", "halt", "retry"]).optional().describe('Strategy for handling errors'),
    'visualization-enabled': z.boolean().optional().describe('Flag to enable or disable visualization of data mappings'),
    'domain-context': z.string().optional().describe('Domain context for data mapping'),
  }).describe('Runtime context for the agent'),
  model: z.any().describe('Model configuration for the agent'),
  tools: z.record(z.any()).describe('Available tools for the agent'),
  memory: z.any().describe('Agent memory configuration'),
  workflows: z.record(z.any()).describe('Available workflows for the agent')
}).strict();

/**
 * Mapping Agent - Specializes in transforming data from one format or schema to another.
 * This agent ensures data integrity, handles various data types, and provides detailed mapping reports.
 */
export const mappingAgent = new Agent({
  name: "Mapping Agent",
  instructions: async ({ runtimeContext }) => {
    const userId = runtimeContext?.get("user-id") || "anonymous";
    const sessionId = runtimeContext?.get("session-id") || "default";
    const sourceDataFormat = runtimeContext?.get("source-data-format") || "auto";
    const targetDataFormat = runtimeContext?.get("target-data-format") || "json";
    const mappingStrategy = runtimeContext?.get("mapping-strategy") || "direct";
    const validationLevel = runtimeContext?.get("validation-level") || "schema";
    const errorHandlingStrategy = runtimeContext?.get("error-handling-strategy") || "flag";
    const visualizationEnabled = runtimeContext?.get("visualization-enabled") || false;
    const domainContext = runtimeContext?.get("domain-context") || "general";

    return `You are the Mapping Agent, an expert in data transformation and schema mapping. Your primary role is to convert data from a source format/schema to a target format/schema, ensuring data integrity, consistency, and accuracy throughout the process. You are adept at handling various data types and providing comprehensive reports on mapping operations.

CURRENT OPERATIONAL CONTEXT:
- User ID: ${userId}
- Session ID: ${sessionId}
- Source Data Format: ${sourceDataFormat}
- Target Data Format: ${targetDataFormat}
- Mapping Strategy: ${mappingStrategy} (e.g., direct, transform, aggregate, normalize, enrich)
- Validation Level: ${validationLevel} (e.g., none, schema, strict)
- Error Handling Strategy: ${errorHandlingStrategy} (e.g., skip, flag, halt, retry)
- Visualization Enabled: ${visualizationEnabled ? 'YES' : 'NO'}
- Domain Specificity: ${domainContext}

YOUR CORE RESPONSIBILITIES:
1.  **Data Ingestion & Parsing**: Accurately ingest and parse source data based on its specified format.
2.  **Schema Understanding**: Interpret both source and target schemas to identify mapping requirements.
3.  **Transformation Logic Application**: Apply defined mapping instructions and transformation logic to convert data fields and structures.
4.  **Data Validation**: Validate transformed data against the target schema and specified validation level.
5.  **Error & Warning Management**: Identify and handle mapping errors and warnings according to the defined strategy.
6.  **Mapping Report Generation**: Produce detailed reports on the mapping process, including success rates, errors, and transformations applied.
7.  **Relationship Identification**: Identify and preserve relationships between data entities during transformation.
8.  **Mapping Visualization (Optional)**: If enabled, generate visual representations of the data mappings.

AVAILABLE TOOLS & THEIR OPTIMAL USE:
- 'vectorQueryTool': For retrieving contextually relevant information from vector databases, useful for understanding data semantics or complex mapping rules.
- 'hybridVectorSearchTool': For advanced information retrieval combining keyword and semantic search to find relevant mapping patterns or data definitions.
- 'braveSearchTool': For broad web searches to find documentation on data formats, industry standards, or common mapping practices.
- 'tavilySearchTool': For focused, in-depth web research to obtain precise specifications for complex data schemas or transformation algorithms.
- 'webScraperTool': For extracting data from web pages that might serve as source data or provide mapping examples.
- 'gitOperationsTool': For analyzing codebases that define data structures or existing mapping implementations.
- 'diffbotAnalyzeUrlTool', 'diffbotExtractArticleFromUrlTool', 'diffbotEnhanceKnowledgeGraphTool', 'diffbotSearchKnowledgeGraphTool', 'diffbotEnhanceEntityTool': For structured data extraction and knowledge graph enrichment, useful for understanding external data sources that need mapping.
- 'arxivSearch', 'redditGetSubredditPosts', 'hackerNewsGetBestStories', 'hackerNewsGetSearchUser', 'hackerNewsSearchItems', 'hackerNewsGetSearchTopStories', 'hackerNewsGetSearchItem', 'hackerNewsGetItem', 'hackerNewsGetTopStories', 'hackerNewsGetNewStories': For gathering information on data trends, community discussions on data standards, or specific data sets.
- 'graphRAGTool', 'graphRAGQueryTool', 'graphRAGUpsertTool': For interacting with and updating knowledge graphs to represent complex data relationships and mapping rules.
- 'rerankTool': For prioritizing mapping rules or data fields based on their importance or complexity.
- 'listDataDirTool', 'readDataFileTool', 'writeDataFileTool', 'deleteDataFileTool': For managing internal data files, including source data, target schemas, and mapping configurations.
- 'mem0RememberTool', 'mem0MemorizeTool': For storing and retrieving long-term memory about common mapping patterns, past transformations, and learned schema relationships.
- 'stockPriceTool': For real-time stock price data that might need to be integrated or mapped into existing financial datasets.
- 'historicalStockPriceTool': For historical stock price data, useful for transforming raw historical data into a standardized format.
- 'stockNewsTool': For news articles related to specific stocks, which might need to be parsed and mapped into a news schema.
- 'earningsCalendarTool': For earnings report schedules, which can be mapped into a corporate events calendar.
- 'sportsOddsTool': For real-time sports odds data, useful for mapping into sports analytics databases.
- 'historicalOddsTool': For historical sports odds data, enabling the creation of historical sports performance datasets.
- 'listSportsTool': For listing available sports, to inform the structure of sports-related data mapping.
- 'listBookmakersTool': For listing available bookmakers, providing context for odds data mapping.
- 'cryptoPriceTool': For real-time cryptocurrency prices, which can be mapped into a standardized crypto price feed.
- 'historicalCryptoPriceTool': For historical cryptocurrency prices, useful for transforming into time-series crypto data.
- 'cryptoMarketDataTool': For comprehensive cryptocurrency market data, which can be mapped into a market overview schema.
- 'listCryptoCoinsTool': For listing all supported cryptocurrencies, to inform the mapping of crypto-related data.
- 'weatherTool': For real-time weather data that might need to be integrated or mapped into location-based datasets.
- 'chunkerTool': For breaking down large data files or schemas into manageable chunks for processing.

GUIDELINES FOR EXECUTION:
- **Precision in Transformation**: Ensure every data point is transformed accurately according to the mapping instructions and target schema.
- **Robust Validation**: Apply the specified validation level rigorously to maintain data quality.
- **Comprehensive Reporting**: Provide clear, detailed mapping reports that highlight successes, failures, and any data anomalies.
- **Adaptability**: Be prepared to handle diverse data formats and complex transformation requirements.
- **Error Transparency**: Clearly communicate any errors or warnings, and follow the defined error handling strategy.

${UPSTASH_PROMPT}
`;
  },
  model: createGemini25Provider('gemini-2.5-flash-lite-preview-06-17', {
    responseModalities: ["TEXT"],
    thinkingConfig: {
      thinkingBudget: 512, // Dynamic thinking budget
      includeThoughts: true, // Include thoughts for debugging and monitoring purposes
    },
    useSearchGrounding: true, // Enable Google Search integration for current events
    dynamicRetrieval: true, // Let model decide when to use search grounding
    safetyLevel: 'OFF', // Options: 'STRICT', 'MODERATE', 'PERMISSIVE', 'OFF'
    structuredOutputs: true, // Enable structured JSON responses
  }),
  tools: {
    vectorQueryTool,
    hybridVectorSearchTool,
    chunkerTool,
    graphRAGTool,
    graphRAG: graphRAGQueryTool,
    graphRAGUpsertTool,
    rerankTool,
    mem0RememberTool,
    mem0MemorizeTool,
    stockPriceTool,
    weatherTool,
    braveSearchTool: createBraveSearchTool(),
    tavilySearchTool: createTavilySearchTool(),
    webScraperTool,
    gitOperationsTool,
    listDataDirTool,
    readDataFileTool,
    writeDataFileTool,
    deleteDataFileTool,
    diffbotAnalyzeUrlTool,
    diffbotExtractArticleFromUrlTool,
    diffbotEnhanceKnowledgeGraphTool,
    diffbotSearchKnowledgeGraphTool,
    diffbotEnhanceEntityTool,
    arxivSearch,
    redditGetSubredditPosts,
    hackerNewsGetSearchItem,
    hackerNewsGetSearchUser,
    hackerNewsSearchItems,
    hackerNewsGetSearchTopStories,
    hackerNewsGetItem,
    hackerNewsGetTopStories,
    hackerNewsGetNewStories,
    hackerNewsGetBestStories,
    historicalStockPriceTool,
    stockNewsTool,
    earningsCalendarTool,
    sportsOddsTool,
    historicalOddsTool,
    listSportsTool,
    listBookmakersTool,
    cryptoPriceTool,
    historicalCryptoPriceTool,
    cryptoMarketDataTool,
    listCryptoCoinsTool
  },
  memory: mastraMemory
});

/**
 * Validate input data against mapping agent schema
 * @param input - Raw input data to validate
 * @returns Validated input data
 * @throws ZodError if validation fails
 */
export function validateMappingAgentInput(input: unknown): z.infer<typeof mappingAgentInputSchema> {
  try {
    return mappingAgentInputSchema.parse(input);
  } catch (error) {
    logger.error(`Mapping agent input validation failed: ${error}`);
    throw error;
  }
}

/**
 * Validate output data against mapping agent schema
 * @param output - Raw output data to validate
 * @returns Validated output data
 * @throws ZodError if validation fails
 */
export function validateMappingAgentOutput(output: unknown): z.infer<typeof mappingAgentOutputSchema> {
  try {
    return mappingAgentOutputSchema.parse(output);
  } catch (error) {
    logger.error(`Mapping agent output validation failed: ${error}`);
    throw error;
  }
}

// Export schemas for use in other parts of the application
export { mappingAgentInputSchema, mappingAgentOutputSchema, mappingAgentConfigSchema };