import { Agent } from '@mastra/core/agent';
import { createGemini25Provider } from '../config/googleProvider';
import { mastraMemory } from '../upstashMemory';
import {
  createMastraLangGraphWorkflow,
  createMastraLangGraphChat
} from '../config/langchainAdapter';
import {
  graphRAGTool,
  vectorQueryTool,
  chunkerTool,
  diffbotAnalyzeUrlTool,
  diffbotEnhanceEntityTool,
  diffbotEnhanceKnowledgeGraphTool,
  diffbotExtractArticleFromUrlTool,
  diffbotSearchKnowledgeGraphTool,
  //rerankTool,
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
} from '../tools';
import { UPSTASH_PROMPT } from '@mastra/upstash';
import { PinoLogger } from "@mastra/loggers";
import { createBraveSearchTool, createTavilySearchTool } from "../tools";

const logger = new PinoLogger({ name: 'LangGraphAgent', level: 'info' });

/**
 * Runtime context type for the LangGraph Agent
 *
 * Provides configuration for LangGraph workflows and multi-step reasoning processes.
 *
 * @interface LangGraphAgentRuntimeContext
 */
export type LangGraphAgentRuntimeContext = {
  "user-id": string;
  "session-id": string;
  "workflow-mode": "sequential" | "parallel" | "conditional" | "iterative";
  "reasoning-depth": "shallow" | "moderate" | "deep" | "exhaustive";
  "step-tracking": boolean;
  "max-iterations": number;
  "domain-focus": string;
  "output-format": "structured" | "narrative" | "technical" | "summary";
};

/**
 * LangGraph Agent - Advanced Multi-Step Reasoning and Workflow Orchestration
 *
 * This agent leverages LangGraph to create sophisticated multi-step workflows
 * that can handle complex reasoning tasks, state management, and iterative processing.
 * It's designed for scenarios requiring structured thinking, multi-phase analysis,
 * and coordinated tool usage across multiple steps.
 *
 * Key Capabilities:
 * - Multi-step workflow orchestration using LangGraph
 * - State-aware reasoning across workflow nodes
 * - Dynamic workflow routing based on intermediate results
 * - Integration with Mastra's memory and tool ecosystem
 * - Advanced error handling and recovery mechanisms
 *
 * @example
 * ```typescript
 * const result = await langGraphAgent.generate({
 *   messages: [{
 *     role: 'user',
 *     content: 'Analyze this complex dataset and provide insights'
 *   }],
 *   runtimeContext: {
 *     "workflow-mode": "sequential",
 *     "reasoning-depth": "deep",
 *     "step-tracking": true
 *   }
 * });
 * ```
 *
 * [EDIT: 2025-07-07] [BY: SSD]
 */
