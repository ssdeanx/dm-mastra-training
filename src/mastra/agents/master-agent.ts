import { Agent } from "@mastra/core/agent";
import { upstashMemory } from '../upstashMemory';
import { graphRAGQueryTool, graphRAGTool, graphRAGUpsertTool } from '../tools/graphRAG';
import { vectorQueryTool, hybridVectorSearchTool } from "../tools/vectorQueryTool";
import { mem0RememberTool, mem0MemorizeTool } from "../tools/mem0-tool";
import { weatherTool } from "../tools/weather-tool";
import { stockPriceTool } from "../tools/stock-tools";
import { chunkerTool } from "../tools/chunker-tool";
import {
  ToneConsistencyMetric,
  KeywordCoverageMetric,
  CompletenessMetric,
  ContentSimilarityMetric,
  TextualDifferenceMetric
} from '@mastra/evals/nlp';
import { createGemini25Provider } from '../config/googleProvider';
// Langfuse tracing is automatically enabled via Mastra's telemetry configuration
// All agent operations will be traced with detailed metadata
import { z } from 'zod';
//import { CustomEvalMetric } from "../evals/customEval";
//import { WordInclusionMetric } from "../evals/wordInclusion";
import { UPSTASH_PROMPT } from "@mastra/upstash";
import { PinoLogger } from "@mastra/loggers";
import { createBraveSearchTool, createTavilySearchTool, codeSearchTool, webScraperTool, gitOperationsTool } from "../tools";
/**
 * Runtime context type for the Master Agent
 * Production-focused runtime variables for agent behavior
 */
export type MasterAgentRuntimeContext = {
  "user-id": string;
  "session-id": string;
  "project-context": string;
  "model-version": string;
  "model-provider": string;
  "plan-mode": boolean;
  "tasks": string;
  "actions": string;
  "tool-selection": string;
  "debug-mode": boolean;
};

// Create dual logger that sends logs to both PinoLogger (console) and Upstash (distributed)
const logger = new PinoLogger({ name: 'masterAgent', level: 'info' });

logger.debug("Debug message"); // Won't be logged because level is INFO
logger.info("Master agent initialized - logging to both PinoLogger and Upstash");
logger.error("An error occurred"); // Logged as ERROR to both systems
/**
 * Comprehensive Zod schemas for Master Agent validation
 * Prevents Google AI model ZodNull validation errors
 */
const masterAgentInputSchema = z.object({
  query: z.string().min(1).describe('User query or request for the master agent'),
  context: z.record(z.any()).optional().describe('Optional context information'),
  requestId: z.string().optional().describe('Optional request identifier'),
  metadata: z.record(z.any()).optional().describe('Optional metadata')
}).strict();

const masterAgentOutputSchema = z.object({
  response: z.string().describe('Agent response to the user query'),
  actions: z.array(z.string()).optional().describe('Actions taken by the agent'),
  toolsUsed: z.array(z.string()).optional().describe('Tools used during processing'),
  requestId: z.string().describe('Unique request identifier'),
  timestamp: z.string().datetime().describe('Response timestamp')
}).strict();

/**
 * Enhanced Master Agent configuration with Zod validation
 * Prevents ZodNull errors and ensures type safety
 */
const masterAgentConfigSchema = z.object({
  name: z.string().min(1).describe('Agent name identifier'),
  instructions: z.string().describe('Detailed instructions for the agent'),
  runtimeContext: z.object({
    'user-id': z.string().describe('User identifier'),
    'session-id': z.string().describe('Session identifier'),
    'project-context': z.string().describe('Project context'),
    'plan-mode': z.boolean().describe('Plan mode flag'),
    'tasks': z.string().describe('Tasks for the agent'),
    'actions': z.string().describe('Actions for the agent'),
    'tool-selection': z.string().describe('Tool selection'),
    'debug-mode': z.boolean().describe('Debug mode flag')
  }).describe('Runtime context for the agent'),
  model: z.any().describe('Model configuration for the agent'),
  evals: z.record(z.any()).describe('Evaluation metrics for the agent'),
  tools: z.record(z.any()).describe('Available tools for the agent'),
  memory: z.any().describe('Agent memory configuration'),
  workflows: z.record(z.any()).describe('Available workflows for the agent')
}).strict();

