// vNext Agent Network Workflow - Powered by Mastra
import { NewAgentNetwork } from '@mastra/core/network/vNext';
import { Agent } from '@mastra/core/agent';
import { createGemini25Provider, createGeminiEmbeddingModel } from '../config/googleProvider';
import { RuntimeContext } from '@mastra/core/runtime-context';
import { PinoLogger } from "@mastra/loggers";
import { generateId } from 'ai';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { AttentionGuidedMemoryProcessor, ContextualRelevanceProcessor, WorkflowAwareMemoryProcessor, BiasMitigationProcessor } from '../upstashMemory';
// Agent imports
import { masterAgent } from '../agents/master-agent';
import { supervisorAgent } from '../agents/supervisor-agent';
import { researchAgent } from '../agents/research-agent';
import { analyzerAgent } from '../agents/analyzer-agent';
import { weatherWorkflow } from './weather-workflow';
import { chunkerTool, createBraveSearchTool, createTavilySearchTool, graphRAGTool, graphRAGUpsertTool, hybridVectorSearchTool, mem0MemorizeTool, mem0RememberTool, stockPriceTool, vectorQueryTool, weatherTool } from '../tools';

import { pinecone } from '../pinecone';
// Tool imports

/**
* This file defines the vNext Agent Network Workflow for Mastra, integrating various agents and workflows
* to handle complex tasks with enhanced memory management using LibSQL.
* It includes detailed logging for better traceability and debugging.
* @module vNextWorkflow
* @license MIT
* @version 0.11.0
* @author Dean Machines
* @description This module sets up the vNext Agent Network with specialized agents and workflows,
*              utilizing LibSQL for memory management and providing tools for various tasks.
* @requires @mastra/core
* @requires @mastra/memory
* @requires @mastra/libsql
* @requires @mastra/loggers
* @requires @mastra/tools
* @requires @mastra/core/runtime-context
* @requires @mastra/core/network/vNext
* @requires @mastra/core/agent
* @example
* import { vNextWorkflow } from './vnext-workflow';
* const result = await vNextWorkflow('Your task here', {
*  isComplex: true,
* maxIterations: 5,
* context: {
*   resourceId: 'user-123',
*  threadId: 'thread-456',
*  additionalContext: { key: 'value' }
* }
* });
* console.log(result);
* @see {@link https://mastra.ai/docs/vnext-workflow} for more details
* @see {@link https://mastra.ai/docs/agents} for agent documentation
* @see {@link https://mastra.ai/docs/tools} for tool documentation
* @see {@link https://mastra.ai/docs/memory} for memory management documentation
* @see {@link https://mastra.ai/docs/libsql} for LibSQL integration documentation
* @see {@link https://mastra.ai/docs/logging} for logging documentation
*/
export const memory = new Memory({
  storage: new LibSQLStore({
    url: process.env.VNEXT_URL || 'file:./data/mastra.db', // Or your database URL
    authToken: process.env.VNEXT_TOKEN || '', // Optional authentication token
  }),
  vector: pinecone, // Using Pinecone for vector storage
  embedder: createGeminiEmbeddingModel('text-embedding-004', {
    outputDimensionality: 1536, // optional, number of dimensions for the embedding
    taskType: 'SEMANTIC_SIMILARITY' as const,
  }),
  options: {
    lastMessages: 500,
    semanticRecall: {
      topK: 3,
      messageRange: {
        before: 2,
        after: 1,
      },
    },
    workingMemory: {
      enabled: true,
      template: `
# Information to remember
- User ID:
- Session ID:
- Thread ID:
- Resource ID:
- Task:
- Context:
- Additional Context:
- Notes:
- Date:
- Time:
- Location:
- Weather:
- Stock Prices:
- Research Findings:
- Analysis Results:
- Synthesis Report:
- Next Steps:
- Follow-up Actions:
- Additional Information:
- References:
- Links:
- Images:
- Attachments:
- Other Relevant Data:
- User Preferences:
- User Feedback:
- User History:
- User Interactions:
- User Goals:
- User Interests:
- User Challenges:
- User Achievements:
- User Feedback:
- User Suggestions:
- User Questions:
- User Comments:
`,
    },
    threads: {
      generateTitle: true,
    },
  },
  processors: [
    new AttentionGuidedMemoryProcessor({
      maxMessages: 50,
      similarityThreshold: 0.85,
      importanceKeywords: ['urgent', 'important', 'critical', 'error', 'bug', 'issue', 'task', 'goal'],
      verboseMessageThreshold: 500,
      contextPreservationRatio: 0.3,
    }),
    new ContextualRelevanceProcessor({
        topicContinuityThreshold: 0.7,
        maxTopicShifts: 4,
    }),
    new WorkflowAwareMemoryProcessor({
      workflowStages: ['data_collection', 'analysis', 'reporting'],
      defaultRetentionStrategy: 'prune_irrelevant',
      stageRelevanceStrategy: 'semantic',
      workflowStageDefinitions: {
        data_collection: 'Collecting data from various sources',
        analysis: 'Analyzing collected data for insights',
        reporting: 'Generating reports based on analysis'
      },
      semanticRelevanceThreshold: 0.7,
      attentionGuidedProcessor: new AttentionGuidedMemoryProcessor({
        maxMessages: 50,
        similarityThreshold: 0.85,
        importanceKeywords: ['urgent', 'important', 'critical', 'error', 'bug', 'issue', 'task', 'goal', 'high-priority', 'actionable', 'decision', 'risk', 'security', 'performance', 'update', 'fix', 'solution', 'insight', 'analysis', 'data', 'workflow', 'status', 'progress', 'blocker', 'verify', 'validate', 'report', 'action', 'feedback', 'optimize', 'efficiency', 'integrity', 'coordination', 'strategy', 'outcome'],
        verboseMessageThreshold: 500,
        contextPreservationRatio: 0.3,
      }),
    }),
    new BiasMitigationProcessor({
      detectionStrategies: ['confirmation', 'recency', 'anchoring', 'availability', 'framing', 'bandwagon', 'overconfidence', ],
      mitigationStrategies: ['re-weight', 'add-counter-arguments', 'remove', 'flag', 'ignore', 'contextualize', 'reframe', 'balance'],
    }),
  ],
});