export const langGraphAgent = new Agent({
  name: "LangGraph Agent",
  instructions: async ({ runtimeContext }) => {    const {
      "user-id": userId,
      "session-id": sessionId,
      "workflow-mode": workflowMode = "sequential",
      "reasoning-depth": reasoningDepth = "moderate",
      "step-tracking": stepTracking = true,
      "max-iterations": maxIterations = 10,
      "domain-focus": domainFocus = "general",
      "output-format": outputFormat = "structured"
    } = (runtimeContext as unknown) as LangGraphAgentRuntimeContext;

    return `You are the LangGraph Agent, a sophisticated AI system designed for advanced multi-step reasoning and complex workflow orchestration. You leverage LangGraph's state management capabilities to break down intricate problems into manageable steps, execute them systematically, and adapt dynamically.

CURRENT OPERATIONAL CONTEXT:
- User ID: ${userId}
- Session ID: ${sessionId}
- Workflow Mode: ${workflowMode} (e.g., sequential, parallel, conditional, iterative)
- Reasoning Depth: ${reasoningDepth} (e.g., shallow, moderate, deep, exhaustive)
- Step Tracking: ${stepTracking ? 'Enabled' : 'Disabled'}
- Maximum Iterations: ${maxIterations}
- Domain Focus: ${domainFocus}
- Output Format: ${outputFormat} (e.g., structured, narrative, technical, summary)

YOUR CORE CAPABILITIES:

1.  **Multi-Step Workflow Execution**: Orchestrate complex tasks through sequential, parallel, conditional, or iterative processing.
2.  **State-Aware Reasoning**: Maintain context, track progress, and manage state transitions across all workflow steps.
3.  **Dynamic Workflow Adaptation**: Adjust workflows in real-time based on intermediate results, routing to specialized sub-workflows as needed.
4.  **Tool Integration & Coordination**: Seamlessly integrate and coordinate multiple tools across different workflow phases.

AVAILABLE TOOLS & THEIR OPTIMAL USE:
- 'graphRAGTool': For interacting with the knowledge graph, including querying and managing graph data.
- 'graphRAGQueryTool': Specifically for querying the knowledge graph to retrieve structured information.
- 'vectorQueryTool': For performing semantic searches and retrieving relevant information from vector databases.
- 'hybridVectorSearchTool': For performing advanced searches that combine keyword and vector-based approaches.
- 'chunkerTool': For breaking down large texts or data into smaller, manageable chunks for efficient processing.
- 'braveSearchTool': For broad web searches, current events, and general information gathering from the internet.
- 'tavilySearchTool': For focused, in-depth web research, especially when precise answers or specific articles are required.
- 'diffbotAnalyzeUrlTool': For analyzing and extracting structured data from web pages.
- 'diffbotExtractArticleFromUrlTool': For extracting clean article content from web pages.
- 'diffbotEnhanceEntityTool': For enriching information about entities (persons, organizations) using Diffbot Knowledge Graph.
- 'diffbotSearchKnowledgeGraphTool': For searching the Diffbot Knowledge Graph.
- 'diffbotEnhanceKnowledgeGraphTool': For enhancing entities within the Diffbot Knowledge Graph.
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
- 'codeSearchTool': For searching codebases.
- 'webScraperTool': For general web scraping.
- 'gitOperationsTool': For interacting with Git repositories.
- 'mem0RememberTool': For storing information in memory.
- 'mem0MemorizeTool': For memorizing information.
- 'rerankTool': For re-ranking search results.
- 'stockPriceTool': For fetching real-time stock prices, enabling financial analysis within workflows.
- 'historicalStockPriceTool': For historical stock price data, useful for trend analysis and backtesting in financial workflows.
- 'stockNewsTool': For news articles related to specific stocks, providing qualitative context for financial decisions.
- 'earningsCalendarTool': For upcoming earnings reports, crucial for event-driven financial workflows.
- 'sportsOddsTool': For real-time sports betting odds, useful for sports analytics and predictive modeling within workflows.
- 'historicalOddsTool': For historical sports odds, enabling analysis of past performance and model validation in sports workflows.
- 'listSportsTool': For listing available sports, useful for understanding the scope of sports data.
- 'listBookmakersTool': For listing available bookmakers, providing context for odds data.
- 'cryptoPriceTool': For real-time cryptocurrency prices, essential for crypto market analysis within workflows.
- 'historicalCryptoPriceTool': For historical cryptocurrency prices, enabling trend analysis and pattern recognition in crypto markets.
- 'cryptoMarketDataTool': For comprehensive cryptocurrency market data, including market cap and volume.
- 'listCryptoCoinsTool': For listing all supported cryptocurrencies, useful for broad market overviews.
- 'weatherTool': For fetching weather information.

GUIDELINES FOR EXECUTION:
- **Analyze Request**: Determine the optimal workflow mode and reasoning depth based on the user's request.
- **Decompose Problems**: Break down complex problems into logical, executable steps.
- **Strategic Tool Use**: Select and apply the most appropriate tool(s) for each phase of the workflow.
- **Maintain Context**: Ensure continuity and coherence by maintaining state and context across all steps.
- **Progress & Output**: Provide clear progress indicators (if step tracking is enabled) and format the final output according to the specified style.
- **Error Handling**: Implement robust error handling and suggest recovery options when issues arise.

Always leverage LangGraph's capabilities for complex multi-step reasoning while maintaining seamless integration with the broader Mastra ecosystem.
${UPSTASH_PROMPT}
`;
  },
  model: createGemini25Provider('gemini-2.5-flash-lite-preview-06-17', {
    thinkingConfig: {
      thinkingBudget: 512, // Higher budget for complex reasoning
      includeThoughts: true, // Show reasoning process
    },
  }),
  tools: {
    graphRAGTool,
    diffbotAnalyzeUrlTool,
    diffbotExtractArticleFromUrlTool,
    diffbotEnhanceKnowledgeGraphTool,
    diffbotSearchKnowledgeGraphTool,
    diffbotEnhanceEntityTool,
    //graphRAGUpsertTool, # FIXME: temporarily disabled due to issues
    vectorQueryTool,
    //rerankTool, # FIXME: temporarily disabled due to issues
    chunkerTool,
    braveSearchTool: createBraveSearchTool(),
    tavilySearchTool: createTavilySearchTool(),
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
  },
  memory: mastraMemory
});

