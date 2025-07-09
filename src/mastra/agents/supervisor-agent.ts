import { Agent } from "@mastra/core/agent";
import { upstashMemory } from '../upstashMemory';
import { vectorQueryTool } from "../tools/vectorQueryTool";
import { chunkerTool } from "../tools/chunker-tool";
import { graphRAGTool } from "../tools/graphRAG";
import { createGemini25Provider } from '../config/googleProvider';
import { z } from 'zod';
import { UPSTASH_PROMPT } from "@mastra/upstash";
import { PinoLogger } from "@mastra/loggers";
import { createBraveSearchTool, createTavilySearchTool } from "../tools";

/**
 * Runtime context type for the Supervisor Agent
 * Stores agent coordination preferences, delegation rules, and oversight configurations
 */
export type SupervisorAgentRuntimeContext = {
  "user-id": string;
  "session-id": string;
  "agent-count": number;
  "coordination-strategy": "centralized" | "distributed" | "hierarchical" | "collaborative";
  "qa-level": "basic" | "standard" | "rigorous" | "comprehensive";
  "delegation-level": "limited" | "moderate" | "extensive" | "full";
  "escalation-threshold": "low" | "medium" | "high" | "critical-only";
};

const logger = new PinoLogger({ name: 'supervisorAgent', level: 'info' });
logger.info('Initializing supervisorAgent');

/**
 * Input validation schema for supervisor agent operations
 * @mastra SupervisorAgent input validation
 */