// Logger setup
const logger = new PinoLogger({ name: 'vNextWorkflow', level: 'info' });
logger.info('Initializing vNext Agent Network Workflow');
logger.info('[vNextWorkflow] Before NewAgentNetwork instantiation.');

// Define agents
export const synthesisAgent = new Agent({
  name: 'synthesis-agent',
  description: 'Synthesizes researched material into comprehensive reports',
  instructions: 'Write detailed reports in full paragraphs without bullet points',
  model: createGemini25Provider('gemini-2.5-flash-lite-preview-06-17', {
    // Response modalities - what types of content the model can generate
    responseModalities: ["TEXT"], // Can also include "IMAGE" for image generation
    // Thinking configuration for enhanced reasoning
    thinkingConfig: {
      thinkingBudget: 1024, // -1 = dynamic budget, 0 = disabled, 1-24576 = fixed budget
      includeThoughts: true, // Include reasoning process in response for debugging
    },
    // Search grounding for real-time information access
    useSearchGrounding: true, // Enable Google Search integration for current events
    // Dynamic retrieval configuration
    dynamicRetrieval: true, // Let model decide when to use search grounding
    // Safety settings level
    safetyLevel: 'OFF', // Options: 'STRICT', 'MODERATE', 'PERMISSIVE', 'OFF'
    // Structured outputs for better tool integration
    structuredOutputs: true,
  }),
  memory: memory,
});

// Agent collection
const vNextAgents = {
  'master-agent': masterAgent,
  'supervisor-agent': supervisorAgent,
  'research-agent': researchAgent,
  'synthesis-agent': synthesisAgent,
  'analyzer-agent': analyzerAgent,
};

// Workflow collection
const vNextWorkflows = {
  'weather-workflow': weatherWorkflow,
};

