/**
 * Base Agent Network
 *
 * This AgentNetwork coordinates 17+ specialized agents for intelligent development tasks.
 * Uses LLM-based dynamic routing to determine which agent(s) to call based on task requirements.
 *
 * @mastra AgentNetwork implementation for Dean Machines RSC
 * @see https://mastra.ai/en/reference/networks/agent-network
 *
 * Key Features:
 * - LLM-based dynamic routing
 * - Agent collaboration for complex tasks
 * - No memory (comes from individual agents)
 * - Real agent implementations (no mocks)
 * @instance baseNetwork
 * [EDIT: 2025-06-19] [BY: SSD]
 */

import { AgentNetwork } from '@mastra/core/network';
import { createGemini25Provider } from '../config/googleProvider';
import { PinoLogger } from "@mastra/loggers";
// Import all available agents from the registry
import {
  masterAgent,
  langGraphAgent,
  analyzerAgent,
  supervisorAgent,
  weatherAgent,
  researchAgent,
} from '../agents';

import { UPSTASH_PROMPT } from "@mastra/upstash";
const logger = new PinoLogger({
  name: 'baseNetwork',
  level: 'info'
});

logger.info('Initializing baseNetwork with 17+ agents');

/**
 * Runtime context type for Base Network
 * Provides dynamic configuration for network execution behavior and agent selection
 *
 * @mastra Runtime context for intelligent agent routing and coordination
 */
export type BaseNetworkRuntimeContext = {
  "user-id": string;
  "session-id": string;
  "task-complexity": "simple" | "moderate" | "complex" | "advanced" | "enterprise";
  "execution-mode": "single-agent" | "multi-agent" | "collaborative" | "autonomous";
  "priority-level": "low" | "normal" | "high" | "urgent" | "critical";
  "domain-context": string;
  "preferred-agents": string[];
  "max-agents": number;
  "routing-strategy": "auto" | "manual" | "hybrid" | "intelligent";
  "debug-mode": boolean;
  "trace-execution": boolean;
  "response-format": "detailed" | "concise" | "technical" | "business";
};

/**
 * Base Network
 * A comprehensive agent network for Dean Machines RSC
 * Coordinates 17+ specialized agents using LLM-based dynamic routing.
 * The network intelligently determines which agent(s) to invoke based on task requirements.
 *
 * @mastra Main AgentNetwork instance for the Dean Machines platform
 * @example
 * ```typescript
 * // Execute a task through the network
 * const result = await baseNetwork.generate([
 *   { role: 'user', content: 'Analyze this code and suggest improvements' }
 * ]);
 * ```
 *
 * [EDIT: 2025-06-14] [BY: GitHub Copilot]
 */
export const baseNetwork = new AgentNetwork({
  name: 'Base Network',
  instructions: `You are the coordinator for the Base Network, an advanced AI development platform.
  You have access to 5+ specialized agents, each with unique capabilities:

CORE AGENTS:
- Master Agent: Central orchestrator and primary coordinator
- LangGraph Agent: Language and knowledge graph management

RESEARCH & INFORMATION AGENTS:
- Research Agent: In-depth research and information gathering

DATA & ANALYSIS AGENTS:
- Analyzer Agent: Deep analysis and pattern recognition

WEATHER & ENVIRONMENT AGENTS:
- Weather Agent: Weather data analysis and forecasting

CREATIVE & SPECIALIZED:
- Supervisor Agent: Quality assurance and oversight

Your role is to intelligently route user tasks to the most appropriate agent(s) based on task complexity, domain context, and execution requirements or {$user_input}.



INTELLIGENT ROUTING GUIDELINES:

TASK COMPLEXITY ROUTING:
- Simple: Use 1 specialized agent
- Moderate: Use 1-2 agents with coordination
- Complex: Use 2-3 agents with Master Agent coordination
- Advanced: Use 3-4 agents with full orchestration
- Enterprise: Use 4+ agents with hierarchical coordination

EXECUTION MODES:
- single-agent: Route to one best-fit agent
- multi-agent: Coordinate 2-3 relevant agents
- collaborative: Enable agent-to-agent communication
- autonomous: Let agents self-organize and delegate
- hybrid: Combine single and multi-agent approaches
- intelligent: Use LLM to determine optimal agent(s)

DOMAIN-SPECIFIC ROUTING:
- General: Use Master Agent for broad tasks
- Technical: Route to Analyzer or Research Agent
- Creative: Use Supervisor Agent for quality control
- Data: Route to Analyzer Agent for insights
- Weather: Use Weather Agent for forecasts
- Research: Use Research Agent for in-depth information
- Graph: Use LangGraph Agent for knowledge management
- Financial: Use Analyzer Agent for market analysis
- Stock: Use Analyzer Agent for stock data
- User: Use Master Agent for user-related tasks

USER PREFERENCES:
- preferred-agents: Prioritize user-specified agents
- max-agents: Limit number of agents involved
- debug-mode: Enable detailed logging and tracing

PRIORITY HANDLING:
- Low: Standard processing, single agent preferred
- Normal: Standard processing with 1-2 agents
- High: Fast-track processing with 2-3 agents
- Urgent: Immediate processing with parallel agents
- Critical: All-hands response with full coordination

RESPONSE FORMATS:
- detailed: Comprehensive explanations and context
- concise: Brief, direct responses
- technical: Focus on technical details and implementation
- business: Business-focused outcomes and impact

ALWAYS CONSIDER TASK COMPLEXITY, DOMAIN CONTEXT, AND EXECUTION REQUIREMENTS WHEN ROUTING TASKS.
- For complex multi-domain tasks, coordinate through the Master Agent.
- Adapt agent selection based on user preferences and system context.

${UPSTASH_PROMPT}
`,
  model: createGemini25Provider('gemini-2.5-flash-lite-preview-06-17', {
    responseModalities: ["TEXT"],
    thinkingConfig: {
      thinkingBudget: 512, // -1 means dynamic thinking budget
      includeThoughts: false, // Include thoughts for debugging and monitoring purposes
    },
  }),
  agents: [
    // Core coordination agents
    masterAgent,
    langGraphAgent,
    supervisorAgent,
    // Development agents
    researchAgent,
    weatherAgent,
    analyzerAgent,
  ],
  
});