/**
 * Master Agent - Primary debugging and problem-solving assistant
 * 
 * @file master-agent.ts
 * @author Mastra Team
 * @license MIT
 * @version 1.0.0
 * @since 2025-06-20
 * @module master-agent
 * @requires @mastra/core
 * 
 * @summary The Master Agent is a highly capable AI assistant designed to handle complex problem-solving tasks across various domains.
 * 
 * @description
 * The Master Agent is a highly capable AI assistant designed to handle complex problem-solving tasks across various domains. It integrates advanced capabilities such as:
 * - Graph-based knowledge retrieval
 * - Vector similarity search
 * - File system operations via MCP
 * - Git repository management
 * - Real-time data access (weather, stock prices)
 * - Comprehensive debugging and technical assistance
 * - Enhanced with comprehensive Zod validation to prevent ZodNull errors
 * This agent is built to be flexible, efficient, and user-friendly, providing accurate and actionable responses to user queries. It leverages the latest Gemini 2.5 model features, including dynamic retrieval and structured outputs, to enhance its problem-solving capabilities.
 * The agent is designed to work seamlessly with Mastra's telemetry and logging systems, allowing for detailed tracking of actions, tool usage, and decision-making processes. It also includes advanced evaluation metrics to assess performance, consistency, and content quality.
 * 
 * and ensure type safety across all operations.
 *
 * @mastra Enhanced master agent with input/output validation
 */
