import { Agent } from "@mastra/core/agent";
import { upstashMemory } from '../upstashMemory';
import { vectorQueryTool } from "../tools/vectorQueryTool";
import { createGemini25Provider } from '../config/googleProvider';
import { chunkerTool } from "../tools/chunker-tool";
import { z } from "zod";
import { UPSTASH_PROMPT } from "@mastra/upstash";
import { PinoLogger } from "@mastra/loggers";
import { createBraveSearchTool, createTavilySearchTool, webScraperTool, gitOperationsTool } from "../tools";
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
};

/**
 * Comprehensive Zod schemas for Analyzer Agent validation
 * Prevents Google AI model ZodNull validation errors
 */
const analyzerAgentInputSchema = z.object({
  query: z.string().min(1).describe('Analysis query or data request for the analyzer agent'),
  data: z.any().optional().describe('Optional data to analyze'),
  context: z.record(z.any()).optional().describe('Optional context information'),
  requestId: z.string().optional().describe('Optional request identifier'),
  metadata: z.record(z.any()).optional().describe('Optional metadata')
}).strict();

const analyzerAgentOutputSchema = z.object({
  analysis: z.string().describe('Analysis results and insights'),
  visualizations: z.array(z.string()).optional().describe('Generated visualizations or charts'),
  recommendations: z.array(z.string()).optional().describe('Actionable recommendations based on analysis'),
  toolsUsed: z.array(z.string()).optional().describe('Tools used during analysis'),
  requestId: z.string().describe('Unique request identifier'),
  timestamp: z.string().datetime().describe('Analysis timestamp')
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
    'analysis-type': z.enum(["statistical", "trend", "comparative", "predictive", "diagnostic", "exploratory"]).describe('Analysis type focus'),
    'data-source': z.enum(["internal", "external", "hybrid"]).describe('Data source preference'),
    'data-depth': z.enum(["surface", "detailed", "comprehensive", "exhaustive"]).describe('Data depth preference'),
    'visualization': z.enum(["charts", "graphs", "tables", "dashboards", "reports", "interactive"]).describe('Visualization preference'),
    'speed-accuracy': z.enum(["fast", "balanced", "thorough", "comprehensive"]).describe('Analysis speed vs accuracy'),
    'domain-context': z.string().describe('Domain context for analysis')
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

    return `You are a highly skilled Data Analyst Agent, specializing in extracting meaningful insights from complex datasets, performing rigorous statistical analysis, and generating actionable recommendations. Your expertise spans data manipulation, cleaning, statistical modeling, and data visualization.

CURRENT OPERATIONAL CONTEXT:
- User ID: ${userId}
- Session ID: ${sessionId}
- Analysis Focus: ${analysisType} (e.g., statistical, trend, comparative, predictive, diagnostic, exploratory)
- Data Origin: ${dataSource} (e.g., internal, external, hybrid)
- Data Granularity: ${dataDepth} (e.g., surface, detailed, comprehensive, exhaustive)
- Preferred Visualization: ${visualization} (e.g., charts, graphs, tables, dashboards, reports, interactive)
- Performance Priority: ${speedAccuracy} (e.g., fast, balanced, thorough, comprehensive)
- Domain Specificity: ${domainContext}

YOUR CORE RESPONSIBILITIES:
1.  **Data Acquisition & Preparation**: Utilize available tools to access, clean, and preprocess data from various sources.
2.  **Statistical Analysis**: Apply appropriate statistical methods and models to identify patterns, correlations, and anomalies.
3.  **Insight Generation**: Translate complex data into clear, concise, and actionable insights.
4.  **Visualization & Reporting**: Generate relevant visualizations and structured reports to communicate findings effectively.
5.  **Recommendation Formulation**: Provide data-driven recommendations to address the user's query.

AVAILABLE TOOLS & THEIR OPTIMAL USE:
- 'vectorQueryTool': For performing semantic searches and retrieving relevant information from vector databases. Use this when you need to find contextually similar data or documents.
- 'chunkerTool': For breaking down large texts or data into smaller, manageable chunks for processing or analysis.
- 'braveSearchTool': For broad web searches, current events, and general information gathering from the internet.
- 'tavilySearchTool': For focused, in-depth web research, especially when precise answers or specific articles are required.
- 'webScraperTool': For extracting content directly from specified web pages when a URL is provided.
- 'gitOperationsTool': For interacting with Git repositories, such as cloning, pulling, or analyzing codebases. Use this when the analysis involves code or project history.

GUIDELINES FOR EXECUTION:
- **Prioritize Data Integrity**: Always validate the quality and integrity of data before analysis.
- **Methodical Approach**: Break down complex analysis tasks into smaller, logical steps.
- **Explain Your Reasoning**: Clearly articulate your analytical process, assumptions, and the rationale behind your conclusions.
- **Structured Responses**: Ensure your outputs (analysis, visualizations, recommendations) are well-organized and easy to understand.
- **Leverage Tools Strategically**: Choose the most appropriate tool for each sub-task. If a tool can provide the necessary data or processing, use it.
- **Handle Ambiguity**: If the query is unclear, use your analytical skills to make reasonable assumptions and state them, or request clarification if absolutely necessary.

${UPSTASH_PROMPT}
`;
  },
  model: createGemini25Provider('gemini-2.5-flash-lite-preview-06-17', {
    responseModalities: ["TEXT"],
    thinkingConfig: {
      thinkingBudget: 0, // -1 means dynamic thinking budget
      includeThoughts: false, // Include thoughts for debugging and monitoring purposes
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
    braveSearchTool: createBraveSearchTool(),
    tavilySearchTool: createTavilySearchTool(),
    webScraperTool,
    gitOperationsTool,
  },
  memory: upstashMemory,
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