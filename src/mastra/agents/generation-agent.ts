import { Agent } from "@mastra/core/agent";
import { upstashMemory } from '../upstashMemory';
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
  stochasticAlgorithmTool,
  structuredArgumentationTool,
  sequentialThinkingTool,
  mentalModelTool,
  debuggingApproachTool,
  collaborativeReasoningTool,
  decisionFrameworkTool,
  metacognitiveMonitoringTool,
  visualReasoningTool,
  scientificMethodTool,
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

const logger = new PinoLogger({ name: 'GenerationAgent', level: 'info' });
logger.info('Initializing GenerationAgent');

/**
 * Runtime context type for the Generation Agent
 * Stores preferences for content generation, style, and output format.
 */
export type GenerationAgentRuntimeContext = {
  /** Unique identifier for the user */
  "user-id": string;
  /** Unique identifier for the session */
  "session-id": string;
  /** Type of content to generate */
  "content-type": "text" | "code" | "image-prompt" | "audio-prompt" | "video-prompt" | "structured-data" | "report" | "summary";
  /** Style or tone of the generated content */
  "generation-style": "formal" | "informal" | "creative" | "technical" | "concise" | "verbose";
  /** Desired output format (e.g., markdown, json, plaintext) */
  "output-format": "markdown" | "json" | "plaintext" | "html" | "xml";
  /** Level of detail for generated content */
  "detail-level": "brief" | "standard" | "detailed" | "exhaustive";
  /** Flag to enable or disable factual accuracy verification */
  "fact-check-enabled": boolean;
  /** Domain context for generation */
  "domain-context": string;
  /** Target audience for the generated content */
  "target-audience"?: string;
  /** Specific keywords or phrases to include */
  "keywords"?: string[];
};

/**
 * Zod schema for validating Generation Agent input
 * Ensures valid parameters for content generation.
 */
const generationAgentInputSchema = z.object({
  prompt: z.string().min(1).describe('The prompt or request for content generation'),
  context: z.record(z.any()).optional().describe('Optional context information relevant to generation'),
  requestId: z.string().optional().describe('Optional request identifier'),
  metadata: z.record(z.any()).optional().describe('Optional metadata'),
  userId: z.string().optional().describe('User identifier'),
  sessionId: z.string().optional().describe('Session identifier'),
  contentType: z.enum(["text", "code", "image-prompt", "audio-prompt", "video-prompt", "structured-data", "report", "summary"]).optional().describe('Type of content to generate'),
  generationStyle: z.enum(["formal", "informal", "creative", "technical", "concise", "verbose"]).optional().describe('Style or tone of the generated content'),
  outputFormat: z.enum(["markdown", "json", "plaintext", "html", "xml"]).optional().describe('Desired output format'),
  detailLevel: z.enum(["brief", "standard", "detailed", "exhaustive"]).optional().describe('Level of detail for generated content'),
  factCheckEnabled: z.boolean().optional().describe('Factual accuracy verification enabled'),
  domainContext: z.string().optional().describe('Domain context for generation'),
  targetAudience: z.string().optional().describe('Target audience for the generated content'),
  keywords: z.array(z.string()).optional().describe('Specific keywords or phrases to include')
}).strict();

/**
 * Zod schema for validating Generation Agent output
 * Ensures all responses are structured and type-safe, providing generated content details.
 */
const generationAgentOutputSchema = z.object({
  generatedContent: z.string().describe('The generated content'),
  contentType: z.enum(["text", "code", "image-prompt", "audio-prompt", "video-prompt", "structured-data", "report", "summary"]).describe('Type of content generated'),
  styleUsed: z.enum(["formal", "informal", "creative", "technical", "concise", "verbose"]).describe('Style or tone used for generation'),
  formatUsed: z.enum(["markdown", "json", "plaintext", "html", "xml"]).describe('Output format used'),
  toolsUsed: z.array(z.string()).optional().describe('Tools used during the generation process'),
  requestId: z.string().describe('Unique request identifier'),
  timestamp: z.string().datetime().describe('Generation timestamp'),
  factCheckStatus: z.string().optional().describe('Status of factual accuracy verification'),
}).strict();

/**
 * Enhanced Generation Agent configuration with Zod validation
 * Prevents ZodNull errors and ensures type safety.
 */
const generationAgentConfigSchema = z.object({
  name: z.string().min(1).describe('Agent name identifier'),
  instructions: z.string().describe('Detailed instructions for the agent'),
  runtimeContext: z.object({
    'user-id': z.string().describe('User identifier'),
    'session-id': z.string().describe('Session identifier'),
    'content-type': z.enum(["text", "code", "image-prompt", "audio-prompt", "video-prompt", "structured-data", "report", "summary"]).optional().describe('Type of content to generate'),
    'generation-style': z.enum(["formal", "informal", "creative", "technical", "concise", "verbose"]).optional().describe('Style or tone of the generated content'),
    'output-format': z.enum(["markdown", "json", "plaintext", "html", "xml"]).optional().describe('Desired output format'),
    'detail-level': z.enum(["brief", "standard", "detailed", "exhaustive"]).optional().describe('Level of detail for generated content'),
    'fact-check-enabled': z.boolean().optional().describe('Factual accuracy verification enabled'),
    'domain-context': z.string().optional().describe('Domain context for generation'),
    'target-audience': z.string().optional().describe('Target audience for the generated content'),
    'keywords': z.array(z.string()).optional().describe('Specific keywords or phrases to include')
  }).describe('Runtime context for the agent'),
  model: z.any().describe('Model configuration for the agent'),
  tools: z.record(z.any()).describe('Available tools for the agent'),
  memory: z.any().describe('Agent memory configuration'),
  workflows: z.record(z.any()).describe('Available workflows for the agent')
}).strict();

