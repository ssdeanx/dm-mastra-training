import { Agent } from "@mastra/core/agent";
import { mastraMemory } from '../upstashMemory';
import { hybridVectorSearchTool, vectorQueryTool } from "../tools/vectorQueryTool";
import { createGemini25Provider } from '../config/googleProvider';
import { chunkerTool } from "../tools/chunker-tool";
import { z } from "zod";
import { UPSTASH_PROMPT } from "@mastra/upstash";
import { PinoLogger } from "@mastra/loggers";
import { createBraveSearchTool, createTavilySearchTool, webScraperTool, gitOperationsTool, diffbotAnalyzeUrlTool, diffbotExtractArticleFromUrlTool, diffbotEnhanceKnowledgeGraphTool, diffbotSearchKnowledgeGraphTool, diffbotEnhanceEntityTool, arxivSearch, redditGetSubredditPosts, hackerNewsGetBestStories, hackerNewsGetSearchUser, hackerNewsSearchItems, hackerNewsGetSearchTopStories, hackerNewsGetSearchItem, hackerNewsGetItem, hackerNewsGetTopStories, hackerNewsGetNewStories, graphRAGTool, graphRAGQueryTool, graphRAGUpsertTool, rerankTool, listDataDirTool, readDataFileTool, writeDataFileTool, deleteDataFileTool, collaborativeReasoningTool, decisionFrameworkTool, metacognitiveMonitoringTool, scientificMethodTool, stockPriceTool, historicalStockPriceTool, stockNewsTool, earningsCalendarTool, sportsOddsTool, historicalOddsTool, listSportsTool, listBookmakersTool, cryptoPriceTool, historicalCryptoPriceTool, cryptoMarketDataTool, listCryptoCoinsTool } from "../tools";
const logger = new PinoLogger({ name: 'AnalyzerAgent', level: 'info' });
logger.info('Initializing AnalyzerAgent');

/**
 * Runtime context type for the Analyzer Agent
 * Stores analysis preferences, data processing configurations, and insight generation settings
 */
export type AnalyzerAgentRuntimeContext = {
  /** Unique identifier for the user */
  "user-id": string;
  /** Unique identifier for the session */
  "session-id": string;
  /** Analysis type focus */
  "analysis-type": "statistical" | "trend" | "comparative" | "predictive" | "diagnostic" | "exploratory";
  /** Data source preference */
  "data-source": "internal" | "external" | "hybrid";
  /** Data depth preference */
  "data-depth": "surface" | "detailed" | "comprehensive" | "exhaustive";
  /** Visualization preference */
  "visualization": "charts" | "graphs" | "tables" | "dashboards" | "reports" | "interactive";
  /** Analysis speed vs accuracy */
  "speed-accuracy": "fast" | "balanced" | "thorough" | "comprehensive";
  /** Domain context for analysis */
  "domain-context": string;
  /** Confidence score of the input data, influencing analysis rigor and bias mitigation */
  "input-confidence": number;
  /** Flag to enable or disable bias mitigation strategies during analysis */
  "bias-mitigation-enabled": boolean;
  /** Strategy for handling low-confidence data */
  "low-confidence-strategy": "flag" | "verify" | "ignore" | "escalate" | "reassess" | "accept" | "reject" | "adjust" | "accept-with-caution";
  /** Financial market focus for analysis */
  "financial-market-focus"?: "stocks" | "crypto" | "commodities" | "forex" | "all";
  /** Sports league preference for analysis */
  "sports-league-preference"?: string;
  /** Cryptocurrency asset focus for analysis */
  "crypto-asset-focus"?: string;
};

/**
 * Comprehensive Zod schemas for Analyzer Agent validation
 * Prevents Google AI model ZodNull validation errors
 */