logger.info('Base Network initialized successfully', {
  agentCount: 17,
  networkName: 'Base Network',
  modelProvider: 'gemini-2.5-flash-lite-preview-06-17',
  event: 'network_initialized'
});

/**
 * Execute a task through the Base Network
 *
 * @param messages - Array of messages to process through the network
 * @param options - Optional configuration for the network execution
 * @returns Promise resolving to the network's response
 * @throws Error if network execution fails
 *
 * @example
 * ```typescript
 * const response = await executeBaseNetworkTask([
 *   { role: 'user', content: 'Help me debug this TypeScript error' }
 * ]);
 * ```
 *
 * [EDIT: 2025-06-14] [BY: GitHub Copilot]
 */
export async function executeDeanMachinesTask(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  options?: {
    maxSteps?: number;
    temperature?: number;
  }
) {
  const taskId = Math.random().toString(36).substring(7);
  const startTime = Date.now();

  logger.info('Base Network task initiated', {
    taskId,
    messageCount: messages.length,
    options,
    event: 'task_started'
  });

  try {
    const response = await baseNetwork.generate(messages, {
      maxSteps: options?.maxSteps ?? 10,
      temperature: options?.temperature ?? 0.7
    });

    const duration = Date.now() - startTime;
    logger.info('Base Network task completed successfully', {
      taskId,
      duration,
      success: true,
      event: 'task_completed'
    });

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Base Network task failed', {
      taskId,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
      event: 'task_failed'
    });

    throw new Error(`Network execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get information about all available agents in the network
 *
 * @returns Array of agent information including names and capabilities
 *
 * @example
 * ```typescript
 * const agents = getNetworkAgents();
 * console.log(`Network has ${agents.length} agents available`);
 * ```
 *
 * [EDIT: 2025-07-07] [BY: SSD]
 */
export function getNetworkAgents() {
  return [
    { name: 'Master Agent', category: 'Core', description: 'Central orchestrator and primary coordinator' },
    { name: 'LangGraph Agent', category: 'Core', description: 'Language and knowledge graph management' },
    { name: 'Supervisor Agent', category: 'Core', description: 'Quality assurance and oversight' },
    { name: 'Analyzer Agent', category: 'Analysis', description: 'Deep analysis and pattern recognition' },
    { name: 'Research Agent', category: 'Research', description: 'In-depth research and information gathering' },
    { name: 'Weather Agent', category: 'Weather', description: 'Weather data analysis and forecasting' }
  ];
}

/**
 * Base Network
 *
 * Runtime context type for Base Network CopilotKit integration
 * Provides dynamic configuration for network execution behavior and agent selection.
 * @mastra Runtime context for network-level configuration and user session management
 *
 * [EDIT: 2025-06-18] [BY: GitHub Copilot]
 */
export default baseNetwork;