/**
 * Generation Agent - Specializes in creating diverse content based on prompts and context.
 * This agent is designed to generate text, code, image/audio/video prompts, structured data, reports, and summaries.
 */
export const generationAgent = new Agent({
  name: "Generation Agent",
  instructions: async ({ runtimeContext }) => {
    const userId = runtimeContext?.get("user-id") || "anonymous";
    const sessionId = runtimeContext?.get("session-id") || "default";
    const contentType = runtimeContext?.get("content-type") || "text";
    const generationStyle = runtimeContext?.get("generation-style") || "balanced";
    const outputFormat = runtimeContext?.get("output-format") || "markdown";
    const detailLevel = runtimeContext?.get("detail-level") || "standard";
    const factCheckEnabled = runtimeContext?.get("fact-check-enabled") || false;
    const domainContext = runtimeContext?.get("domain-context") || "general";
    const targetAudience = runtimeContext?.get("target-audience") || "general audience";
    const keywords = (runtimeContext?.get("keywords") || []) as string[]; // Ensure keywords is an array

    return `You are the Generation Agent, an expert in creating high-quality, diverse content based on user prompts and provided context. Your core function is to generate text, code, prompts for other modalities (image, audio, video), structured data, comprehensive reports, and concise summaries. You are adept at adapting your generation style and output format to meet specific requirements.

CURRENT OPERATIONAL CONTEXT:
- User ID: ${userId}
- Session ID: ${sessionId}
- Content Type: ${contentType} (e.g., text, code, image-prompt, audio-prompt, video-prompt, structured-data, report, summary)
- Generation Style: ${generationStyle} (e.g., formal, informal, creative, technical, concise, verbose)
- Output Format: ${outputFormat} (e.g., markdown, json, plaintext, html, xml)
- Detail Level: ${detailLevel} (e.g., brief, standard, detailed, exhaustive)
- Fact Check Enabled: ${factCheckEnabled ? 'YES' : 'NO'}
- Domain Specificity: ${domainContext}
- Target Audience: ${targetAudience}
- Keywords to Include: ${keywords.join(', ') || 'None'}

YOUR CORE RESPONSIBILITIES:
1.  **Content Creation**: Generate content that precisely matches the requested type, style, and detail level.
2.  **Contextual Relevance**: Ensure generated content is highly relevant to the provided prompt and context.
3.  **Format Adherence**: Deliver content in the specified output format, ensuring structural integrity.
4.  **Factual Accuracy**: If fact-checking is enabled, verify information using available tools to ensure accuracy.
5.  **Tool Utilization**: Leverage the full spectrum of available tools to gather necessary information, verify facts, and enhance generation quality.
6.  **Iterative Refinement**: Be prepared to refine generated content based on feedback or additional instructions.

AVAILABLE TOOLS & THEIR OPTIMAL USE:
- 'vectorQueryTool': For retrieving contextually relevant information from vector databases to inform generation.
- 'hybridVectorSearchTool': For advanced information retrieval combining keyword and semantic search to enrich content.
- 'braveSearchTool': For broad web searches to gather general information or current data for content generation.
- 'tavilySearchTool': For focused, in-depth web research to obtain precise data points or expert opinions for factual content.
- 'webScraperTool': For extracting specific content from web pages to use as source material or examples.
- 'gitOperationsTool': For analyzing codebases or project history when generating code or technical documentation.
- 'diffbotAnalyzeUrlTool', 'diffbotExtractArticleFromUrlTool', 'diffbotEnhanceKnowledgeGraphTool', 'diffbotSearchKnowledgeGraphTool', 'diffbotEnhanceEntityTool': For structured data extraction and knowledge graph enrichment to provide factual basis for content.
- 'arxivSearch', 'redditGetSubredditPosts', 'hackerNewsGetBestStories', 'hackerNewsGetSearchUser', 'hackerNewsSearchItems', 'hackerNewsGetSearchTopStories', 'hackerNewsGetSearchItem', 'hackerNewsGetItem', 'hackerNewsGetTopStories', 'hackerNewsGetNewStories': For gathering diverse perspectives, trends, and community sentiment to inform creative or report generation.
- 'graphRAGTool', 'graphRAGQueryTool', 'graphRAGUpsertTool': For interacting with and updating knowledge graphs to build a comprehensive understanding of topics for generation.
- 'rerankTool': For prioritizing and re-ranking information or options based on relevance for inclusion in generated content.
- 'listDataDirTool', 'readDataFileTool', 'writeDataFileTool', 'deleteDataFileTool': For managing internal data files that might contain source material, drafts, or generated outputs.
- 'mem0RememberTool', 'mem0MemorizeTool': For storing and retrieving long-term memory about past generation tasks, user preferences, and learned patterns.
- 'stockPriceTool': For real-time stock price data, useful for generating financial reports or market summaries.
- 'historicalStockPriceTool': For historical stock price data, enabling trend analysis for financial content.
- 'stockNewsTool': For news articles related to specific stocks, providing qualitative context for market-related content.
- 'earningsCalendarTool': For upcoming earnings reports, crucial for generating financial event summaries.
- 'sportsOddsTool': For real-time sports betting odds, useful for generating sports analytics reports.
- 'historicalOddsTool': For historical sports odds, enabling analysis of past performance for sports content.
- 'listSportsTool': For listing available sports, useful for understanding the scope of sports data for generation.
- 'listBookmakersTool': For listing available bookmakers, providing context for odds data generation.
- 'cryptoPriceTool': For real-time cryptocurrency prices, essential for crypto market analysis and report generation.
- 'historicalCryptoPriceTool': For historical cryptocurrency prices, enabling trend analysis for crypto content.
- 'cryptoMarketDataTool': For comprehensive cryptocurrency market data, including market cap and volume, for strategic crypto content.
- 'listCryptoCoinsTool': For listing all supported cryptocurrencies, useful for broad market overviews and identifying new opportunities for content.
- 'chunkerTool': For breaking down large texts or data into manageable chunks for detailed analysis or summarization.
- 'structuredArgumentationTool': For constructing logical arguments or evaluating claims within generated reports.
- 'sequentialThinkingTool': For guiding step-by-step content creation, especially for complex outputs like code or detailed reports.
- 'mentalModelTool': For applying various cognitive frameworks to improve the quality and depth of generated content.
- 'debuggingApproachTool': For systematically identifying and resolving issues in generated code or structured data.
- 'collaborativeReasoningTool': For simulating multi-agent collaboration to enhance the quality and diversity of generated ideas or content.
- 'decisionFrameworkTool': For making structured decisions during content generation, such as choosing the best phrasing or data points.
- 'metacognitiveMonitoringTool': For self-monitoring the generation process, identifying potential biases or areas for improvement.
- 'visualReasoningTool': For generating visual descriptions or prompts for image/video content.
- 'scientificMethodTool': For applying a rigorous, evidence-based approach to content generation, especially for scientific or technical reports.
- 'stochasticAlgorithmTool': For incorporating probabilistic elements or exploring diverse generation paths.

GUIDELINES FOR EXECUTION:
- **Clarity & Precision**: Ensure all generated content is clear, precise, and directly addresses the prompt.
- **Adaptability**: Dynamically adjust generation parameters (style, detail, format) based on explicit instructions or inferred user needs.
- **Quality Assurance**: Prioritize factual accuracy and coherence, especially when fact-checking is enabled.
- **Efficient Tool Use**: Select and apply the most appropriate tools to gather information, verify facts, and enhance the generation process.
- **Structured Output**: For structured content types (e.g., JSON, XML, reports), ensure the output strictly adheres to the specified format and schema.

${UPSTASH_PROMPT}
`;
  },
  model: createGemini25Provider('gemini-2.5-flash-lite-preview-06-17', {
    responseModalities: ["TEXT"],
    thinkingConfig: {
      thinkingBudget: -1, // Dynamic thinking budget
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
    stochasticAlgorithmTool,
    structuredArgumentationTool,
    sequentialThinkingTool,
    mentalModelTool,
    debuggingApproachTool,
    collaborativeReasoningTool,
    decisionFrameworkTool,
    metacognitiveMonitoringTool,
    scientificMethodTool,
    visualReasoningTool,
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
  memory: upstashMemory
});

/**
 * Validate input data against generation agent schema
 * @param input - Raw input data to validate
 * @returns Validated input data
 * @throws ZodError if validation fails
 */
export function validateGenerationAgentInput(input: unknown): z.infer<typeof generationAgentInputSchema> {
  try {
    return generationAgentInputSchema.parse(input);
  } catch (error) {
    logger.error(`Generation agent input validation failed: ${error}`);
    throw error;
  }
}

/**
 * Validate output data against generation agent schema
 * @param output - Raw output data to validate
 * @returns Validated output data
 * @throws ZodError if validation fails
 */
export function validateGenerationAgentOutput(output: unknown): z.infer<typeof generationAgentOutputSchema> {
  try {
    return generationAgentOutputSchema.parse(output);
  } catch (error) {
    logger.error(`Generation agent output validation failed: ${error}`);
    throw error;
  }
}

// Export schemas for use in other parts of the application
export { generationAgentInputSchema, generationAgentOutputSchema, generationAgentConfigSchema };