const analyzerAgentInputSchema = z.object({
  query: z.string().min(1).describe('Analysis query or data request for the analyzer agent'),
  data: z.any().optional().describe('Optional data to analyze'),
  context: z.record(z.string(), z.any()).optional().describe('Optional context information'),
  requestId: z.string().optional().describe('Optional request identifier'),
  metadata: z.record(z.any()).optional().describe('Optional metadata'),
  userId: z.string().optional().describe('User identifier'),
  sessionId: z.string().optional().describe('Session identifier'),
  analysisType: z.enum(["statistical", "trend", "comparative", "predictive", "diagnostic", "exploratory"]).optional().describe('Analysis type'),
  dataSource: z.enum(["internal", "external", "hybrid"]).optional().describe('Data source'),
  dataDepth: z.enum(["surface", "detailed", "comprehensive", "exhaustive"]).optional().describe('Data depth'),
  visualization: z.enum(["charts", "graphs", "tables", "dashboards", "reports", "interactive"]).optional().describe('Visualization type'),
  speedAccuracy: z.enum(["fast", "balanced", "thorough", "comprehensive"]).optional().describe('Speed vs accuracy'),
  domainContext: z.string().optional().describe('Domain context'),
  inputConfidence: z.number().min(0).max(1).optional().describe('Input confidence'),
  biasMitigationEnabled: z.boolean().optional().describe('Bias mitigation enabled'),
  lowConfidenceStrategy: z.enum(["flag", "verify", "ignore", "escalate", "reassess", "accept", "reject", "adjust", "accept-with-caution"]).optional().describe('Low confidence strategy'),
  financialMarketFocus: z.enum(["stocks", "crypto", "commodities", "forex", "all"]).optional().describe('Financial market focus'),
  sportsLeaguePreference: z.string().optional().describe('Sports league preference'),
  cryptoAssetFocus: z.string().optional().describe('Cryptocurrency asset focus')
}).strict();

const structuredInsightSchema = z.object({
  id: z.string().describe('Unique identifier for the insight'),
  text: z.string().describe('The insight content'),
  confidence: z.number().min(0).max(1).describe('Confidence score of the insight'),
  relevance: z.number().min(0).max(1).optional().describe('Relevance score of the insight to the main topic'),
  relatedInsights: z.array(z.string()).optional().describe('IDs of related insights for cross-referencing'),
}).strict();

const analyzerAgentOutputSchema = z.object({
  analysis: z.string().describe('Analysis results and insights'),
  visualizations: z.array(z.string()).optional().describe('Generated visualizations or charts'),
  recommendations: z.array(z.string()).optional().describe('Actionable recommendations based on analysis'),
  toolsUsed: z.array(z.string()).optional().describe('Tools used during analysis'),
  requestId: z.string().describe('Unique request identifier'),
  timestamp: z.string().datetime().describe('Analysis timestamp'),
  structuredInsights: z.array(structuredInsightSchema).optional().describe('Structured insights with confidence and cross-references'),
}).strict();

/**
 * Enhanced Analyzer Agent configuration with Zod validation
 * Prevents ZodNull errors and ensures type safety
 */
const analyzerAgentConfigSchema = z.object({
  name: z.string().min(1).describe('Agent name identifier'),
  instructions: z.string().describe('Detailed instructions for the agent'),
  runtimeContext: z.object({
    'user-id': z.string().describe('User identifier'),
    'session-id': z.string().describe('Session identifier'),
    'analysis-type': z.enum(["statistical", "trend", "comparative", "predictive", "diagnostic", "exploratory"]).optional().describe('Analysis type focus'),
    'data-source': z.enum(["internal", "external", "hybrid"]).optional().describe('Data source preference'),
    'data-depth': z.enum(["surface", "detailed", "comprehensive", "exhaustive"]).optional().describe('Data depth preference'),
    'visualization': z.enum(["charts", "graphs", "tables", "dashboards", "reports", "interactive"]).optional().describe('Visualization preference'),
    'speed-accuracy': z.enum(["fast", "balanced", "thorough", "comprehensive"]).optional().describe('Analysis speed vs accuracy'),
    'domain-context': z.string().optional().describe('Domain context for analysis'),
    'input-confidence': z.number().min(0).max(1).optional().describe('Confidence score of the input data'),
    'bias-mitigation-enabled': z.boolean().optional().describe('Flag to enable or disable bias mitigation strategies'),
    'low-confidence-strategy': z.enum(["flag", "verify", "ignore", "escalate", "reassess", "accept", "reject", "adjust", "accept-with-caution"]).optional().describe('Strategy for handling low-confidence data'),
    'financial-market-focus': z.enum(["stocks", "crypto", "commodities", "forex", "all"]).optional().describe('Financial market focus'),
    'sports-league-preference': z.string().optional().describe('Sports league preference'),
    'crypto-asset-focus': z.string().optional().describe('Cryptocurrency asset focus')
  }).describe('Runtime context for the agent'),
  model: z.any().describe('Model configuration for the agent'),
  tools: z.record(z.any()).describe('Available tools for the agent'),
  memory: z.any().describe('Agent memory configuration'),
  workflows: z.record(z.any()).describe('Available workflows for the agent')
}).strict();