export const masterAgent = new Agent({
  name: "Master Agent",
  instructions: async ({ runtimeContext }) => {
    const userId = runtimeContext?.get("user-id") || "anonymous";
    const sessionId = runtimeContext?.get("session-id") || "default";
    const projectContext = runtimeContext?.get("project-context") || "";
    const modelVersion = runtimeContext?.get("model-version") || "gemini-2.5-flash-lite-preview-06-17";
    const modelProvider = runtimeContext?.get("model-provider") || "google";
    const toolSelection = runtimeContext?.get("tool-selection") || "all";
    const debugMode = runtimeContext?.get("debug-mode") || false;
    const planMode = runtimeContext?.get("plan-mode") || false;
    const tasks = runtimeContext?.get("tasks") || "";
    const actions = runtimeContext?.get("actions") || "";

    return `You are the Master Agent - an Advanced AI Problem-Solver and Technical Assistant. You are extremely flexible and capable of handling any task by leveraging your comprehensive knowledge and an extensive suite of specialized tools.

CURRENT OPERATIONAL CONTEXT:
- User ID: ${userId}
- Session ID: ${sessionId}
${projectContext ? `- Project Context: ${projectContext}` : ""}
- Model Version: ${modelVersion}
- Model Provider: ${modelProvider}
${toolSelection ? `- Tool Selection: ${toolSelection}` : ""}
${debugMode ? "- Debug Mode: ENABLED" : ""}
${planMode ? "- Plan Mode: ENABLED" : ""}
${tasks ? `- Current Tasks: ${tasks}` : ""}
${actions ? `- Recent Actions: ${actions}` : ""}

YOUR CORE CAPABILITIES:
- **Information Retrieval & Analysis**: Utilize graph-based knowledge retrieval and vector similarity search across documents to provide comprehensive and contextually relevant information.
- **System & Development Operations**: Perform file system operations, manage Git repositories, and interact with codebases.
- **Real-time Data & Utilities**: Access and provide current weather information, stock prices, and other real-time data.
- **General Problem Solving**: Diagnose issues, provide step-by-step debugging guidance, and execute complex tasks efficiently.

AVAILABLE TOOLS & THEIR OPTIMAL USE:
- 'readDataFileTool': To read the content of a specified file.
- 'writeDataFileTool': To write content to a specified file.
- 'deleteDataFileTool': To delete a specified file.
- 'listDataDirTool': To list the contents of a specified directory.
- 'createBraveSearchTool': For broad web searches, current events, and general information gathering.
- 'createTavilySearchTool': For focused, in-depth web research, especially when precise answers or specific articles are required.
- 'wikidataTools': For querying and retrieving data from Wikidata.
- 'redditGetSubredditPosts': To fetch posts from a specified subreddit on Reddit.
- 'hackerNewsGetSearchItem': To fetch a Hacker News story or comment by ID from the Algolia search API.
- 'hackerNewsGetSearchUser': To fetch a Hacker News user by username from the Algolia search API.
- 'hackerNewsSearchItems': To search Hacker News for stories and comments.
- 'hackerNewsGetSearchTopStories': To fetch top stories from Hacker News.
- 'hackerNewsGetItem': To fetch a Hacker News item by ID from the Firebase API.
- 'hackerNewsGetTopStories': To fetch IDs of top stories from Hacker News.
- 'hackerNewsGetNewStories': To fetch IDs of new stories from Hacker News.
- 'hackerNewsGetBestStories': To fetch IDs of best stories from Hacker News.
- 'arxivSearch': To search for research articles on arXiv.
- 'codeSearchTool': For searching codebases.
- 'webScraperTool': For extracting content directly from specified web pages.
- 'gitOperationsTool': For interacting with Git repositories.
- 'diffbotAnalyzeUrlTool': For analyzing and extracting structured data from web pages.
- 'diffbotExtractArticleFromUrlTool': For extracting clean article content from web pages.
- 'diffbotEnhanceEntityTool': For enriching information about entities (persons, organizations) using Diffbot Knowledge Graph.
- 'diffbotSearchKnowledgeGraphTool': For searching the Diffbot Knowledge Graph.
- 'diffbotEnhanceKnowledgeGraphTool': For enhancing entities within the Diffbot Knowledge Graph.
- 'chunkerTool': For breaking down large texts or data into smaller, manageable chunks.
- 'graphRAGTool': For interacting with the knowledge graph.
- 'graphRAGQueryTool': For querying the knowledge graph.
- 'graphRAGUpsertTool': For adding or updating data in the knowledge graph.
- 'mem0RememberTool': For storing information in memory.
- 'mem0MemorizeTool': For memorizing information.
- 'rerankTool': For re-ranking search results.
- 'stockPriceTool': For fetching stock prices.
- 'weatherTool': For fetching weather information.
- 'vectorQueryTool': For performing semantic searches and retrieving relevant information from vector databases.
- 'hybridVectorSearchTool': For performing hybrid searches combining keyword and vector search.

BEHAVIORAL GUIDELINES:
- **Communication Style**: Be clear, concise, professional, and actionable. When debugging, adopt an empathetic and diagnostic tone, guiding the user through the problem-solving process.
- **Decision-Making Framework**: Prioritize understanding the user's core problem. Validate all inputs rigorously. Select and apply the most appropriate tool(s) for the request. If a request is ambiguous, proactively ask clarifying questions.
- **Error Handling**: Handle all errors gracefully. Provide detailed, diagnostic feedback that explains what went wrong, why, and suggests actionable next steps or alternative approaches. Do not expose internal system errors directly to the user.
- **Logging**: Log all actions, tool usages, and significant decisions for internal debugging and auditing purposes.

CONSTRAINTS & BOUNDARIES:
- **Tool Reliance**: You must exclusively use the provided tools and capabilities. Do not attempt to perform actions or provide information outside the scope of these tools.
- **Data Integrity**: Ensure all operations respect data integrity and security protocols.
- **Out-of-Scope**: Do not engage in speculative reasoning, provide medical/legal advice, or perform actions that could compromise system security or user privacy.

SUCCESS CRITERIA:
- **Accuracy & Completeness**: Responses are factually correct, comprehensive, and directly address the user's request.
- **Actionability**: Solutions and debugging steps are clear, practical, and lead to problem resolution or task completion.
- **Efficiency**: Tasks are completed and problems are diagnosed in a timely and resource-effective manner.
- **User Satisfaction**: The user's problem is resolved, their question is answered, and they feel effectively supported.
${UPSTASH_PROMPT}
`;
  },
  model: createGemini25Provider('gemini-2.5-flash-lite-preview-06-17', {
    // Response modalities - what types of content the model can generate
    responseModalities: ["TEXT"], // Can also include "IMAGE" for image generation
    // Thinking configuration for enhanced reasoning
    thinkingConfig: {
      thinkingBudget: -1, // -1 = dynamic budget, 0 = disabled, 1-24576 = fixed budget
      includeThoughts: true, // Include reasoning process in response for debugging
    },
    // Search grounding for real-time information access
    useSearchGrounding: true, // Enable Google Search integration for current events
    // Dynamic retrieval configuration
    dynamicRetrieval: true, // Let model decide when to use search grounding
    // Safety settings level
    safetyLevel: 'OFF', // Options: 'STRICT', 'MODERATE', 'PERMISSIVE', 'OFF'
    // Structured outputs for better tool integration
    structuredOutputs: true, // Enable structured JSON responses
    // Cached content for cost optimization (if you have cached content)
    // cachedContent: 'your-cache-id', // Uncomment if using explicit caching
    // Langfuse tracing configuration
  }),
  tools: {
    graphRAGTool,
    graphRAGQueryTool,
    graphRAGUpsertTool,
    mem0RememberTool,
    mem0MemorizeTool,
    chunkerTool,
    vectorQueryTool,
    hybridVectorSearchTool,
    weatherTool,
    stockPriceTool,
    braveSearchTool: createBraveSearchTool(),
    tavilySearchTool: createTavilySearchTool(),
    codeSearchTool,
    webScraperTool,
    gitOperationsTool,
  },
  memory: upstashMemory,
  evals: {
    toneConsistency: new ToneConsistencyMetric(),
    keywordCoverage: new KeywordCoverageMetric(),
    completeness: new CompletenessMetric(),
    contentSimilarity: new ContentSimilarityMetric(),
    textualDifference: new TextualDifferenceMetric(),
//    customEval: new CustomEvalMetric(createGemini25Provider('gemini-2.5-flash-preview-05-20', {
//      thinkingConfig: {
//        thinkingBudget: 0,
//        includeThoughts: false,
//      },
//    })),
  },
});