// Network configuration (EXACTLY as per documentation)
let vNextNetwork: NewAgentNetwork;
try {
  vNextNetwork = new NewAgentNetwork({
    id: 'dean-machines-vnext',
    name: 'Dean Machines vNext Network',
    instructions: 'Orchestrate tasks across specialized agents and workflows',
    model: createGemini25Provider('gemini-2.5-flash-lite-preview-06-17', {
      // Response modalities - what types of content the model can generate
      responseModalities: ["TEXT"], // Can also include "IMAGE" for image generation
      // Thinking configuration for enhanced reasoning
      thinkingConfig: {
        thinkingBudget: -1, // -1 = dynamic budget, 0 = disabled, 1-24576 = fixed budget
        includeThoughts: true, // Include reasoning process in response for debugging
      },
      // Search grounding for real-time information access
      useSearchGrounding: true, // Enable Google Search integration for current events
      // Dynamic retrieval configuration
      dynamicRetrieval: true, // Let model decide when to use search grounding
      // Safety settings level
      safetyLevel: 'OFF', // Options: 'STRICT', 'MODERATE', 'PERMISSIVE', 'OFF'
      // Structured outputs for better tool integration
      structuredOutputs: true,
    }),
    agents: vNextAgents,
    workflows: vNextWorkflows,
    memory: memory, // Using LibSQLStore for memory management
    tools: {
      graphRAGTool,
      graphRAGUpsertTool,
      mem0RememberTool,
      mem0MemorizeTool,
      chunkerTool,
      vectorQueryTool,
      hybridVectorSearchTool,
      weatherTool,
      stockPriceTool,
      braveSearchTool: createBraveSearchTool(),
      tavilySearchTool: createTavilySearchTool(),
      }, // No additional tools at the network level
  });
  logger.info('[vNextWorkflow] After NewAgentNetwork instantiation.');
} catch (error: unknown) {
  logger.error(`[vNextWorkflow] Error during NewAgentNetwork instantiation: ${(error as Error).message}`);
  throw error; // Re-throw the error to ensure the application still crashes
}
// Single task execution (as per documentation)
export async function vNextSingleTask(task: string, options: {
  resourceId?: string;
  threadId?: string;
  context?: Record<string, unknown>;
} = {}) {
  const runtimeContext = new RuntimeContext();

  // Generate or use provided resourceId and threadId
  const resourceId = options.resourceId || (options.context?.resourceId as string) || `user-${generateId()}`;
  const threadId = options.threadId || (options.context?.threadId as string) || `thread-${generateId()}`;

  runtimeContext.set('user-id', resourceId);
  runtimeContext.set('session-id', threadId); // Use session-id as threadId for consistency with upstashMemory

  // Ensure the thread exists in LibSQL before proceeding
  await memory.createThread({ resourceId, threadId });
  const thread = await memory.getThreadById({ threadId });
  logger.info(`Thread status after creation: ${thread ? 'Found' : 'Not Found'} for threadId: ${threadId}`);

  logger.info(`vNextNetwork.generate called with: runtimeContext.session-id=${runtimeContext.get('session-id')}, options.threadId=${options.threadId}`);
  // Ensure threadId and resourceId are explicitly set in options for NewAgentNetwork
  const networkOptions = {
    ...options,
    threadId: threadId,
    resourceId: resourceId
  };
  return vNextNetwork.generate(task, {
    runtimeContext,
    ...networkOptions
  });
}

// Complex task execution (as per documentation)
export async function vNextComplexTask(task: string, options: {
  resourceId?: string;
  threadId?: string;
  maxIterations?: number;
  context?: Record<string, unknown>;
} = {}) {
  const runtimeContext = new RuntimeContext();

  // Generate or use provided resourceId and threadId
  const resourceId = options.resourceId || (options.context?.resourceId as string) || `user-${generateId()}`;
  const threadId = options.threadId || (options.context?.threadId as string) || `thread-${generateId()}`;

  runtimeContext.set('user-id', resourceId);
  runtimeContext.set('session-id', threadId); // Use session-id as threadId for consistency with upstashMemory

  // Ensure the thread exists in LibSQL before proceeding
  await memory.createThread({ resourceId, threadId });
  const thread = await memory.getThreadById({ threadId });
  logger.info(`Thread status after creation: ${thread ? 'Found' : 'Not Found'} for threadId: ${threadId}`);

  logger.info(`vNextNetwork.loop called with: runtimeContext.session-id=${runtimeContext.get('session-id')}, options.threadId=${options.threadId}`);
  // Ensure threadId and resourceId are explicitly set in options for NewAgentNetwork
  const networkOptions = {
    ...options,
    threadId: threadId,
    resourceId: resourceId
  };
  return vNextNetwork.loop(task, {
    runtimeContext,
    ...networkOptions
  });
}


/**
 * Main vNext Workflow function that routes to single or complex execution
 */
export async function vNextWorkflow(task: string, options: {
  isComplex?: boolean;
  maxIterations?: number;
  context?: Record<string, unknown>;
} = {}) {
  if (options.isComplex) {
    return vNextComplexTask(task, {
      maxIterations: options.maxIterations,
      context: options.context
    });
  } else {
    return vNextSingleTask(task, {
      context: options.context
    });
  }
}



// Export the network for direct usage if needed
export { vNextNetwork };

logger.info('vNext Agent Network Workflow registered successfully', {
  workflowId: 'dean-machines-vnext',
  agentsCount: Object.keys(vNextAgents).length,
  event: 'vnext_network_registered'
});
