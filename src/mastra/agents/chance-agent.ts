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
  weatherTool
} from "../tools";

const logger = new PinoLogger({ name: 'ChanceAgent', level: 'info' });
logger.info('Initializing ChanceAgent');

/**
 * Runtime context type for the Chance Agent
 * Stores preferences for decision-making under uncertainty, balancing exploration and exploitation.
 */
export type ChanceAgentRuntimeContext = {
  /** Unique identifier for the user */
  "user-id": string;
  /** Unique identifier for the session */
  "session-id": string;
  /** Type of decision to be made */
  "decision-type": "strategic" | "tactical" | "operational" | "exploratory";
  /** Tolerance for risk in decision-making */
  "risk-tolerance": "low" | "medium" | "high" | "adaptive";
  /** Balance between exploring new options and exploiting known good options */
  "exploration-exploitation-balance": "explore-heavy" | "balanced" | "exploit-heavy";
  /** Mechanism for incorporating feedback from past outcomes */
  "outcome-feedback-mechanism": "reinforcement" | "bayesian-update" | "statistical-adjustment" | "none";
  /** Confidence threshold for making a definitive decision */
  "confidence-threshold": number; // 0.0 to 1.0
  /** Flag to enable or disable awareness and mitigation of cognitive biases */
  "bias-awareness-enabled": boolean;
  /** Domain context for decision-making */
  "domain-context": string;
};

/**
 * Zod schema for validating Chance Agent input
 * Ensures only valid operations and parameters are accepted for decision-making.
 */
const chanceAgentInputSchema = z.object({
  query: z.string().min(1).describe('The decision problem or question for the chance agent'),
  options: z.array(z.string()).min(1).describe('A list of possible options or actions to choose from'),
  context: z.record(z.any()).optional().describe('Optional context information relevant to the decision'),
  requestId: z.string().optional().describe('Optional request identifier'),
  metadata: z.record(z.any()).optional().describe('Optional metadata'),
  userId: z.string().optional().describe('User identifier'),
  sessionId: z.string().optional().describe('Session identifier'),
  decisionType: z.enum(["strategic", "tactical", "operational", "exploratory"]).optional().describe('Type of decision'),
  riskTolerance: z.enum(["low", "medium", "high", "adaptive"]).optional().describe('Tolerance for risk'),
  explorationExploitationBalance: z.enum(["explore-heavy", "balanced", "exploit-heavy"]).optional().describe('Exploration vs. exploitation balance'),
  outcomeFeedbackMechanism: z.enum(["reinforcement", "bayesian-update", "statistical-adjustment", "none"]).optional().describe('Outcome feedback mechanism'),
  confidenceThreshold: z.number().min(0).max(1).optional().describe('Confidence threshold for decision'),
  biasAwarenessEnabled: z.boolean().optional().describe('Bias awareness enabled'),
  domainContext: z.string().optional().describe('Domain context for decision-making'),
}).strict();

/**
 * Zod schema for validating Chance Agent output
 * Ensures all responses are structured and type-safe, providing decision details.
 */
const chanceAgentOutputSchema = z.object({
  decision: z.string().describe('The chosen option or action'),
  rationale: z.string().describe('Detailed explanation for the chosen decision'),
  expectedOutcome: z.string().optional().describe('Predicted outcome of the decision'),
  riskAssessment: z.string().optional().describe('Assessment of risks associated with the decision'),
  confidence: z.number().min(0).max(1).describe('Confidence score in the chosen decision'),
  toolsUsed: z.array(z.string()).optional().describe('Tools used during the decision-making process'),
  requestId: z.string().describe('Unique request identifier'),
  timestamp: z.string().datetime().describe('Decision timestamp'),
}).strict();

/**
 * Enhanced Chance Agent configuration with Zod validation
 * Prevents ZodNull errors and ensures type safety.
 */
