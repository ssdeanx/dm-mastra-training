import { Agent } from "@mastra/core/agent";
import { upstashMemory } from '../upstashMemory';
import { graphRAGTool } from '../tools/graphRAG';
import { vectorQueryTool } from "../tools/vectorQueryTool";
import { chunkerTool } from "../tools/chunker-tool";
import { createGemini25Provider } from '../config/googleProvider';
import { PinoLogger } from "@mastra/loggers";
import { z } from 'zod';
import { UPSTASH_PROMPT } from "@mastra/upstash";
import { createBraveSearchTool, createTavilySearchTool, codeSearchTool, webScraperTool, gitOperationsTool, diffbotAnalyzeUrlTool, diffbotExtractArticleFromUrlTool, diffbotEnhanceKnowledgeGraphTool, diffbotSearchKnowledgeGraphTool, diffbotEnhanceEntityTool } from "../tools";


/**
 * Runtime context type for the Research Agent
 * Stores research preferences and source filtering context
 *
 * @mastra ResearchAgent runtime context interface
 * [EDIT: 2025-06-14] [BY: GitHub Copilot]
 */
export type ResearchAgentRuntimeContext = {
  /** Unique identifier for the user */
  "user-id": string;
  /** Unique identifier for the session */
  "session-id": string;
  /** Research depth level */
  "research-depth": "surface" | "detailed" | "comprehensive";
  /** Source types to include */
  "source-types": string[];
  /** Maximum sources to gather */
  "max-sources": number;
  /** Include academic sources */
  "include-academic": boolean;
  /** Language preferences for sources */
  "language-filter": string[];
  /** Research focus area */
  "focus-area": string;
  /** Confidence score of the input data, influencing analysis rigor and bias mitigation */
  "input-confidence": number;
  /** Flag to enable or disable bias mitigation strategies during analysis */
  "bias-mitigation-enabled": boolean;
  /** Strategy for handling low-confidence data */
  "low-confidence-strategy": "flag" | "verify" | "discard";
};

const logger = new PinoLogger({ name: 'ResearchAgent', level: 'info' });
logger.info('Initializing ResearchAgent');

const researchAgentInputSchema = z.object({
  query: z.string().min(1).describe("Research query or topic"),
  depth: z.enum(["surface", "detailed", "comprehensive"]).optional(),
  sources: z.array(z.string()).optional(),
  maxResults: z.number().positive().optional(),
});

const researchAgentOutputSchema = z.object({
  findings: z.string().describe("Research findings and insights"),
  sources: z.array(z.string()).describe("Sources used in research"),
  confidence: z.number().min(0).max(1).describe("Confidence score"),
  methodology: z.string().describe("Research methodology used"),
});

/**
 * Enhanced Research Agent configuration with Zod validation
 * Prevents ZodNull errors and ensures type safety
 */
const researchAgentConfigSchema = z.object({
  name: z.string().min(1).describe('Agent name identifier'),
  instructions: z.string().describe('Detailed instructions for the agent'),
  runtimeContext: z.object({
    'user-id': z.string().describe('User identifier'),
    'session-id': z.string().describe('Session identifier'),
    'research-depth': z.enum(["surface", "detailed", "comprehensive"]).describe('Research depth level'),
    'source-types': z.array(z.string()).describe('Source types to include'),
    'max-sources': z.number().positive().describe('Maximum sources to gather'),
    'include-academic': z.boolean().describe('Include academic sources'),
    'language-filter': z.array(z.string()).describe('Language preferences for sources'),
    'focus-area': z.string().describe('Research focus area'),
    'input-confidence': z.number().min(0).max(1).describe('Confidence score of the input data'),
    'bias-mitigation-enabled': z.boolean().describe('Enable or disable bias mitigation strategies'),
    'low-confidence-strategy': z.enum(["flag", "verify", "discard"]).describe('Strategy for handling low-confidence data')
  }).describe('Runtime context for the agent'),
  model: z.any().describe('Model configuration for the agent'),
  evals: z.record(z.any()).describe('Evaluation metrics for the agent'),
  tools: z.record(z.any()).describe('Available tools for the agent'),
  memory: z.any().describe('Agent memory configuration'),
  workflows: z.record(z.any()).describe('Available workflows for the agent')
}).strict();


logger.info('Initializing researchAgent');

/**
 * Research agent for information gathering, analysis, and knowledge synthesis
 * Specializes in comprehensive research, fact-checking, and insight generation
 */
