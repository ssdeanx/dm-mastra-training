
import { Agent } from "@mastra/core/agent";
import { upstashMemory } from '../upstashMemory';
import { PinoLogger } from "@mastra/loggers";
import { z } from 'zod';
import {
  readDataFileTool,
  writeDataFileTool,
  deleteDataFileTool,
  listDataDirTool,
  chunkerTool,
  graphRAGTool,
  vectorQueryTool,
  diffbotAnalyzeUrlTool,
  diffbotExtractArticleFromUrlTool,
  diffbotEnhanceKnowledgeGraphTool,
  diffbotSearchKnowledgeGraphTool,
  diffbotEnhanceEntityTool,
  hackerNewsGetBestStories,
  hackerNewsGetSearchTopStories,
  arxivSearch,
  redditGetSubredditPosts,
  stockPriceTool,
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
import { createGemini25Provider } from '../config/googleProvider';

/**
 * Runtime context type for the Data Agent
 * Stores user/session and data operation preferences
 *
 * @remarks
 * Used to control file operations and session context for the Data Agent.
 *
 * @mastra DataAgent runtime context interface
 * @since 2025-07-07
 */
export type DataAgentRuntimeContext = {
  /** Unique identifier for the user */
  "user-id": string;
  /** Unique identifier for the session */
  "session-id": string;
  /** Data operation mode */
  "mode"?: "read" | "write" | "delete" | "list";
  /** Default data subdirectory */
  "data-dir"?: string;
};


const logger = new PinoLogger({ name: 'DataAgent', level: 'info' });
logger.info('Initializing DataAgent');


/**
 * Zod schema for validating Data Agent input
 * Ensures only valid operations and parameters are accepted
 */
export const dataAgentInputSchema = z.object({
  operation: z.enum(["read", "write", "delete", "list"]).describe("Data operation to perform"),
  fileName: z.string().optional().describe("File name (relative to data/ directory)"),
  content: z.string().optional().describe("Content to write (for write operation)"),
  dirPath: z.string().optional().describe("Directory path within data/ directory (for list operation)")
});


/**
 * Zod schema for validating Data Agent output
 * Ensures all responses are structured and type-safe
 */
export const dataAgentOutputSchema = z.object({
  success: z.boolean().describe("Whether the operation was successful"),
  message: z.string().optional().describe("Operation result message"),
  data: z.any().optional().describe("Returned data (file content, directory listing, etc.)"),
  error: z.string().optional().describe("Error message if operation failed")
});


/**
 * Data Agent for secure file and directory operations in the data/ folder.
 * Handles reading, writing, deleting, and listing files with audit logging and robust validation.
 *
 * @remarks
 * - Always validates file paths and restricts access to the allowed data directory.
 * - Logs all actions for auditability and security.
 * - Uses Gemini 2.5 for natural language understanding and robust error handling.
 *
 * @example
 * ```typescript
 * const result = await dataAgent.generate({ operation: 'read', fileName: 'example.md' }, { resourceId: 'user-123' });
 * ```
 */
export const dataAgent = new Agent({
  name: "Data Agent",
  instructions: async ({ runtimeContext }) => {
    const userId = runtimeContext?.get("user-id") || "anonymous";
    const sessionId = runtimeContext?.get("session-id") || "default";
    const mode = runtimeContext?.get("mode") || "read";
    const dataDir = runtimeContext?.get("data-dir") || "./data/";
    return `You are a highly secure and efficient Data Management Agent. Your primary function is to perform file and directory operations within the designated 'data/' directory, ensuring data integrity, security, and auditability.

CURRENT OPERATIONAL CONTEXT:
- User ID: ${userId}
- Session ID: ${sessionId}
- Operation Mode: ${mode} (e.g., read, write, delete, list)
- Designated Data Directory: ${dataDir}

YOUR CORE RESPONSIBILITIES:
1.  **Secure File Operations**: Safely read, write, delete, and list files within the 'data/' directory.
2.  **Data Integrity & Validation**: Ensure all file paths are valid and operations adhere to security protocols, preventing unauthorized access or directory traversal.
3.  **Audit Logging**: Log every action and error for comprehensive audit trails.
4.  **Clear Communication**: Provide clear, actionable responses to user requests, including helpful error messages when issues arise.

AVAILABLE TOOLS & THEIR OPTIMAL USE:
- 'readDataFileTool': Use to read the content of a specified file within the 'data/' directory.
- 'writeDataFileTool': Use to write content to a specified file within the 'data/' directory. This will overwrite existing files or create new ones.
- 'deleteDataFileTool': Use to delete a specified file within the 'data/' directory.
- 'listDataDirTool': Use to list the contents (files and subdirectories) of a specified directory within 'data/'.
- 'chunkerTool': For breaking down large texts or data into smaller, manageable chunks for processing or analysis.
- 'graphRAGQueryTool': For querying the knowledge graph.
- 'graphRAGTool': For interacting with the knowledge graph.
- 'graphRAGUpsertTool': For adding or updating data in the knowledge graph.
- 'vectorQueryTool': For performing semantic searches and retrieving relevant information from vector databases.
- 'hybridVectorSearchTool': For performing hybrid searches combining keyword and vector search.
- 'diffbotAnalyzeUrlTool': For analyzing and extracting structured data from web pages.
- 'diffbotExtractArticleFromUrlTool': For extracting clean article content from web pages.
- 'diffbotEnhanceEntityTool': For enriching information about entities (persons, organizations) using Diffbot Knowledge Graph.
- 'diffbotSearchKnowledgeGraphTool': For searching the Diffbot Knowledge Graph.
- 'diffbotEnhanceKnowledgeGraphTool': For enhancing entities within the Diffbot Knowledge Graph.
- 'stockPriceTool': For fetching real-time stock prices, which can then be stored or managed.
- 'historicalStockPriceTool': For fetching historical stock data, useful for populating datasets.
- 'stockNewsTool': For retrieving stock-related news, which can be archived or analyzed.
- 'earningsCalendarTool': For fetching earnings report schedules, which can be used to update financial datasets.
- 'sportsOddsTool': For fetching real-time sports odds, useful for sports data collection.
- 'historicalOddsTool': For fetching historical sports odds, for building sports analytics datasets.
- 'listSportsTool': For listing available sports, to inform data collection strategies.
- 'listBookmakersTool': For listing available bookmakers, to inform data collection strategies.
- 'cryptoPriceTool': For fetching real-time cryptocurrency prices, for crypto data storage.
- 'historicalCryptoPriceTool': For fetching historical cryptocurrency prices, for building crypto datasets.
- 'cryptoMarketDataTool': For fetching comprehensive crypto market data, for detailed crypto analysis.
- 'listCryptoCoinsTool': For listing all supported cryptocurrencies, to inform crypto data collection.

GUIDELINES FOR EXECUTION:
- **Strict Path Validation**: Never attempt to access files outside the {dataDir} directory.
- **Error Handling**: If an operation fails (e.g., file not found, permission denied), log the error and provide a user-friendly message.
- **Security First**: Prioritize data security and prevent any potential data leakage or unauthorized operations.
- **Concise Responses**: Provide only the requested information or confirmation of action.
`;
  },
  model: createGemini25Provider('gemini-2.5-flash-lite-preview-06-17', {
    responseModalities: ["TEXT"],
    thinkingConfig: {
      thinkingBudget: -1,
      includeThoughts: true,
    },
  }),
  memory: upstashMemory,
  tools: {
    readDataFileTool,
    writeDataFileTool,
    deleteDataFileTool,
    listDataDirTool,
    chunkerTool,
    graphRAGTool,
    vectorQueryTool,
    diffbotAnalyzeUrlTool,
    diffbotExtractArticleFromUrlTool,
    diffbotEnhanceEntityTool,
    diffbotSearchKnowledgeGraphTool,
    diffbotEnhanceKnowledgeGraphTool,
    hackerNewsGetBestStories,
    hackerNewsGetSearchTopStories,
    arxivSearch,
    redditGetSubredditPosts,
    stockPriceTool,
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
    }
});


/**
 * Validates input for the Data Agent using the input Zod schema.
 * Logs and throws on error for robust error handling.
 * @param input - The input to validate
 */
export function validateDataAgentInput(input: unknown): z.infer<typeof dataAgentInputSchema> {
  try {
    return dataAgentInputSchema.parse(input);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Invalid data agent input', { error: errorMessage, input: JSON.stringify(input, null, 2) });
    throw error;
  }
}

/**
 * Validates output for the Data Agent using the output Zod schema.
 * Logs and throws on error for robust error handling.
 * @param output - The output to validate
 */
export function validateDataAgentOutput(output: unknown): z.infer<typeof dataAgentOutputSchema> {
  try {
    return dataAgentOutputSchema.parse(output);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Invalid data agent output', { error: errorMessage, output: JSON.stringify(output, null, 2) });
    throw error;
  }
}


