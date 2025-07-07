
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
  graphRAGQueryTool,
  graphRAGTool,
  graphRAGUpsertTool,
  vectorQueryTool,
  hybridVectorSearchTool,
  diffbotAnalyzeUrlTool,
  diffbotExtractArticleFromUrlTool,
  diffbotEnhanceKnowledgeGraphTool,
  diffbotSearchKnowledgeGraphTool,
  diffbotEnhanceEntityTool
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
    return [
      `You are a secure data management assistant.`,
      `You can read, write, delete, and list files in the data directory.`,
      `Always validate file paths, log all actions, and never access files outside the allowed directory.`,
      '',
      `CURRENT SESSION:`,
      `- User: ${userId}`,
      `- Session: ${sessionId}`,
      `- Mode: ${mode}`,
      `- Data Directory: ${dataDir}`,
      '',
      `When handling requests:`,
      `- Validate all file paths and restrict access to the allowed data directory.`,
      `- Log every action and error for auditability.`,
      `- Never leak sensitive data or allow directory traversal.`,
      `- Respond with clear, actionable messages.`,
      `- If an error occurs, provide a helpful error message and log the details.`,
    ].join('\n');
  },
  model: createGemini25Provider('gemini-2.5-flash-lite-preview-06-17', {
    responseModalities: ["TEXT"],
    thinkingConfig: {
      thinkingBudget: 256,
      includeThoughts: false,
    },
  }),
  memory: upstashMemory,
  tools: {
    readDataFileTool,
    writeDataFileTool,
    deleteDataFileTool,
    listDataDirTool,
    chunkerTool,
    graphRAGQueryTool,
    graphRAGTool,
    graphRAGUpsertTool,
    vectorQueryTool,
    hybridVectorSearchTool,
    diffbotAnalyzeUrlTool,
    diffbotExtractArticleFromUrlTool,
    diffbotEnhanceEntityTool,
    diffbotSearchKnowledgeGraphTool,
    diffbotEnhanceKnowledgeGraphTool
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