export const researchAgent = new Agent({
  name: "Research Agent",
  instructions: async ({ runtimeContext }) => {
    const userId = runtimeContext?.get("user-id") || "anonymous";
    const sessionId = runtimeContext?.get("session-id") || "default";
    const researchDepth = runtimeContext?.get("research-depth") || "detailed";    const sourceTypes = (runtimeContext?.get("source-types") as string[]) || ["web", "academic"];
    const maxSources = runtimeContext?.get("max-sources") || 10;
    const includeAcademic = runtimeContext?.get("include-academic") || false;
    const languageFilter = (runtimeContext?.get("language-filter") as string[]) || ["en"];
    const focusArea = runtimeContext?.get("focus-area") || "general";
    const inputConfidence = runtimeContext?.get("input-confidence") || 1.0;
    const biasMitigationEnabled = runtimeContext?.get("bias-mitigation-enabled") || false;
    const lowConfidenceStrategy = runtimeContext?.get("low-confidence-strategy") || "flag";

    return `You are a highly specialized Research Agent, adept at comprehensive information gathering, rigorous fact-checking, and insightful knowledge synthesis. Your expertise encompasses diverse research methodologies, advanced information retrieval techniques, and critical analysis skills. You are proficient in acquiring data from various sources, validating facts, and transforming complex information into actionable insights.

CURRENT OPERATIONAL CONTEXT:
- User ID: ${userId}
- Session ID: ${sessionId}
- Research Depth: ${researchDepth} (e.g., surface, detailed, comprehensive)
- Source Types: ${sourceTypes.join(', ')}
- Maximum Sources: ${maxSources}
- Include Academic Sources: ${includeAcademic ? 'YES' : 'NO'}
- Language Filter: ${languageFilter.join(', ')}
- Focus Area: ${focusArea}
- Input Confidence: ${inputConfidence}
- Bias Mitigation Enabled: ${biasMitigationEnabled ? 'YES' : 'NO'}
- Low Confidence Strategy: ${lowConfidenceStrategy}

YOUR CORE RESPONSIBILITIES:
1.  **Information Gathering**: Systematically collect data from a wide array of reliable sources.
2.  **Fact-Checking & Verification**: Rigorously verify information and cross-reference facts to ensure accuracy.
3.  **Analysis & Synthesis**: Analyze gathered data, identify patterns, and synthesize complex information into clear, concise insights.
4.  **Reporting**: Present research findings logically, citing all sources and outlining the methodology.

AVAILABLE TOOLS & THEIR OPTIMAL USE:
- 'graphRAGTool': For interacting with the knowledge graph, including querying and managing graph data.
- 'vectorQueryTool': For performing semantic searches and retrieving relevant information from vector databases.
- 'chunkerTool': For breaking down large texts or data into smaller, manageable chunks for efficient processing.
- 'braveSearchTool': For broad web searches, current events, and general information gathering from the internet.
- 'tavilySearchTool': For focused, in-depth web research, especially when precise answers or specific articles are required.
- 'diffbotAnalyzeUrlTool': For analyzing and extracting structured data from web pages.
- 'diffbotExtractArticleFromUrlTool': For extracting clean article content from web pages.
- 'diffbotEnhanceEntityTool': For enriching information about entities (persons, organizations) using Diffbot Knowledge Graph.
- 'diffbotSearchKnowledgeGraphTool': For searching the Diffbot Knowledge Graph.
- 'diffbotEnhanceKnowledgeGraphTool': For enhancing entities within the Diffbot Knowledge Graph.
- 'codeSearchTool': For searching codebases and understanding software implementations.
- 'webScraperTool': For extracting content directly from specified web pages when a URL is provided.
- 'gitOperationsTool': For interacting with Git repositories, such as cloning, pulling, or analyzing codebases.
- 'readDataFileTool': To read the content of a specified file.
- 'writeDataFileTool': To write content to a specified file.
- 'deleteDataFileTool': To delete a specified file.
- 'listDataDirTool': To list the contents of a specified directory.
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
- 'mem0RememberTool': For storing information in memory.
- 'mem0MemorizeTool': For memorizing information.
- 'rerankTool': For re-ranking search results.
- 'stockPriceTool': For fetching stock prices.
- 'weatherTool': For fetching weather information.

GUIDELINES FOR EXECUTION:
- **Multi-Source Approach**: Always gather information from multiple reliable sources to ensure comprehensive coverage.
- **Critical Evaluation**: Verify facts and cross-reference information to ensure accuracy and objectivity.
- **Structured Findings**: Present research findings logically and clearly, identifying any knowledge gaps or areas for further investigation.
- **Actionable Insights**: Synthesize complex information into clear, actionable insights that directly address the research query.
- **Methodology**: Be prepared to describe the research methodology and approach used.

${UPSTASH_PROMPT}
`;
  },
  model: createGemini25Provider('gemini-2.5-flash',  {
    responseModalities: ["TEXT"],
    thinkingConfig: {
      thinkingBudget: 0, // -1 means dynamic thinking budget
      includeThoughts: false, // Include thoughts for debugging and monitoring purposes
    },
  }),
  tools: {
    graphRAGTool,
    vectorQueryTool,
    chunkerTool,
    braveSearchTool: createBraveSearchTool(),
    tavilySearchTool: createTavilySearchTool(),
    diffbotAnalyzeUrlTool,
    diffbotExtractArticleFromUrlTool,
    diffbotEnhanceKnowledgeGraphTool,
    diffbotSearchKnowledgeGraphTool,
    diffbotEnhanceEntityTool,
    // Spread Diffbot tools here so each is a top-level tool
    codeSearchTool,
    webScraperTool,
    gitOperationsTool,
  },
  memory: upstashMemory,
});

/**
 * Validation functions for research agent operations
 * @mastra ResearchAgent validation functions with error handling
 */
export function validateResearchInput(input: unknown): z.infer<typeof researchAgentInputSchema> {
  try {
    return researchAgentInputSchema.parse(input);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Invalid research agent input', {
      error: errorMessage,
      input: JSON.stringify(input, null, 2)
    });
    throw error;
  }
}

export function validateResearchOutput(output: unknown): z.infer<typeof researchAgentOutputSchema> {
  try {
    return researchAgentOutputSchema.parse(output);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Invalid research agent output', { 
      error: errorMessage, 
      output: JSON.stringify(output, null, 2)
    });
    throw error;
  }
}

function validateResearchAgentConfig(config: unknown): z.infer<typeof researchAgentConfigSchema> {
  try {
    return researchAgentConfigSchema.parse(config);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Invalid research agent config', { 
      error: errorMessage, 
      config: JSON.stringify(config, null, 2)
    });
    throw error;
  }
}

export { researchAgentInputSchema, researchAgentOutputSchema, researchAgentConfigSchema, validateResearchAgentConfig };