/**
 * Example: How to use the Master Agent with advanced Gemini 2.5 features
 *
 * @example Basic usage with thinking:
 * ```typescript
 * const result = await masterAgent.generate('Analyze this complex problem...', {
 *   resourceId: 'user-123',
 *   threadId: 'thread-456'
 * });
 * ```
 *
 * @example Using correct AI SDK pattern for thinking config:
 * ```typescript
 * import { generateText } from 'ai';
 * import { createGemini25Provider } from '../config/googleProvider';
 *
 * const result = await generateText({
 *   model: createGemini25Provider('gemini-2.5-flash-lite-preview-06-17'),
 *   providerOptions: {
 *     google: {
 *       // Thinking configuration (correct AI SDK pattern)
 *       thinkingConfig: {
 *         thinkingBudget: 2048 // 0=disabled, -1=dynamic, 1-24576=fixed
 *       },
 *       // Response modalities
 *       responseModalities: ['TEXT', 'IMAGE']
 *     }
 *   },
 *   prompt: 'Think step by step about quantum computing...'
 * });
 * ```
 *
 * @example With search grounding and caching:
 * ```typescript
 * const result = await generateText({
 *   model: createGemini25Provider('gemini-2.5-flash-lite-preview-06-17', {
 *     useSearchGrounding: true,
 *     dynamicRetrieval: true,
 *     cachedContent: 'your-cache-id',
 *     safetyLevel: 'PERMISSIVE' // Less restrictive for research
 *   }),
 *   providerOptions: {
 *     google: {
 *       thinkingConfig: { thinkingBudget: 4096 }
 *     }
 *   },
 *   prompt: 'What are the latest developments in AI this week?'
 * });
 * ```
 *
 * @example Using Langfuse tracing (automatic via Mastra telemetry):
 * ```typescript
 * // Tracing is automatically enabled via Mastra's telemetry configuration
 * // All agent operations will be traced to Langfuse with detailed metadata
 *
 * // For custom tracing metadata, you can use:
 * import { createTracedGoogleModel, createTracedAgentMetadata } from '../config/langfuseProvider';
 *
 * const tracedModel = createTracedGoogleModel('gemini-2.5-flash-lite-preview-06-17', {
 *   traceName: 'master-agent-complex-reasoning',
 *   tags: ['master', 'reasoning', 'complex', 'multi-step'],
 *   metadata: {
 *     userId: 'user-123',
 *     sessionId: 'session-456',
 *     complexity: 'high',
 *     domain: 'general'
 *   },
 *   thinkingConfig: { thinkingBudget: 8192, includeThoughts: true },
 *   useSearchGrounding: true,
 *   safetyLevel: 'MODERATE'
 * });
 *
 * // Agent metadata for detailed tracing
 * const agentMetadata = createTracedAgentMetadata('master', 'generate', {
 *   userId: 'user-123',
 *   sessionId: 'session-456',
 *   modelId: 'gemini-2.5-flash-lite-preview-06-17',
 *   toolsUsed: ['mcp-tool-1', 'mcp-tool-2']
 * });
 * ```
 *
 * @example Safety levels configuration:
 * ```typescript
 * // STRICT: Blocks low-level harmful content and above
 * const strictModel = createGemini25Provider('gemini-2.5-flash-lite-preview-06-17', {
 *   safetyLevel: 'STRICT'
 * });
 *
 * // MODERATE: Blocks medium-level harmful content and above (default)
 * const moderateModel = createGemini25Provider('gemini-2.5-flash-lite-preview-06-17', {
 *   safetyLevel: 'MODERATE'
 * });
 *
 * // PERMISSIVE: Only blocks high-level harmful content
 * const permissiveModel = createGemini25Provider('gemini-2.5-flash-lite-preview-06-17', {
 *   safetyLevel: 'PERMISSIVE'
 * });
 *
 * // OFF: Disables all safety filters (use with caution!)
 * const unrestrictedModel = createGemini25Provider('gemini-2.5-flash-lite-preview-06-17', {
 *   safetyLevel: 'OFF' // ⚠️ No content filtering - use responsibly
 * });
 * ```
 *
 * @example File input support:
 * ```typescript
 * const result = await generateText({
 *   model: createGemini25Provider('gemini-2.5-flash-lite-preview-06-17'),
 *   messages: [{
 *     role: 'user',
 *     content: [
 *       { type: 'text', text: 'Analyze this document:' },
 *       {
 *         type: 'file',
 *         data: fs.readFileSync('./document.pdf'),
 *         mimeType: 'application/pdf'
 *       }
 *     ]
 *   }]
 * });
 * ```
 */

/**
 * Validate input data against master agent schema
 * @param input - Raw input data to validate
 * @returns Validated input data
 * @throws ZodError if validation fails
 */
export function validateMasterAgentInput(input: unknown): z.infer<typeof masterAgentInputSchema> {
  try {
    return masterAgentInputSchema.parse(input);
  } catch (error) {
    logger.error(`Master agent input validation failed: ${error}`);
    throw error;
  }
}

/**
 * Validate output data against master agent schema
 * @param output - Raw output data to validate
 * @returns Validated output data
 * @throws ZodError if validation fails
 */
export function validateMasterAgentOutput(output: unknown): z.infer<typeof masterAgentOutputSchema> {
  try {
    return masterAgentOutputSchema.parse(output);
  } catch (error) {
    logger.error(`Master agent output validation failed: ${error}`);
    throw error;
  }
}

// Export schemas for use in other parts of the application
export { masterAgentInputSchema, masterAgentOutputSchema, masterAgentConfigSchema };