/**
 * Create a comprehensive LangGraph workflow for complex multi-step processing
 *
 * This function demonstrates production-ready LangGraph workflows that can handle
 * sophisticated reasoning tasks, state management, and tool coordination.
 *
 * @param config - Workflow configuration parameters
 * @returns Compiled LangGraph workflow ready for execution
 *
 * @example
 * ```typescript
 * const workflow = createLangGraphWorkflow({
 *   workflowType: "research-analysis",
 *   complexity: "advanced",
 *   domain: "software-architecture",
 *   maxSteps: 8
 * });
 * 
 * const result = await workflow.invoke({
 *   messages: [{ role: 'user', content: 'Analyze this system architecture' }]
 * });
 * ```
 * 
 * [EDIT: 2025-06-23] [BY: Claude]
 */
export function createLangGraphWorkflow(config: {
  workflowType: "research-analysis" | "problem-solving" | "data-processing" | "creative-synthesis" | "technical-review";
  complexity: "standard" | "advanced" | "expert" | "enterprise";
  domain?: string;
  maxSteps?: number;
  enableParallelProcessing?: boolean;
  includeErrorRecovery?: boolean;
}) {
  const { 
    workflowType, 
    complexity, 
    domain = "general",
    maxSteps = 6,
    enableParallelProcessing = false,
    includeErrorRecovery = true
  } = config;
  
  // Define sophisticated workflow steps based on type and complexity
  const workflowSteps = generateWorkflowSteps(workflowType, complexity, domain);
  
  logger.info('Creating production LangGraph workflow', { 
    workflowType, 
    complexity, 
    domain,
    maxSteps,
    stepCount: workflowSteps.length,
    parallelProcessing: enableParallelProcessing,
    errorRecovery: includeErrorRecovery
  });

  return createMastraLangGraphWorkflow({
    agentName: "LangGraph Agent",
    temperature: getOptimalTemperature(workflowType, complexity),
    maxTokens: getOptimalTokenCount(complexity),
    systemPrompt: generateSystemPrompt(workflowType, complexity, domain),
    steps: workflowSteps
  });
}

/**
 * Create a conversational LangGraph workflow for interactive sessions
 * 
 * This creates workflows optimized for back-and-forth conversations while
 * maintaining the ability to execute multi-step reasoning when needed.
 * 
 * @param config - Chat workflow configuration
 * @returns Compiled LangGraph chat workflow
 * 
 * @example
 * ```typescript
 * const chatWorkflow = createLangGraphChat({
 *   conversationStyle: "collaborative",
 *   adaptiveComplexity: true,
 *   memoryIntegration: true
 * });
 * ```
 * 
 * [EDIT: 2025-06-23] [BY: Claude]
 */
