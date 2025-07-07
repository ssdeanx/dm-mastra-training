/**
 * Agent Registry - Barrel file for all Mastra AI agents
 * Generated on June 10, 2025
 *
 * This file exports all available agents in the Dean Machines RSC platform,
 * providing a centralized registry for agent management and orchestration.
 */

// Core agents
export { masterAgent } from './master-agent';
export { weatherAgent } from './weather-agent';

// Specialized domain agents
export { researchAgent } from './research-agent';
export { synthesisAgent } from '../workflows/vnext-workflow';
export { supervisorAgent } from './supervisor-agent';
export { langGraphAgent } from './langgraph-agent';

// Import agents for registry
import { masterAgent } from './master-agent';
import { weatherAgent } from './weather-agent';
import { synthesisAgent } from '../workflows/vnext-workflow';
import { supervisorAgent } from './supervisor-agent';

import { analyzerAgent } from './analyzer-agent';
import { langGraphAgent } from './langgraph-agent';

// Additional exports for workflow usage
export { analyzerAgent } from './analyzer-agent';


// Runtime Context Types - Export all agent-specific runtime contexts
export type { MasterAgentRuntimeContext } from './master-agent';
export type { WeatherAgentRuntimeContext } from './weather-agent';;
export type { ResearchAgentRuntimeContext } from './research-agent';
export type { SupervisorAgentRuntimeContext } from './supervisor-agent';

export type { AnalyzerAgentRuntimeContext } from './analyzer-agent';
export type { LangGraphAgentRuntimeContext } from './langgraph-agent';

/**
 * Agent registry object for easy access and management
 * Provides a structured way to access all available agents
 */
export const agentRegistry = {
  // Core agents
  master: masterAgent,

  analyzer: analyzerAgent,

  supervisor: supervisorAgent,

  // Domain-specific agents
  weather: weatherAgent,

  langgraph: langGraphAgent,
  // Workflow agents
  synthesize: synthesisAgent,
} as const;

/**
 * Agent categories for organized access and management
 * Groups agents by their primary domain expertise
 */
export const agentCategories = {
  core: ['master', 'supervisor', 'analyzer',  'langgraph', 'research'] as const,
  development: ['master'] as const,
  data: ['research', 'weather'] as const,
  management: ['supervisor'] as const,
  operations: ['master'] as const,
  creative: ['synthesis'] as const,
  specialized: ['master'] as const,
} as const;

/**
 * Get agent by name with type safety
 * @param agentName - The name of the agent to retrieve
 * @returns The requested agent instance
 */
export function getAgent(agentName: keyof typeof agentRegistry) {
  return agentRegistry[agentName];
}

/**
 * Get agents by category
 * @param category - The category of agents to retrieve
 * @returns Array of agent instances in the specified category
 */
export function getAgentsByCategory(category: keyof typeof agentCategories) {
  return agentCategories[category].map(agentName => agentRegistry[agentName]);
}

/**
 * Get all available agent names
 * @returns Array of all agent names
 */
export function getAllAgentNames(): (keyof typeof agentRegistry)[] {
  return Object.keys(agentRegistry) as (keyof typeof agentRegistry)[];
}

/**
 * Check if an agent exists
 * @param agentName - The name of the agent to check
 * @returns True if the agent exists, false otherwise
 */
export function hasAgent(agentName: string): agentName is keyof typeof agentRegistry {
  return agentName in agentRegistry;
}

/**
 * Agent metadata for management and documentation
 */
export const agentMetadata = {
  master: { description: 'Master assistant for debugging and problem-solving', tags: ['core', 'debug', 'master'] },
  analyzer: { description: 'Data analysis and insights generation specialist', tags: ['core', 'data', 'analysis'] },
  supervisor: { description: 'Agent coordination and orchestration specialist', tags: ['supervisor', 'coordination', 'orchestration'] },
  weather: { description: 'Weather information and forecasting assistant', tags: ['weather', 'data', 'api'] },
  synthesis: { description: 'Research synthesis and report generation specialist', tags: ['synthesis', 'reporting', 'writing'] },
  research: { description: 'Research and information analysis specialist', tags: ['research', 'analysis', 'information'] },
  langgraph: { description: 'LangGraph agent for graph-based reasoning and analysis', tags: ['langgraph', 'graph', 'reasoning'] },
} as const;