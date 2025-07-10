/**
 * Agent Registry - Barrel file for all Mastra AI agents
 * Generated on June 10, 2025
 *
 * This file exports all available agents in the Dean Machines RSC platform,
 * providing a centralized registry for agent management and orchestration.
 */


// Core agents
import { masterAgent } from './master-agent';
import { weatherAgent } from './weather-agent';
import { analyzerAgent } from './analyzer-agent';
import { supervisorAgent } from './supervisor-agent';

// Specialized/domain agents
import { researchAgent } from './research-agent';
import { dataAgent } from './data-agent';
import { langGraphAgent } from './langgraph-agent';
import { chanceAgent } from './chance-agent';
import { mappingAgent } from './mapping-agent';

import { generationAgent } from './generation-agent'; // Import the new agent

// Export all agents for external use
export { masterAgent } from './master-agent';
export { weatherAgent } from './weather-agent';
export { analyzerAgent } from './analyzer-agent';
export { supervisorAgent } from './supervisor-agent';
export { researchAgent } from './research-agent';
export { dataAgent } from './data-agent';
export { langGraphAgent } from './langgraph-agent';
export { chanceAgent } from './chance-agent';
export { mappingAgent } from './mapping-agent';
export { synthesisAgent } from '../workflows/vnext-workflow';
export { generationAgent } from './generation-agent'; // Export the new agent

// Runtime Context Types - Export all agent-specific runtime contexts
export type { MasterAgentRuntimeContext } from './master-agent';
export type { WeatherAgentRuntimeContext } from './weather-agent';
export type { ResearchAgentRuntimeContext } from './research-agent';
export type { DataAgentRuntimeContext } from './data-agent';
export type { SupervisorAgentRuntimeContext } from './supervisor-agent';
export type { AnalyzerAgentRuntimeContext } from './analyzer-agent';
export type { LangGraphAgentRuntimeContext } from './langgraph-agent';
export type { ChanceAgentRuntimeContext } from './chance-agent';
export type { MappingAgentRuntimeContext } from './mapping-agent';
export type { GenerationAgentRuntimeContext } from './generation-agent'; // Export the new runtime context

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
  research: researchAgent,
  data: dataAgent,
  langgraph: langGraphAgent,
  chance: chanceAgent,
  mapping: mappingAgent,
  generation: generationAgent, // Add the new agent to the registry

  // Workflow agents
} as const;

/**
 * Agent categories for organized access and management
 * Groups agents by their primary domain expertise
 */

export const agentCategories = {
  core: ['master', 'supervisor', 'analyzer', 'weather', 'langgraph', 'research', 'data', 'chance', 'mapping', 'generation'] as const, // Add 'generation' to core
  development: ['master'] as const,
  data: ['data', 'research', 'weather', 'generation'] as const, // Add 'generation' to data
  management: ['supervisor'] as const,
  operations: ['master'] as const,
  creative: ['generation'] as const, // Add 'generation' to creative
  specialized: ['master', 'generation'] as const, // Add 'generation' to specialized
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
  master: {
    description: 'Master assistant for debugging and problem-solving',
    tags: ['core', 'debug', 'master']
  },
  analyzer: {
    description: 'Data analysis and insights generation specialist',
    tags: ['core', 'data', 'analysis']
  },
  supervisor: {
    description: 'Agent coordination and orchestration specialist',
    tags: ['supervisor', 'coordination', 'orchestration']
  },
  weather: {
    description: 'Weather information and forecasting assistant',
    tags: ['weather', 'data', 'api']
  },
  synthesis: {
    description: 'Research synthesis and report generation specialist',
    tags: ['synthesis', 'reporting', 'writing']
  },
  research: {
    description: 'Research and information analysis specialist',
    tags: ['research', 'analysis', 'information']
  },
  data: {
    description: 'Secure file and directory operations agent for the data/ folder',
    tags: ['data', 'file', 'management', 'secure']
  },
  langgraph: {
    description: 'LangGraph agent for graph-based reasoning and analysis',
    tags: ['langgraph', 'graph', 'reasoning']
  },
  chance: {
    description: 'Agent for decision-making under uncertainty, balancing exploration and exploitation',
    tags: ['core', 'decision-making', 'uncertainty', 'stochastic']
  },
  mapping: {
    description: 'Agent for data transformation and schema mapping',
    tags: ['core', 'data', 'transformation', 'mapping']
  },
  generation: { // Add metadata for the new agent
    description: 'Agent for diverse content generation (text, code, prompts, reports, summaries)',
    tags: ['core', 'content', 'generation', 'creative']
  },
} as const;