export function createLangGraphChat(config: {
  conversationStyle?: "collaborative" | "analytical" | "creative" | "technical";
  adaptiveComplexity?: boolean;
  memoryIntegration?: boolean;
  temperature?: number;
}) {
  const { 
    conversationStyle = "collaborative",
    adaptiveComplexity = true,
    memoryIntegration = true,
    temperature = 0.7 
  } = config;
  
  logger.info('Creating LangGraph conversational workflow', { 
    conversationStyle,
    adaptiveComplexity,
    memoryIntegration,
    temperature 
  });

  const systemPrompt = generateChatSystemPrompt(conversationStyle, adaptiveComplexity, memoryIntegration);

  return createMastraLangGraphChat({
    agentName: "LangGraph Agent Chat",
    temperature,
    systemPrompt
  });
}

/**
 * Generate workflow steps based on type, complexity, and domain
 * 
 * @param workflowType - Type of workflow to create
 * @param complexity - Complexity level
 * @param domain - Domain-specific focus
 * @returns Array of detailed workflow step descriptions
 * 
 * [EDIT: 2025-06-23] [BY: Claude]
 */
function generateWorkflowSteps(
  workflowType: string,
  complexity: string,
  domain: string
): string[] {
  const baseSteps: Record<string, string[]> = {
    "research-analysis": [
      "Initial problem understanding and scope definition",
      "Information gathering and source identification",
      "Data collection and preprocessing",
      "Pattern analysis and insight extraction",
      "Cross-reference validation and fact-checking",
      "Synthesis and comprehensive report generation"
    ],
    "problem-solving": [
      "Problem decomposition and constraint identification",
      "Solution space exploration and brainstorming",
      "Feasibility analysis and risk assessment",
      "Solution ranking and trade-off evaluation",
      "Implementation planning and resource allocation",
      "Validation and testing strategy development"
    ],
    "data-processing": [
      "Data ingestion and quality assessment",
      "Cleaning and normalization procedures",
      "Feature extraction and transformation",
      "Analysis and statistical computation",
      "Visualization and insight generation",
      "Report compilation and delivery"
    ],
    "creative-synthesis": [
      "Creative brief analysis and goal setting",
      "Ideation and concept development",
      "Concept refinement and iteration",
      "Feasibility and impact evaluation",
      "Creative execution and prototyping",
      "Final presentation and delivery"
    ],
    "technical-review": [
      "Technical specification analysis",
      "Architecture and design evaluation",
      "Code quality and security assessment",
      "Performance and scalability analysis",
      "Best practice compliance review",
      "Recommendations and improvement plan"
    ]
  };

  let steps = baseSteps[workflowType] || baseSteps["research-analysis"];

  // Enhance steps based on complexity
  if (complexity === "advanced" || complexity === "expert" || complexity === "enterprise") {
    steps = enhanceStepsForComplexity(steps, complexity, domain);
  }

  return steps;
}

/**
 * Enhance workflow steps for higher complexity levels
 * 
 * @param baseSteps - Base workflow steps
 * @param complexity - Complexity level
 * @param domain - Domain focus
 * @returns Enhanced workflow steps
 * 
 * [EDIT: 2025-06-23] [BY: Claude]
 */
function enhanceStepsForComplexity(baseSteps: string[], complexity: string, domain: string): string[] {
  const enhanced = [...baseSteps];

  if (complexity === "advanced") {
    enhanced.splice(2, 0, "Stakeholder analysis and requirement validation");
    enhanced.push("Quality assurance and peer review");
  }

  if (complexity === "expert") {
    enhanced.splice(1, 0, "Domain expert consultation and knowledge integration");
    enhanced.splice(-1, 0, "Multi-perspective validation and bias checking");
    enhanced.push("Knowledge documentation and transfer");
  }

  if (complexity === "enterprise") {
    enhanced.unshift("Strategic alignment and business impact assessment");
    enhanced.splice(3, 0, "Risk analysis and mitigation planning");
    enhanced.splice(-1, 0, "Compliance and regulatory review");
    enhanced.push("Long-term maintenance and evolution planning");
  }

  // Add domain-specific enhancements
  if (domain !== "general") {
    enhanced.splice(1, 0, `Domain-specific ${domain} context integration`);
  }

  return enhanced;
}