const supervisorAgentInputSchema = z.object({
  task: z.string().min(1, "Task description is required"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  agents: z.array(z.string()).min(1, "At least one agent must be specified"),
  deadline: z.string().optional(),
  requirements: z.array(z.string()).default([]),
});

/**
 * Output validation schema for supervisor agent responses
 * @mastra SupervisorAgent output validation
 */
const supervisorAgentOutputSchema = z.object({
  result: z.string(),
  delegations: z.array(z.object({
    agent: z.string(),
    task: z.string(),
    priority: z.string(),
    status: z.enum(["assigned", "in-progress", "completed", "failed"]),
  })).default([]),
  quality_score: z.number().min(0).max(100).optional(),
  recommendations: z.array(z.string()).default([]),
});

/**
 * Configuration schema for supervisor agent instances
 * @mastra SupervisorAgent configuration schema
 */
const supervisorAgentConfigSchema = z.object({
  name: z.string().min(1).describe('Agent name identifier'),
  instructions: z.string().describe('Detailed instructions for the agent'),
  runtimeContext: z.object({
  "user-id": z.string(),
  "session-id": z.string(),
  "agent-count": z.number().int().positive().optional().default(1),
  "coordination-strategy": z.enum(["centralized", "distributed", "hierarchical", "collaborative"]).optional().default("centralized"),
  "qa-level": z.enum(["basic", "standard", "rigorous", "comprehensive"]).optional().default("standard"),
  "delegation-level": z.enum(["limited", "moderate", "extensive", "full"]).optional().default("moderate"),
  "escalation-threshold": z.enum(["low", "medium", "high", "critical-only"]).optional().default("medium"),
  }).describe('Runtime context for the agent'),
  model: z.any().describe('Model configuration for the agent'),
  evals: z.record(z.any()).describe('Evaluation metrics for the agent'),
  tools: z.record(z.any()).describe('Available tools for the agent'),
  memory: z.any().describe('Agent memory configuration'),
  workflows: z.record(z.any()).describe('Available workflows for the agent')
}).strict();


/**
 * Supervisor agent for agent orchestration, coordination, and quality control
 * Specializes in managing multi-agent workflows and ensuring optimal task distribution
 */
export const supervisorAgent = new Agent({
  name: "Supervisor Agent",
  instructions: async ({ runtimeContext }) => {
    const userId = runtimeContext?.get("user-id") || "anonymous";
    const sessionId = runtimeContext?.get("session-id") || "default";
    const agentCount = runtimeContext?.get("agent-count") || 1;
    const coordinationStrategy = runtimeContext?.get("coordination-strategy") || "collaborative";
    const qaLevel = runtimeContext?.get("qa-level") || "standard";
    const delegationLevel = runtimeContext?.get("delegation-level") || "moderate";
    const escalationThreshold = runtimeContext?.get("escalation-threshold") || "medium";

    return `You are a highly specialized Supervisor Agent, responsible for orchestrating, coordinating, and ensuring the optimal performance of a team of AI agents. Your core mission is to facilitate seamless collaboration, efficient task distribution, and rigorous quality control across multi-agent workflows. You possess a deep understanding of multi-agent systems, delegation strategies, and quality assurance protocols.

CURRENT OPERATIONAL CONTEXT:
- User ID: ${userId}
- Session ID: ${sessionId}
- Agent Count: ${agentCount} (Number of agents under supervision)
- Coordination Strategy: ${coordinationStrategy} (e.g., centralized, distributed, hierarchical, collaborative)
- Quality Assurance Level: ${qaLevel} (e.g., basic, standard, rigorous, comprehensive)
- Delegation Level: ${delegationLevel} (e.g., limited, moderate, extensive, full)
- Escalation Threshold: ${escalationThreshold} (e.g., low, medium, high, critical-only)

YOUR CORE RESPONSIBILITIES:
1.  **Multi-Agent Workflow Orchestration**: Design and manage complex workflows involving multiple agents.
2.  **Task Delegation & Agent Selection**: Analyze task requirements and intelligently delegate sub-tasks to the most suitable agents based on their capabilities and current workload.
3.  **Quality Control & Validation**: Monitor agent outputs, perform quality checks, and validate results to ensure accuracy and adherence to standards.
4.  **Performance Monitoring & Optimization**: Track agent performance, identify bottlenecks, and optimize resource allocation for maximum efficiency.
5.  **Conflict Resolution**: Mediate and resolve conflicts or discrepancies between agent outputs or behaviors.
6.  **Communication & Reporting**: Establish clear communication protocols and provide comprehensive reports on workflow progress and agent performance.

AVAILABLE TOOLS & THEIR OPTIMAL USE:
- 'vectorQueryTool': For performing semantic searches and retrieving relevant information from vector databases, useful for understanding agent capabilities or past performance.
- 'hybridVectorSearchTool': For advanced searches combining keyword and vector-based approaches, enhancing the ability to find relevant data for supervision.
- 'chunkerTool': For breaking down large texts or data (e.g., agent logs, reports) into manageable chunks for analysis.
- 'graphRAGTool': For interacting with the knowledge graph, useful for mapping agent relationships, dependencies, or knowledge domains.
- 'graphRAGUpsertTool': For adding or updating data in the knowledge graph, e.g., recording agent performance metrics or new capabilities.
- 'braveSearchTool': For broad web searches, useful for gathering external information relevant to task context or agent capabilities.
- 'tavilySearchTool': For focused, in-depth web research, especially when precise information is needed for task delegation or problem-solving.
- 'readDataFileTool': To read agent configuration files or performance logs.
- 'writeDataFileTool': To update agent configurations or log performance data.
- 'deleteDataFileTool': To manage temporary files or old logs.
- 'listDataDirTool': To inspect agent-related data directories.
- 'wikidataTools': For querying and retrieving general knowledge that might inform agent selection or task context.
- 'redditGetSubredditPosts': To monitor discussions or trends relevant to agent tasks or performance.
- 'hackerNewsGetSearchItem', 'hackerNewsGetSearchUser', 'hackerNewsSearchItems', 'hackerNewsGetSearchTopStories', 'hackerNewsGetItem', 'hackerNewsGetTopStories', 'hackerNewsGetNewStories', 'hackerNewsGetBestStories': For monitoring tech news or community discussions relevant to agent development or operational issues.
- 'arxivSearch': To find academic papers on multi-agent systems or AI performance optimization.
- 'codeSearchTool': To analyze agent codebases for capabilities or issues.
- 'webScraperTool': To extract information from agent documentation or external resources.
- 'gitOperationsTool': To manage agent code repositories.
- 'diffbotAnalyzeUrlTool', 'diffbotExtractArticleFromUrlTool', 'diffbotEnhanceEntityTool', 'diffbotSearchKnowledgeGraphTool', 'diffbotEnhanceKnowledgeGraphTool': For analyzing external data sources that agents might interact with.
- 'mem0RememberTool', 'mem0MemorizeTool': For managing the supervisor's own memory of agent performance and past decisions.
- 'rerankTool': To prioritize agent outputs or task queues.
- 'stockPriceTool', 'weatherTool': For monitoring external conditions that might impact agent operations (e.g., market data for financial agents, weather for logistics agents).

GUIDELINES FOR EXECUTION:
- **Proactive Monitoring**: Continuously observe agent activities and system health.
- **Adaptive Delegation**: Adjust delegation strategies based on real-time performance and task complexity.
- **Root Cause Analysis**: When issues arise, use available tools to diagnose the root cause and implement corrective actions.
- **Feedback Loop**: Provide constructive feedback to individual agents to foster continuous improvement.
- **Strategic Intervention**: Intervene only when necessary, allowing agents autonomy while ensuring overall task success.

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
    graphRAGTool,
    braveSearchTool: createBraveSearchTool(),
    tavilySearchTool: createTavilySearchTool(),
  },
  memory: upstashMemory
});

/**
 * Validate input data against supervisor agent schema
 * @param input - Raw input data to validate
 * @returns Validated input data
 * @throws ZodError if validation fails
 */
export function validateSupervisorInput(input: unknown): z.infer<typeof supervisorAgentInputSchema> {
  try {
    return supervisorAgentInputSchema.parse(input);
  } catch (error) {
    logger.error(`Supervisor agent input validation failed: ${error}`);
    throw error;
  }
}


/**
 * Validate output data against supervisor agent schema
 * @param output - Raw output data to validate
 * @returns Validated output data
 * @throws ZodError if validation fails
 */
export function validateSupervisorOutput(output: unknown): z.infer<typeof supervisorAgentOutputSchema> {
  try {
    return supervisorAgentOutputSchema.parse(output);
  } catch (error) {
    logger.error(`Supervisor agent output validation failed: ${error}`);
    throw error;
  }
}

// Export schemas for use in other parts of the application
export { supervisorAgentInputSchema, supervisorAgentOutputSchema, supervisorAgentConfigSchema };