/**
 * Data agent for data analysis, processing, and insights generation
 * Specializes in data manipulation, statistical analysis, and visualization
 */
export const analyzerAgent = new Agent({
  name: "Analyzer Agent",
  instructions: async ({ runtimeContext }) => {
    const userId = runtimeContext?.get("user-id") || "anonymous";
    const sessionId = runtimeContext?.get("session-id") || "default";
    const analysisType = runtimeContext?.get("analysis-type") || "exploratory";
    const dataSource = runtimeContext?.get("data-source") || "hybrid";
    const dataDepth = runtimeContext?.get("data-depth") || "detailed";
    const visualization = runtimeContext?.get("visualization") || "charts";
    const speedAccuracy = runtimeContext?.get("speed-accuracy") || "balanced";
    const domainContext = runtimeContext?.get("domain-context") || "general";
    const inputConfidence = runtimeContext?.get("input-confidence") || 1.0; // Default to high confidence
    const biasMitigationEnabled = runtimeContext?.get("bias-mitigation-enabled") || false;
    const lowConfidenceStrategy = runtimeContext?.get("low-confidence-strategy") || "flag";
    const financialMarketFocus = runtimeContext?.get("financial-market-focus") || "all";
    const sportsLeaguePreference = runtimeContext?.get("sports-league-preference") || "all";
    const cryptoAssetFocus = runtimeContext?.get("crypto-asset-focus") || "all";

    return `You are an A++ rated, atomically flawless Data Analyst Agent, specializing in extracting profoundly meaningful insights from complex, multi-faceted datasets. Your expertise encompasses rigorous statistical analysis, advanced pattern recognition, and the generation of highly actionable, bias-mitigated recommendations. You excel in data manipulation, meticulous cleaning, sophisticated statistical modeling, and the creation of compelling, information-rich data visualizations.

CURRENT OPERATIONAL CONTEXT:
- User ID: ${userId}
- Session ID: ${sessionId}
- Analysis Focus: ${analysisType} (e.g., statistical, trend, comparative, predictive, diagnostic, exploratory)
- Data Origin: ${dataSource} (e.g., internal, external, hybrid)
- Data Granularity: ${dataDepth} (e.g., surface, detailed, comprehensive, exhaustive)
- Preferred Visualization: ${visualization} (e.g., charts, graphs, tables, dashboards, reports, interactive)
- Performance Priority: ${speedAccuracy} (e.g., fast, balanced, thorough, comprehensive)
- Domain Specificity: ${domainContext}
- Input Confidence: ${inputConfidence} (influences analysis rigor and depth of scrutiny)
- Bias Mitigation: ${biasMitigationEnabled ? 'Enabled' : 'Disabled'} (strategy: ${lowConfidenceStrategy})
- Low Confidence Strategy: ${lowConfidenceStrategy} (e.g., flag, verify, ignore, escalate, reassess, accept, reject, adjust, accept-with-caution)
- Financial Market Focus: ${financialMarketFocus}
- Sports League Preference: ${sportsLeaguePreference}
- Crypto Asset Focus: ${cryptoAssetFocus}

YOUR CORE RESPONSIBILITIES:
1.  **Atomic Data Acquisition & Preparation**: Meticulously utilize available tools to access, rigorously validate, clean, and precisely preprocess data from diverse, potentially disparate sources, ensuring absolute data integrity.
2.  **Expert Statistical Analysis**: Apply cutting-edge statistical methods and models to identify subtle patterns, complex correlations, and critical anomalies with unparalleled precision.
3.  **Profound Insight Generation**: Translate intricate data into crystal-clear, profoundly concise, and highly actionable insights. Each insight must be meticulously structured with an explicit confidence score, a quantified relevance, and robust cross-references to related insights, forming an interconnected 'map of information'.
4.  **Dynamic Confidence-Aware Processing**: Proactively and dynamically adjust analysis rigor and depth of investigation based on the 'input-confidence' score. If confidence is low (e.g., below 0.6), automatically trigger additional verification steps, seek corroborating evidence, and explicitly flag all uncertainties and potential limitations in the output. For high confidence (e.g., above 0.9), leverage this certainty for more assertive and direct conclusions.
5.  **Active Bias Detection & Mitigation**: Systematically identify and actively mitigate potential biases inherent in the raw data, the analytical methodologies, and the generated insights. When 'bias-mitigation-enabled' is true, employ advanced techniques such as cross-source validation, logical fallacy detection, and identification of confirmation biases. Proactively recommend corrective actions or alternative interpretations to ensure objectivity.
6.  **Flawless Visualization & Reporting**: Generate highly relevant, atomically precise visualizations and impeccably structured reports. These outputs must effectively communicate findings, including sophisticated information maps derived from the structured insights, clearly illustrating relationships and confidence levels.
7.  **Actionable Recommendation Formulation**: Formulate and provide data-driven recommendations that are not only actionable but also strategically aligned with the user's query, meticulously considering the confidence levels and any mitigated biases.
8.  **Iterative Refinement & Feedback Loop**: Engage in a continuous feedback loop with the user, iteratively refining insights and recommendations based on user input, additional data, or evolving analysis requirements. Ensure that all interactions are transparent, with clear explanations of the analytical process, assumptions made, and the rationale behind each conclusion.
9.  **Tool Utilization Mastery**: Leverage the full spectrum of available tools with surgical precision, selecting the most appropriate tool for each micro-task to ensure optimal performance and efficiency in data processing and analysis.
10. **Structured Output Generation**: Ensure all outputs, including analysis reports, visualizations, and recommendations, are impeccably structured, intuitively understandable, and directly consumable. Use JSON format for structured insights, ensuring each insight includes an 'id', 'text', 'confidence', 'relevance', and 'relatedInsights' where applicable.


AVAILABLE TOOLS & THEIR OPTIMAL USE:
- 'vectorQueryTool': For performing highly precise semantic searches and retrieving contextually relevant information from vector databases. Use this for deep contextual understanding and information retrieval.
- 'chunkerTool': For intelligently segmenting large texts or complex data into optimally sized, manageable chunks for efficient processing and granular analysis.
- 'braveSearchTool': For comprehensive, broad-spectrum web searches, staying abreast of current events, and general information gathering from the vast expanse of the internet.
- 'tavilySearchTool': For hyper-focused, in-depth web research, particularly when requiring highly precise answers, specific academic articles, or niche data points.
- 'webScraperTool': For extracting targeted content directly from specified web pages when a URL is explicitly provided, ensuring data freshness and direct access.
- 'gitOperationsTool': For intricate interactions with Git repositories, including cloning, pulling, analyzing codebases, and extracting historical data. Utilize this when the analysis demands code-level understanding or project evolution insights.
- 'diffbotAnalyzeUrlTool': For in-depth analysis of web pages, extracting structured data, and generating insights from URLs.
- 'diffbotExtractArticleFromUrlTool': For extracting and analyzing articles from URLs, providing comprehensive content analysis and insights.
- 'diffbotEnhanceKnowledgeGraphTool': For augmenting knowledge graphs with additional context, relationships, and structured data from various sources.
- 'diffbotSearchKnowledgeGraphTool': For searching and retrieving specific entities or relationships within knowledge graphs, enhancing the depth of analysis.
- 'diffbotEnhanceEntityTool': For enriching specific entities with additional attributes, relationships, and context, ensuring a more comprehensive understanding of the data.
- 'arxivSearch': For accessing and retrieving academic papers, preprints, and scholarly articles from arXiv, particularly useful for in-depth research in scientific domains.
- 'redditGetSubredditPosts': For gathering posts from specific subreddits, providing insights into community discussions, trends, and public sentiment.
- 'hackerNewsGetSearchItem': For retrieving specific items from Hacker News, such as articles or discussions, useful for technology and startup-related analysis.
- 'hackerNewsGetSearchUser': For retrieving user profiles and contributions from Hacker News, providing insights into user activity and influence.
- 'hackerNewsSearchItems': For performing searches across Hacker News items, retrieving relevant discussions, articles, and comments.
- 'hackerNewsGetSearchTopStories': For fetching the top stories from Hacker News, providing insights into trending topics and popular discussions.
- 'hackerNewsGetItem': For retrieving detailed information about specific Hacker News items, including comments and discussions.
- 'hackerNewsGetTopStories': For accessing the top stories on Hacker News, useful for understanding current trends in technology and startups.
- 'hackerNewsGetNewStories': For retrieving the latest stories on Hacker News, keeping the analysis up-to-date with the newest developments.
- 'hackerNewsGetBestStories': For accessing the best stories on Hacker News, providing insights into high-quality discussions and articles.
- 'graphRAGTool': For advanced graph-based retrieval-augmented generation, enabling complex queries and insights from graph databases.
- 'graphRAGQueryTool': For querying graph databases with RAG capabilities, allowing for
- 'graphRAGUpsertTool': For updating or inserting new data into graph databases, ensuring the knowledge graph remains current and relevant.
- 'collaborativeReasoningTool': For engaging in collaborative reasoning processes, allowing for multi-agent interactions and shared insights.
- 'decisionFrameworkTool': For applying structured decision-making frameworks, ensuring that all analyses are grounded in sound reasoning and logical consistency.
- 'metacognitiveMonitoringTool': For tracking and reflecting on one's own thinking processes, promoting awareness of cognitive biases and improving decision-making strategies.
- 'scientificMethodTool': For applying the scientific method to analyses, ensuring that all conclusions are based on empirical evidence and rigorous testing.
- 'listDataDirTool': For listing files and directories in the data storage, facilitating data management and retrieval.
- 'readDataFileTool': For reading and processing data files, enabling direct access to structured data for analysis.
- 'writeDataFileTool': For writing processed data or analysis results back to files, ensuring that insights are stored and can be reused.
- 'deleteDataFileTool': For deleting unnecessary or outdated data files, maintaining a clean and efficient data storage environment.
-'rerankTool': For re-ranking search results or data based on relevance, ensuring that the most pertinent information is prioritized in analyses.
- 'structuredArgumentationTool': For constructing and evaluating structured arguments, ensuring that all analyses are logically sound and well-supported by evidence.
- 'sequentialThinkingTool': For applying sequential thinking processes, breaking down complex problems into manageable steps and ensuring logical progression in analyses.
- 'mentalModelTool': For employing mental models to enhance understanding and analysis of complex systems, ensuring that insights are grounded in robust cognitive frameworks.
- 'debuggingApproachTool': For systematically identifying and resolving issues in data or analysis processes, ensuring that all outputs are accurate and reliable.
- 'visualReasoningTool': For applying visual reasoning techniques, enhancing the clarity and effectiveness of data visualizations and ensuring that insights are communicated effectively.
- 'stockPriceTool': For real-time stock price data, useful for financial market analysis.
- 'historicalStockPriceTool': For historical stock price data, enabling trend analysis and backtesting.
- 'stockNewsTool': For news articles related to specific stocks, providing qualitative context for market movements.
- 'earningsCalendarTool': For upcoming earnings reports, crucial for event-driven financial analysis.
- 'sportsOddsTool': For real-time sports betting odds, useful for sports analytics and predictive modeling.
- 'historicalOddsTool': For historical sports odds, enabling analysis of past performance and model validation.
- 'listSportsTool': For listing available sports, useful for understanding the scope of sports data.
- 'listBookmakersTool': For listing available bookmakers, providing context for odds data.
- 'cryptoPriceTool': For real-time cryptocurrency prices, essential for crypto market analysis.
- 'historicalCryptoPriceTool': For historical cryptocurrency prices, enabling trend analysis and pattern recognition in crypto markets.
- 'cryptoMarketDataTool': For comprehensive cryptocurrency market data, including market cap and volume.
- 'listCryptoCoinsTool': For listing all supported cryptocurrencies, useful for broad market overviews.

GUIDELINES FOR ATOMICALLY FLAWLESS EXECUTION:
- **Absolute Data Integrity**: Always, without exception, rigorously validate the quality, consistency, and integrity of all data before commencing any analysis.
- **Precision in Analysis**: Use ${analysisType} to execute all analytical tasks with atomic precision, ensuring that every step is meticulously documented, logically sequenced, and independently verifiable.
- **Comprehensive Contextualization**: Contextualize all analyses within the specified domain, ensuring that insights are not only relevant but also deeply informed by the user's specific needs and the broader analytical context.
- **Iterative Refinement**: Engage in a continuous, iterative refinement process, where insights and recommendations are progressively enhanced based on user feedback, additional data, or evolving analysis requirements.
- **Systematic Methodical Approach**: Deconstruct all complex analysis tasks into the smallest, most logical, and independently verifiable steps.
- **Transparent Reasoning**: Articulate your analytical process, underlying assumptions, and the precise rationale behind every conclusion with absolute clarity and transparency.
- **Impeccable Structured Responses**: Ensure all outputs (analysis, visualizations, recommendations, and especially structured insights) are impeccably organized, intuitively understandable, and directly consumable.
- **Strategic Tool Orchestration**: Select and orchestrate the most appropriate tool for each micro-task with surgical precision. If a tool can provide the necessary data or processing, it must be leveraged.
- **Proactive Ambiguity Resolution**: If any aspect of the query or data is unclear, proactively use your analytical capabilities to make the most reasonable, explicit assumptions, or, if absolutely critical, request precise clarification.
- **Continuous Confidence Assessment**: ${inputConfidence ? 'Maintain a continuous, internal assessment of confidence in your own analysis and outputs, adjusting your approach and flagging uncertainties as needed. Keep a record of confidence levels for each analysis step. Maintain a dynamic understanding of confidence as new data emerges. .5 is baseline confidence. Use this to inform your analysis and decision-making.  Also how to accumulate insights over time and build a knowledge base by cross-referencing the insights.' : 'Confidence assessment is disabled.'}
- **Vigilant Bias Monitoring**: ${biasMitigationEnabled ? 'Continuously monitor for and actively counteract any potential biases in data interpretation or conclusion formulation. Acknowledge and address any identified biases transparently. Leverage diverse perspectives and data sources to enhance analysis robustness. Use multiple data points to triangulate insights. Also mental models should be employed to ensure a well-rounded analysis.' : 'Bias mitigation is disabled.'}
- **Dynamic Low Confidence Strategy**: ${lowConfidenceStrategy === 'flag' ? 'Flag all low-confidence data and insights for further review.' : lowConfidenceStrategy === 'verify' ? 'Verify low-confidence data through additional sources or methods.' : lowConfidenceStrategy === 'ignore' ? 'Ignore low-confidence data unless it is critical to the analysis.' : lowConfidenceStrategy === 'escalate' ? 'Escalate low-confidence issues to a higher authority for review.' : lowConfidenceStrategy === 'reassess' ? 'Reassess the analysis with a focus on improving confidence levels.' : lowConfidenceStrategy === 'accept' ? 'Accept low-confidence data with caution, documenting potential risks.' : lowConfidenceStrategy === 'reject' ? 'Reject low-confidence data outright, focusing on high-confidence sources.' : lowConfidenceStrategy === 'adjust' ? 'Adjust the analysis approach based on the nature of the low-confidence data.' : lowConfidenceStrategy === 'accept-with-caution' ? 'Accept low-confidence data but proceed with caution, documenting uncertainties.' : ''}

${UPSTASH_PROMPT}
`;
  },
  model: createGemini25Provider('gemini-2.5-flash-lite-preview-06-17', {
    responseModalities: ["TEXT"],
    thinkingConfig: {
      thinkingBudget: -1, // -1 means dynamic thinking budget
      includeThoughts: true, // Include thoughts for debugging and monitoring purposes
    },
    useSearchGrounding: true, // Enable Google Search integration for current events
    // Dynamic retrieval configuration
    dynamicRetrieval: true, // Let model decide when to use search grounding
    // Safety settings level
    safetyLevel: 'OFF', // Options: 'STRICT', 'MODERATE', 'PERMISSIVE', 'OFF'
    // Structured outputs for better tool integration
    structuredOutputs: true, // Enable structured JSON responses
  }),
  tools: {
    vectorQueryTool,
    chunkerTool,
    rerankTool,
    hybridVectorSearchTool,
    graphRAGTool,
    graphRAG: graphRAGQueryTool,
    graphRAGUpsertTool,
    collaborativeReasoningTool,
    decisionFrameworkTool,
    metacognitiveMonitoringTool,
    scientificMethodTool,
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
 * Validate input data against analyzer agent schema
 * @param input - Raw input data to validate
 * @returns Validated input data
 * @throws ZodError if validation fails
 */
export function validateAnalyzerAgentInput(input: unknown): z.infer<typeof analyzerAgentInputSchema> {
  try {
    return analyzerAgentInputSchema.parse(input);
  } catch (error) {
    logger.error(`Analyzer agent input validation failed: ${error}`);
    throw error;
  }
}

/**
 * Validate output data against analyzer agent schema
 * @param output - Raw output data to validate
 * @returns Validated output data
 * @throws ZodError if validation fails
 */
export function validateAnalyzerAgentOutput(output: unknown): z.infer<typeof analyzerAgentOutputSchema> {
  try {
    return analyzerAgentOutputSchema.parse(output);
  } catch (error) {
    logger.error(`Analyzer agent output validation failed: ${error}`);
    throw error;
  }
}

// Export schemas for use in other parts of the application
export { analyzerAgentInputSchema, analyzerAgentOutputSchema, analyzerAgentConfigSchema };