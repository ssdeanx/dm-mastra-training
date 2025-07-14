import { Memory } from '@mastra/memory';
import { PostgresStore, PgVector } from '@mastra/pg';
import { z } from 'zod';
import { createGeminiEmbeddingModel } from './config/googleProvider';
import { AttentionGuidedMemoryProcessor, ContextualRelevanceProcessor, WorkflowAwareMemoryProcessor, BiasMitigationProcessor, ToolUsageTrackerProcessor, AgentInteractionPatternProcessor, MentalModelProcessor } from './processor-extra';
import { TokenLimiter, ToolCallFilter } from '@mastra/memory/processors';
import { PinoLogger } from '@mastra/loggers';

// Initialize logger
const logger = new PinoLogger({
  level: 'info',
  name: 'pg-memory',
});

logger.info('Initializing PostgreSQL memory store...');

// Environment variables for PostgreSQL connection
const storage = new PostgresStore({
  connectionString: process.env.DATABASE_URL || "",
});

const store = new PgVector({ connectionString: process.env.POSTGRES_CONNECTION_STRING || ""})

await store.createIndex({
  indexName: "myCollection",
  dimension: 768,
  metric: "cosine",
});
 
// TODO: Replace with actual embeddings data
// await store.upsert({
//   indexName: "myCollection",
//   vectors: embeddings,
//   metadata: chunks.map(chunk => ({ text: chunk.text })),
// });

// Define the schema for the todo list
const todoListSchema = z.object({
  items: z.array(
    z.object({
      description: z.string(),
      due: z.string().optional(),
      started: z.string().optional(),
      status: z.enum(['active', 'completed']).default('active'),
    })
  ),
});

// Initialize memory with PostgreSQL storage and vector search
export const pgmemory = new Memory({
  storage: storage,
  vector: store,
  embedder: createGeminiEmbeddingModel('models/text-embedding-004', { outputDimensionality: 768, taskType: 'SEMANTIC_SIMILARITY'}),
  options: {
    lastMessages: 500,
    semanticRecall: {
      topK: 3,
      messageRange: 2,
    },
  workingMemory: {
      enabled: true,
      schema: todoListSchema,
    },
  },
  processors: [
     new TokenLimiter(1000000), // 1M token limit for context
    new ToolCallFilter({
      exclude: [], // Include all tool calls for better context
    }),
    new AttentionGuidedMemoryProcessor({
      maxMessages: 5,
      similarityThreshold: 0.7,
      importanceKeywords: ['urgent', 'important'],
      verboseMessageThreshold: 3,
      contextPreservationRatio: 0.8,
    }),
    new ContextualRelevanceProcessor({
      topicContinuityThreshold: 0.5,
      maxTopicShifts: 3,
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
    }),
    new BiasMitigationProcessor({
      detectionStrategies: ['confirmation', 'recency', 'framing', 'anchoring', 'availability', 'overconfidence', 'bandwagon', 'status-quo', 'survivorship-bias', 'outgroup-bias', 'in-group-bias', 'negativity-bias', 'optimism-bias', 'self-serving-bias', 'hindsight-bias', 'fundamental-attribution-error', 'halo-effect', 'horns-effect', 'confirmation-bias'],
      mitigationStrategies: ['re-weight', 'rephrase', 'add-counter-arguments', 'remove', 'flag', 'ignore', 'contextualize', 'reframe', 'balance', 'rephrase', 're-weight', 'add-counter-arguments', 'remove'],
      biasThreshold: 0.8,
    }),
    new ToolUsageTrackerProcessor({
      logInterval: 5000, // Log every 5 seconds
    }),
    new AgentInteractionPatternProcessor({
      sequenceLength: 15,
    }),
    new MentalModelProcessor(),
  ],
});

export const pg = {
  memory: pgmemory,
  vector: pgmemory.vector,
  store: pgmemory.storage,
};