const chanceAgentConfigSchema = z.object({
  name: z.string().min(1).describe('Agent name identifier'),
  instructions: z.string().describe('Detailed instructions for the agent'),
  runtimeContext: z.object({
    'user-id': z.string().describe('User identifier'),
    'session-id': z.string().describe('Session identifier'),
    'decision-type': z.enum(["strategic", "tactical", "operational", "exploratory"]).describe('Type of decision'),
    'risk-tolerance': z.enum(["low", "medium", "high", "adaptive"]).describe('Tolerance for risk'),
    'exploration-exploitation-balance': z.enum(["explore-heavy", "balanced", "exploit-heavy"]).describe('Balance between exploration and exploitation'),
    'outcome-feedback-mechanism': z.enum(["reinforcement", "bayesian-update", "statistical-adjustment", "none"]).describe('Mechanism for incorporating feedback'),
    'confidence-threshold': z.number().min(0).max(1).describe('Confidence threshold for decision'),
    'bias-awareness-enabled': z.boolean().describe('Flag to enable or disable bias awareness'),
    'domain-context': z.string().describe('Domain context for decision-making'),
  }).describe('Runtime context for the agent'),
  model: z.any().describe('Model configuration for the agent'),
  tools: z.record(z.any()).describe('Available tools for the agent'),
  memory: z.any().describe('Agent memory configuration'),
  workflows: z.record(z.any()).describe('Available workflows for the agent')
}).strict();

/**
 * Chance Agent - Specializes in decision-making under uncertainty, balancing exploration and exploitation.
 * This agent is designed to assess probabilities, manage risk, and adapt its strategy based on outcomes.
 */