/**
 * Get optimal temperature based on workflow type and complexity
 * 
 * @param workflowType - Type of workflow
 * @param complexity - Complexity level
 * @returns Optimal temperature setting
 * 
 * [EDIT: 2025-06-23] [BY: Claude]
 */
function getOptimalTemperature(workflowType: string, complexity: string): number {
  const temperatureMap: Record<string, number> = {
    "research-analysis": 0.3,
    "problem-solving": 0.5,
    "data-processing": 0.2,
    "creative-synthesis": 0.8,
    "technical-review": 0.1
  };

  let baseTemp = temperatureMap[workflowType] || 0.5;

  // Adjust for complexity
  if (complexity === "advanced") baseTemp += 0.1;
  if (complexity === "expert") baseTemp += 0.15;
  if (complexity === "enterprise") baseTemp += 0.05; // More conservative for enterprise

  return Math.min(baseTemp, 1.0);
}

/**
 * Get optimal token count based on complexity
 * 
 * @param complexity - Complexity level
 * @returns Optimal token count
 * 
 * [EDIT: 2025-06-23] [BY: Claude]
 */
function getOptimalTokenCount(complexity: string): number {
  const tokenMap: Record<string, number> = {
    "standard": 2000,
    "advanced": 4000,
    "expert": 6000,
    "enterprise": 8000
  };

  return tokenMap[complexity] || 2000;
}

/**
 * Generate system prompt for workflow type and complexity
 * 
 * @param workflowType - Type of workflow
 * @param complexity - Complexity level
 * @param domain - Domain focus
 * @returns Tailored system prompt
 * 
 * [EDIT: 2025-06-23] [BY: Claude]
 */
function generateSystemPrompt(workflowType: string, complexity: string, domain: string): string {
  return `You are executing a '${workflowType}' workflow at '${complexity}' level with a focus on '${domain}'.

Your primary objective is to process each step thoroughly, maintaining state and context between steps. You must strategically use the available tools to gather information, analyze data, and generate insights.

Key principles to adhere to:
- Maintain rigorous attention to detail throughout the process.
- Validate information across multiple sources to ensure accuracy.
- Consider multiple perspectives and identify potential biases.
- Provide clear and concise reasoning for each decision made.
- Systematically build upon previous steps to ensure logical progression.
- Handle errors gracefully and suggest effective alternatives when necessary.

Execute each workflow step with precision and meticulously document your reasoning process.`;
}

/**
 * Generate system prompt for conversational workflows
 * 
 * @param conversationStyle - Style of conversation
 * @param adaptiveComplexity - Whether to adapt complexity dynamically
 * @param memoryIntegration - Whether to integrate with memory systems
 * @returns Conversational system prompt
 * 
 * [EDIT: 2025-06-23] [BY: Claude]
 */
function generateChatSystemPrompt(
  conversationStyle: string,
  adaptiveComplexity: boolean,
  memoryIntegration: boolean
): string {
  return `You are a LangGraph-powered conversational agent optimized for '${conversationStyle}' interactions.

${adaptiveComplexity ? 'Adapt your complexity based on the user\'s needs and expertise level.' : ''}
${memoryIntegration ? 'Leverage conversation history and context from previous interactions.' : ''}

When complex problems arise, seamlessly transition to multi-step workflows while maintaining conversational flow. Balance thoroughness with accessibility, ensuring responses are both comprehensive and engaging.`;
}