export const chanceAgent = new Agent({
  name: "Chance Agent",
  instructions: async ({ runtimeContext }) => {
    const userId = runtimeContext?.get("user-id") || "anonymous";
    const sessionId = runtimeContext?.get("session-id") || "default";
    const decisionType = runtimeContext?.get("decision-type") || "operational";
    const riskTolerance = runtimeContext?.get("risk-tolerance") || "medium";
    const explorationExploitationBalance = runtimeContext?.get("exploration-exploitation-balance") || "balanced";
    const outcomeFeedbackMechanism = runtimeContext?.get("outcome-feedback-mechanism") || "reinforcement";
    const confidenceThreshold = runtimeContext?.get("confidence-threshold") || 0.7;
    const biasAwarenessEnabled = runtimeContext?.get("bias-awareness-enabled") || true;
    const domainContext = runtimeContext?.get("domain-context") || "general";

    return `You are the Chance Agent, an expert in navigating uncertainty and making optimal decisions by balancing exploration and exploitation. Your core function is to analyze available options, assess probabilities, evaluate risks, and select the most advantageous path forward, continuously learning from outcomes.

CURRENT OPERATIONAL CONTEXT:
- User ID: ${userId}
- Session ID: ${sessionId}
- Decision Type: ${decisionType} (e.g., strategic, tactical, operational, exploratory)
- Risk Tolerance: ${riskTolerance} (e.g., low, medium, high, adaptive)
- Exploration-Exploitation Balance: ${explorationExploitationBalance} (e.g., explore-heavy, balanced, exploit-heavy)
- Outcome Feedback Mechanism: ${outcomeFeedbackMechanism} (e.g., reinforcement, bayesian-update, statistical-adjustment, none)
- Confidence Threshold: ${confidenceThreshold} (minimum confidence required for a definitive decision)
- Bias Awareness: ${biasAwarenessEnabled ? 'Enabled' : 'Disabled'}
- Domain Specificity: ${domainContext}

YOUR CORE RESPONSIBILITIES:
1.  **Option Evaluation**: Systematically analyze all provided options, gathering relevant data and assessing potential outcomes.
2.  **Probability & Risk Assessment**: Estimate probabilities of success and failure for each option, and quantify associated risks.
3.  **Decision Selection**: Choose the optimal option based on the defined decision type, risk tolerance, and exploration-exploitation balance.
4.  **Rationale Generation**: Provide a clear, logical rationale for the chosen decision, including expected outcomes and risk assessments.
5.  **Adaptive Learning**: Incorporate feedback from past decisions and outcomes to refine future decision-making strategies.
6.  **Bias Mitigation**: When enabled, actively identify and counteract cognitive biases that might influence decision quality.

AVAILABLE TOOLS & THEIR OPTIMAL USE:
- 'vectorQueryTool': For retrieving contextually relevant information from vector databases to inform decision-making.
- 'hybridVectorSearchTool': For advanced information retrieval combining keyword and semantic search.
- 'braveSearchTool': For broad web searches to gather general information or current data relevant to options.
- 'tavilySearchTool': For focused, in-depth web research to obtain precise data points or expert opinions.
- 'webScraperTool': For extracting specific content from web pages to get up-to-date information on options.
- 'gitOperationsTool': For analyzing codebases or project history to understand past decisions or their impacts.
- 'diffbotAnalyzeUrlTool', 'diffbotExtractArticleFromUrlTool', 'diffbotEnhanceKnowledgeGraphTool', 'diffbotSearchKnowledgeGraphTool', 'diffbotEnhanceEntityTool': For structured data extraction and knowledge graph enrichment to provide deeper context for decisions.
- 'arxivSearch', 'redditGetSubredditPosts', 'hackerNewsGetBestStories', 'hackerNewsGetSearchUser', 'hackerNewsSearchItems', 'hackerNewsGetSearchTopStories', 'hackerNewsGetSearchItem', 'hackerNewsGetItem', 'hackerNewsGetTopStories', 'hackerNewsGetNewStories': For gathering diverse perspectives, trends, and community sentiment related to decision options.
- 'graphRAGTool', 'graphRAGQueryTool', 'graphRAGUpsertTool': For interacting with and updating knowledge graphs to build a comprehensive understanding of decision landscapes.
- 'rerankTool': For prioritizing and re-ranking information or options based on relevance or potential impact.
- 'listDataDirTool', 'readDataFileTool', 'writeDataFileTool', 'deleteDataFileTool': For managing internal data files that might contain historical decision logs or relevant datasets.
- 'mem0RememberTool', 'mem0MemorizeTool': For storing and retrieving long-term memory about past decisions, their outcomes, and learned lessons.
- 'stockPriceTool', 'weatherTool': For real-time external data that might influence time-sensitive decisions.
- 'chunkerTool': For breaking down large texts or data into manageable chunks for detailed analysis.

GUIDELINES FOR EXECUTION:
- **Data-Driven Decisions**: Base all decisions on the most accurate and comprehensive data available, leveraging tools to fill information gaps.
- **Transparent Reasoning**: Clearly articulate the thought process, assumptions, and trade-offs involved in each decision.
- **Adaptive Strategy**: Continuously adjust the exploration-exploitation balance and risk tolerance based on the domain context and observed outcomes.
- **Confidence-Based Action**: Only make definitive decisions when the confidence level meets or exceeds the specified threshold. If not, flag uncertainty.
- **Learning from Experience**: Actively use the outcome feedback mechanism to improve future decision-making.
- **Bias Vigilance**: If bias awareness is enabled, actively look for and mitigate cognitive biases in data interpretation and option evaluation.

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
    hackerNewsGetBestStories
  },
  memory: upstashMemory,
});

/**
 * Validate input data against chance agent schema
 * @param input - Raw input data to validate
 * @returns Validated input data
 * @throws ZodError if validation fails
 */
export function validateChanceAgentInput(input: unknown): z.infer<typeof chanceAgentInputSchema> {
  try {
    return chanceAgentInputSchema.parse(input);
  } catch (error) {
    logger.error(`Chance agent input validation failed: ${error}`);
    throw error;
  }
}

/**
 * Validate output data against chance agent schema
 * @param output - Raw output data to validate
 * @returns Validated output data
 * @throws ZodError if validation fails
 */
export function validateChanceAgentOutput(output: unknown): z.infer<typeof chanceAgentOutputSchema> {
  try {
    return chanceAgentOutputSchema.parse(output);
  } catch (error) {
    logger.error(`Chance agent output validation failed: ${error}`);
    throw error;
  }
}

// Export schemas for use in other parts of the application
export { chanceAgentInputSchema, chanceAgentOutputSchema, chanceAgentConfigSchema };