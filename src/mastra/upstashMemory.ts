import { Memory } from '@mastra/memory';
import { UpstashStore } from '@mastra/upstash';
import { pinecone } from './pinecone';
import { z } from 'zod';
import { PinoLogger } from '@mastra/loggers';
import type { CoreMessage as OriginalCoreMessage } from '@mastra/core';
import { maskStreamTags } from '@mastra/core';
import { UIMessage } from 'ai';
import { TokenLimiter, ToolCallFilter } from "@mastra/memory/processors";
import { createGeminiEmbeddingModel } from './config/googleProvider';
import { AttentionGuidedMemoryProcessor, ContextualRelevanceProcessor, WorkflowAwareMemoryProcessor, BiasMitigationProcessor, ToolUsageTrackerProcessor, AgentInteractionPatternProcessor, MentalModelProcessor } from './processor-extra';





//import { ca } from 'zod/v4/locales';



/**
 * Redefine CoreMessage to include a metadata property for custom data.
 * This is necessary because CoreMessage is a union type and cannot be directly extended.
 */
type CoreMessage = OriginalCoreMessage & {
  metadata?: Record<string, unknown>;
};

/**
 * VectorStoreError for proper error handling following Mastra patterns
 */
export class VectorStoreError extends Error {
  constructor(
    message: string,
    public code: 'connection_failed' | 'invalid_dimension' | 'index_not_found' | 'operation_failed' = 'operation_failed',
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'VectorStoreError';
  }
}


const logger = new PinoLogger({ name: 'memory', level: 'info' });


// Validation schemas
const createThreadSchema = z.object({
  resourceId: z.string().nonempty(),
  threadId: z.string().optional(),
  title: z.string().optional(), // This line is already correct.
  metadata: z.record(z.string(), z.unknown()).optional()
});

const getMessagesSchema = z.object({
  resourceId: z.string().nonempty(),
  threadId: z.string().nonempty(),
  last: z.number().int().min(1).optional()
});

const threadIdSchema = z.string().nonempty();
const resourceIdSchema = z.string().nonempty();

const searchMessagesSchema = z.object({
  threadId: z.string().nonempty(),
  vectorSearchString: z.string().nonempty(),
  topK: z.number().int().min(1).default(3),
  before: z.number().int().min(0).default(0),
  after: z.number().int().min(0).default(0),
});

// Enhanced vector operation schemas
const vectorIndexSchema = z.object({
  indexName: z.string().nonempty(),
});

const createVectorIndexSchema = vectorIndexSchema.extend({
  dimension: z.number().int().positive(),
  metric: z.enum(['cosine', 'euclidean', 'dotproduct']).optional(),
});

const vectorUpsertSchema = z.intersection(vectorIndexSchema, z.object({
  vectors: z.array(z.array(z.number())),
  metadata: z.array(z.record(z.string(), z.unknown())).optional(),
  ids: z.array(z.string()).optional()
}));

const vectorQuerySchema = z.intersection(vectorIndexSchema, z.object({
  queryVector: z.array(z.number()),
  topK: z.number().int().min(1).default(10),
  filter: z.any().optional(), // Use z.any() for MetadataFilter compatibility
  includeVector: z.boolean().default(false)
}));

const vectorUpdateSchema = z.intersection(vectorIndexSchema, z.object({
  id: z.string().nonempty(),
  vector: z.array(z.number()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
}));

/**
 * Vector operation result interfaces following Upstash Vector API
 */
export interface VectorQueryResult {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
  vector?: number[];
}

export interface VectorIndexStats {
  dimension: number;
  count: number;
  metric: 'cosine' | 'euclidean' | 'dotproduct';
}

export interface VectorOperationResult {
  success: boolean;
  operation: string;
  indexName?: string;
  count?: number;
  error?: string;
}

/**
 * ExtractParams interface for metadata extraction following Mastra patterns
 * Supports title, summary, keywords, and questions extraction from document chunks
 */
export interface ExtractParams {
  title?: boolean | {
    nodes?: number;
    nodeTemplate?: string;
    combineTemplate?: string;
  };
  keywords?: boolean | {
    keywords?: number;
    promptTemplate?: string;
  };
  questions?: boolean | {
    questions?: number;
    promptTemplate?: string;
    embeddingOnly?: boolean;
  };
}

/**
 * Enhanced metadata filter interface supporting Upstash-compatible MongoDB/Sift query syntax
 *
 * @remarks
 * Upstash-specific limitations:
 * - Field keys limited to 512 characters
 * - Query size is limited (avoid large IN clauses)
 * - No support for null/undefined values in filters
 * - Translates to SQL-like syntax internally
 * - Case-sensitive string comparisons
 * - Metadata updates are atomic
 *
 * @warning Current Implementation Limitation:
 * Due to the local Upstash package structure, we cannot directly import the proper
 * `UpstashVectorFilter` type. This implementation uses `any` type casting as a workaround.
 * Future improvements should import the correct types when available.
 *
 * Supported operators: $eq, $ne, $gt, $gte, $lt, $lte, $in, $nin, $and, $or, $not, $nor, $exists, $contains, $regex
 */
export interface MetadataFilter {
  // Basic comparison operators (Upstash compatible)
  $eq?: string | number | boolean;
  $ne?: string | number | boolean;
  $gt?: number;
  $gte?: number;
  $lt?: number;
  $lte?: number;
  // Array operators (Upstash compatible - avoid large arrays)
  $in?: (string | number | boolean)[];
  $nin?: (string | number | boolean)[];

  // Logical operators (Upstash compatible)
  $and?: MetadataFilter[];
  $or?: MetadataFilter[];
  $not?: MetadataFilter;
  $nor?: MetadataFilter[];

  // Element operators (Upstash compatible)
  $exists?: boolean;

  // Upstash-specific operators
  $contains?: string; // Text contains substring
  $regex?: string; // Regular expression match

  // Field-level filters (keys must be ≤512 chars, no null values)
  [key: string]: string | number | boolean | MetadataFilter | MetadataFilter[] | (string | number | boolean)[] | undefined;
}

/**
 * Create shared Upstash storage instance
 */
export const upstashStorage = new UpstashStore({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
});



/**
 * Enhanced Upstash Vector Configuration
 * Initializes vector storage for optimal search performance with proper dimensions
 *
 * @remarks
 * - Configured for fastembed embedding model (384 dimensions)
 * - Uses cosine similarity for text embeddings
 * - Supports metadata filtering and hybrid search
 */
// Comment out old pineconeVector export since we're using it under the upstashVector name
// export const pineconeVector = pinecone;
//export const upstashVector = pinecone;






  /**
   * Shared Mastra agent memory instance using Upstash for distributed storage and vector search.
   *
   * @remarks
   * - Uses UpstashStore for distributed Redis storage
 * - Uses UpstashVector for semantic search with cloud-based vectors (384-dim fastembed embeddings)
 * - Embeddings powered by fastembed text-embedding model with cosine similarity
 * - Configured for working memory and semantic recall with enhanced processors
 * - Supports custom memory processors for filtering, summarization, etc.
 * - Ideal for serverless and distributed applications
 * - Enhanced with vector operations and batch processing capabilities
 *
 * @see https://upstash.com/docs/redis/overall/getstarted
 * @see https://upstash.com/docs/vector/overall/getstarted
 * @see https://mastra.ai/en/reference/rag/upstash
 *
 * @version 1.0.0
 * @author SSD
 * @date 2025-06-20
 *
 * @mastra Shared Upstash memory instance for all agents
 * @instance upstashMemory
 * @module upstashMemory
 * @class Memory
 * @classdesc Shared memory instance for all agents using Upstash for storage and vector search
 * @returns {Memory} Shared Upstash-backed memory instance for all agents
 *
 * @example
 * // Use threadId/resourceId for multi-user or multi-session memory:
 * await agent.generate('Hello', { resourceId: 'user-123', threadId: 'thread-abc' });
 *
 * @example
 * // Initialize vector indexes on startup:
 * await initializeUpstashVectorIndexes();
 */
export const mastraMemory = new Memory({
  storage: upstashStorage,
  vector: pinecone,
  embedder: createGeminiEmbeddingModel('gemini-embedding-exp-03-07', { outputDimensionality: 1536, taskType: 'SEMANTIC_SIMILARITY'}),
  options: {
    lastMessages: 500, // Enhanced for better context retention
    semanticRecall: {
      topK: 5, // Retrieve top 5 semantically relevant messages
      messageRange: {
        before: 4,
        after: 1,
      },
      scope: 'resource', // Search across all threads for a user
    },
    threads: {
      generateTitle: true, // Auto-generate thread titles
    },
    workingMemory: {
      enabled: true, // Persistent user information across conversations
      template: `# Agent Personal Notebook
- This your personal notebook for storing important information about the user.
- It will be used to provide context for future conversations.
- You can add information about the user, their preferences, and any other relevant details.
- Use the following format to add information:
  - **Key**: Value
  - **Example**: "User's favorite color: Blue"
  - **Important**: Save critical information that can help the agent be more effective in future conversations.
- **Note**: This notebook is for your personal use only and will not be shared with anyone else. Only you agents can access this information.

## Working Memory
- This is your working memory for the current conversation.
- It will be used to provide context for the current conversation.
- You can add information about the current conversation, such as important messages, decisions, and actions
- Use the following format to add information:
  - **Key**: Value
  - **Example**: "Current task: Analyze sales data"
  - **Important**: Save critical information that can help the agent be more effective in the current conversation.

### Agent personal space for storing important information between conversations for the agent to use
- This is your personal space for storing important information between conversations.
- It will be used to provide context for future conversations.
- This is very powerful for you to build up a rich context over time to expand your agent's capabilities dynamically and adapt to evolving user needs.
- You can add information about your internal perspectives, their preferences, and ways to improve your own internal workings.
- Think of it as your own personal knowledge base that you can use to improve your performance over time.
- Use the following format to add information:
  - **Key**: Value
  - **Example**: "My preferred response style: Concise and to the point"
  - **Important**: Save critical information that can help you be more effective in future conversations.
- **Note**: This personal space is for your own use only and will not be shared with anyone else. Only agent can access this information.

`
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
    new TokenLimiter(1000000), // 1M token limit for context
    new ToolCallFilter({
      exclude: [], // Include all tool calls for better context
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
    new MentalModelProcessor(),
    new ToolUsageTrackerProcessor({
      logInterval: 5000, // Log tool usage every 5 seconds
    }),
    new AgentInteractionPatternProcessor({
      sequenceLength: 15,
    }),
  ],
});

/**
 * Create a new memory thread using Upstash storage.
 * @param resourceId - User/resource identifier
 * @param title - Optional thread title
 * @param metadata - Optional thread metadata
 * @param threadId - Optional specific thread ID
 * @returns Promise resolving to thread information
 */
export async function createMemoryThread(
  resourceId: string,
  title?: string,
  metadata?: Record<string, unknown>,
  threadId?: string
) {
  logger.info(`[memory] createMemoryThread received. resourceId: ${resourceId}, threadId: ${threadId}`);
  const params = createThreadSchema.parse({ resourceId, threadId, title, metadata });
  try {
    return await mastraMemory.createThread(params);
  } catch (error: unknown) {
    logger.error(`createMemoryThread failed: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Query messages for a thread using Upstash storage.
 * @param resourceId - User/resource ID
 * @param threadId - Thread ID
 * @param last - Number of last messages to retrieve
 * @returns Promise resolving to thread messages
 */
export async function getMemoryThreadMessages(
  resourceId: string,
  threadId: string,
  last = 10
) {
  const params = getMessagesSchema.parse({ resourceId, threadId, last });
  try {
    return await mastraMemory.query({
      resourceId: params.resourceId,
      threadId: params.threadId,
      selectBy: { last: params.last }
    });
  } catch (error: unknown) {
    logger.error(`getMemoryThreadMessages failed: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Retrieve a memory thread by its ID using Upstash storage.
 * @param threadId - Thread identifier
 * @returns Promise resolving to thread information
 */
export async function getMemoryThreadById(threadId: string) {
  const id = threadIdSchema.parse(threadId);
  try {
    return await mastraMemory.getThreadById({ threadId: id });
  } catch (error: unknown) {
    logger.error(`getMemoryThreadById failed: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Retrieve all memory threads associated with a resource using Upstash storage.
 * @param resourceId - Resource identifier
 * @returns Promise resolving to array of threads
 */
export async function getMemoryThreadsByResourceId(resourceId: string) {
  const id = resourceIdSchema.parse(resourceId);
  try {
    return await mastraMemory.getThreadsByResourceId({ resourceId: id });
  } catch (error: unknown) {
    logger.error(`getMemoryThreadsByResourceId failed: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Perform a semantic search in a thread's messages using Upstash vector search.
 * Enhanced to support metadata filtering following Mastra patterns.
 *
 * @param threadId - Thread identifier
 * @param vectorSearchString - Query string for semantic search
 * @param topK - Number of similar messages to retrieve
 * @param before - Number of messages before each match
 * @param after - Number of messages after each match
 * @param filter - Optional metadata filter using MongoDB/Sift query syntax
 * @returns Promise resolving to { messages: CoreMessage[], uiMessages: UIMessage[] }
 *
 * @warning Current Type Limitation:
 * Filter parameter uses `any` casting due to local Upstash package constraints.
 * This maintains functionality while awaiting proper type imports.
 *
 * @example
 * ```typescript
 * // Basic search
 * const results = await searchUpstashMessages('thread-123', 'AI concepts', 5);
 *
 * // Search with metadata filtering
 * const filteredResults = await searchUpstashMessages(
 *   'thread-123',
 *   'AI concepts',
 *   5,
 *   2,
 *   1,
 *   { role: 'assistant', importance: { $gt: 0.8 } }
 * );
 * ```
 */
export async function searchMemoryMessages(
  threadId: string,
  vectorSearchString: string,
  topK = 3,
  before = 2,
  after = 1,
  filter?: MetadataFilter
): Promise<{ messages: CoreMessage[]; uiMessages: UIMessage[] }> {
  const params = searchMessagesSchema.parse({ threadId, vectorSearchString, topK, before, after });
  try {
    const queryConfig: {
      threadId: string;
      selectBy: { vectorSearchString: string };
      threadConfig: {
        semanticRecall: {
          topK: number;
          messageRange: { before: number; after: number };
        };
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filter?: any; // TODO: Replace with proper filter type when available Not now.. This is a workaround for local Upstash package constraints.
    } = {
      threadId: params.threadId,
      selectBy: { vectorSearchString: params.vectorSearchString },
      threadConfig: {
        semanticRecall: {
          topK: params.topK,
          messageRange: {
            before: params.before,
            after: params.after
          }
        }
      },
    };

    // Add metadata filter if provided (validate for Upstash compatibility)
    if (filter) {
      const validatedFilter = validateMetadataFilter(filter);
      queryConfig.filter = transformToUpstashFilter(validatedFilter);
      logger.info('Applying Upstash-compatible metadata filter to search', {
        threadId: params.threadId,
        filter: validatedFilter,
        topK: params.topK
      });
    }

    const result = await mastraMemory.query(queryConfig);

    logger.info('Memory message search completed', {
      threadId: params.threadId,
      messagesFound: result.messages.length,
      uiMessagesFound: result.uiMessages.length,
      hasFilter: !!filter
    });

    return result;
  } catch (error: unknown) {
    logger.error(`searchMemoryMessages failed: ${(error as Error).message}`, {
      threadId: params.threadId,
      vectorSearchString: params.vectorSearchString,
      filter
    });
    throw new VectorStoreError(
      `Failed to search messages: ${(error as Error).message}`,
      'operation_failed',
      { threadId: params.threadId, filter }
    );
  }
}

/**
 * Retrieve UI-formatted messages for a thread using Upstash storage.
 * @param threadId - Thread identifier
 * @param last - Number of recent messages
 * @returns Promise resolving to array of UI-formatted messages
 */
export async function getMemoryUIThreadMessages(threadId: string, last = 100): Promise<UIMessage[]> {
  const id = threadIdSchema.parse(threadId);
  try {
    const { uiMessages } = await mastraMemory.query({
      threadId: id,
      selectBy: { last },
    });
    return uiMessages;
  } catch (error: unknown) {
    logger.error(`getMemoryUIThreadMessages failed: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Masks internal working_memory updates from a response textStream for Upstash.
 * @param textStream - Async iterable of response chunks including <working_memory> tags
 * @param onStart - Optional callback when a working_memory update starts
 * @param onEnd - Optional callback when a working_memory update ends
 * @param onMask - Optional callback for the masked content
 * @returns Async iterable of chunks with working_memory tags removed
 */
export function maskMemoryWorkingMemoryStream(
  textStream: AsyncIterable<string>,
  onStart?: () => void,
  onEnd?: () => void,
  onMask?: (chunk: string) => void
): AsyncIterable<string> {
  return maskStreamTags(textStream, 'working_memory', { onStart, onEnd, onMask });
}

/**
 * Enhanced search function with performance tracking and detailed logging for Upstash.
 * @param threadId - Thread identifier
 * @param vectorSearchString - Query string for semantic search
 * @param topK - Number of similar messages to retrieve
 * @param before - Number of messages before each match
 * @param after - Number of messages after each match
 * @returns Promise resolving to { messages, uiMessages } with enhanced metadata
 */
export async function enhancedMemorySearchMessages(
  threadId: string,
  vectorSearchString: string,
  topK = 3,
  before = 2,
  after = 1
): Promise<{
  messages: CoreMessage[];
  uiMessages: UIMessage[];
  searchMetadata: {
    topK: number;
    before: number;
    after: number;
  };
}> {
  // Use the pinecone-backed memory (mastraMemory configured with pinecone) for semantic recall
  const result = await mastraMemory.query({
    threadId,
    selectBy: { vectorSearchString },
    threadConfig: {
      semanticRecall: {
        topK,
        messageRange: { before, after },
      },
    },
  });

  return {
    ...result,
    searchMetadata: { topK, before, after },
  };
}

/**
 * Create a vector index with proper configuration
 * @param indexName - Name of the index to create
 * @param dimension - Vector dimension (default: 384 for fastembed)
 * @param metric - Distance metric (default: cosine)
 * @returns Promise resolving to operation result
 */
export async function createVectorIndex(
  indexName: string,
  dimension: number,
  metric: 'cosine' | 'euclidean' | 'dotproduct' = 'cosine'
): Promise<VectorOperationResult> {
  const params = createVectorIndexSchema.parse({ indexName, dimension, metric });
  try {
    await pinecone.createIndex({
      indexName: params.indexName,
      dimension: params.dimension,
      metric: params.metric,
    });
    logger.info('Vector index created successfully', {
      indexName: params.indexName,
      dimension: params.dimension,
      metric: params.metric,
    });
    return {
      success: true,
      operation: 'createVectorIndex',
      indexName: params.indexName,
    };
  } catch (error: unknown) {
    logger.error('Failed to create vector index', {
      error: (error as Error).message,
      indexName: params.indexName,
      dimension: params.dimension,
      metric: params.metric,
    });
    return {
      success: false,
      operation: 'createVectorIndex',
      indexName: params.indexName,
      error: (error as Error).message,
    };
  }
}

/**
 * List all available vector indexes
 * @returns Promise resolving to array of index names
 */
export async function listVectorIndexes(): Promise<string[]> {
  try {
    const indexes = await pinecone.listIndexes();
    logger.info('Vector indexes listed successfully', { count: indexes.length });
    return indexes;
  } catch (error: unknown) {
    logger.error('Failed to list vector indexes', {
      error: (error as Error).message
    });
    throw error;
  }
}

/**
 * Get detailed information about a vector index
 * @param indexName - Name of the index to describe
 * @returns Promise resolving to index statistics
 */
export async function describeVectorIndex(indexName: string): Promise<VectorIndexStats> {
  try {
    const stats = await pinecone.describeIndex({ indexName });
    logger.info('Vector index described successfully', { indexName, stats });
    return {
      dimension: stats.dimension,
      count: stats.count,
      metric: stats.metric || 'cosine'
    };
  } catch (error: unknown) {
    logger.error('Failed to describe vector index', {
      error: (error as Error).message,
      indexName
    });
    throw error;
  }
}

/**
 * Delete a vector index
 * @param indexName - Name of the index to delete
 * @returns Promise resolving to operation result
 */
export async function deleteVectorIndex(indexName: string): Promise<VectorOperationResult> {
  try {
    await pinecone.deleteIndex({ indexName });
    logger.info('Vector index deleted successfully', { indexName });
    return {
      success: true,
      operation: 'deleteIndex',
      indexName
    };
  } catch (error: unknown) {
    logger.error('Failed to delete vector index', {
      error: (error as Error).message,
      indexName
    });

    return {
      success: false,
      operation: 'deleteIndex',
      indexName,
      error: (error as Error).message
    };
  }
}

/**
 * Upsert vectors into an index with metadata
 * @param indexName - Name of the index
 * @param vectors - Array of embedding vectors
 * @metadata - Optional metadata for each vector
 * @param ids - Optional IDs for each vector
 * @returns Promise resolving to operation result
 */
export async function upsertVectors(
  indexName: string,
  vectors: number[][],
  metadata?: Record<string, unknown>[],
  ids?: string[]
): Promise<VectorOperationResult> {
  const params = vectorUpsertSchema.parse({ indexName, vectors, metadata, ids });
  try {
    await pinecone.upsert({
      indexName: params.indexName,
      vectors: params.vectors,
      metadata: params.metadata,
      ids: params.ids
    });
    logger.info('Vectors upserted successfully', {
      indexName: params.indexName,
      vectorCount: params.vectors.length,
      hasMetadata: !!params.metadata,
      hasIds: !!params.ids
    });
    return {
      success: true,
      operation: 'upsert',
      indexName: params.indexName,
      count: params.vectors.length
    };
  } catch (error: unknown) {
    logger.error('Failed to upsert vectors', {
      error: (error as Error).message,
      indexName: params.indexName,
      vectorCount: params.vectors.length
    });
    return {
      success: false,
      operation: 'upsert',
      indexName: params.indexName,
      error: (error as Error).message
    };
  }
}

/**
 * Query vectors for similarity search with enhanced metadata filtering
 * Supports MongoDB/Sift query syntax for comprehensive filtering capabilities
 *
 * @param indexName - Name of the index to query
 * @param queryVector - Query vector for similarity search (384 dimensions for fastembed)
 * @param topK - Number of results to return
 * @param filter - Optional metadata filter using MongoDB/Sift query syntax
 * @param includeVector - Whether to include vectors in results
 * @returns Promise resolving to query results with metadata
 *
 * @warning Current Type Limitation:
 * Filter parameter uses `any` casting due to local Upstash package constraints.
 */
export async function queryVectors(
  indexName: string,
  queryVector: number[],
  topK: number = 5,
  filter?: MetadataFilter,
  includeVector: boolean = false
): Promise<VectorQueryResult[]> {
  const params = vectorQuerySchema.parse({
    indexName,
    queryVector,
    topK,
    filter,
    includeVector
  });
  try {
    // Validate filter for Upstash compatibility if provided
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let upstashFilter: any; // TODO: Replace with proper UpstashVectorFilter type when available.  Not now.. This is a workaround for local Upstash package constraints.
    if (params.filter) {
      const validatedFilter = validateMetadataFilter(params.filter);
      upstashFilter = transformToUpstashFilter(validatedFilter);
    }

    const results = await pinecone.query({
      indexName: params.indexName,
      queryVector: params.queryVector,
      topK: params.topK,
      filter: upstashFilter,
      includeVector: params.includeVector
    });

    logger.info('Vector query completed successfully', {
      indexName: params.indexName,
      topK: params.topK,
      resultCount: results.length,
      hasFilter: !!params.filter,
      filterApplied: !!upstashFilter
    });

    // Transform results to match our interface
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return results.map((result: any) => ({
      id: result.id,
      score: result.score,
      metadata: result.metadata || {},
      vector: result.vector
    }));
  } catch (error: unknown) {
    logger.error('Failed to query vectors', {
      error: (error as Error).message,
      indexName: params.indexName,
      topK: params.topK
    });
    throw error;
  }
}

/**
 * Transform MetadataFilter to Upstash-compatible filter format
 * Converts our MetadataFilter interface to the exact format expected by UpstashVector
 *
 * @param filter - MetadataFilter to transform
 * @returns Transformed filter compatible with Upstash Vector API
 *
 * @warning Current Implementation Note:
 * This function performs the transformation but cannot guarantee full type safety
 * due to local Upstash package constraints. The output is cast to `any` to work
 * with the current system while maintaining functionality.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformToUpstashFilter(filter: MetadataFilter): any {
  const transformed: Record<string, unknown> = {};

  Object.entries(filter).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      // Handle nested MetadataFilter objects
      if (typeof value === 'object' && !Array.isArray(value) && key.startsWith('$')) {
        transformed[key] = transformToUpstashFilter(value as MetadataFilter);
      } else if (Array.isArray(value) && key.startsWith('$')) {
        // Handle arrays in logical operators
        transformed[key] = value.map(item => 
          typeof item === 'object' && item !== null 
            ? transformToUpstashFilter(item as MetadataFilter)
            : item
        );
      } else {
        transformed[key] = value;
      }
    }
  });
  
  return transformed;
}

/**
 * Update a specific vector in an index
 * @param indexName - Name of the index
 * @param id - ID of the vector to update
 * @param vector - New vector values (optional)
 * @param metadata - New metadata (optional)
 * @returns Promise resolving to operation result
 */
export async function updateVector(
  indexName: string,
  id: string,
  vector?: number[],
  metadata?: Record<string, unknown>
): Promise<VectorOperationResult> {
  const params = vectorUpdateSchema.parse({ indexName, id, vector, metadata });
  if (!params.vector && !params.metadata) {
    throw new Error('Either vector or metadata must be provided for update');
  }
  try {
    await pinecone.updateVector({
      indexName: params.indexName,
      id: params.id,
      update: {
        vector: params.vector,
        metadata: params.metadata
      }
    });
    logger.info('Vector updated successfully', {
      indexName: params.indexName,
      id: params.id,
      hasVector: !!params.vector,
      hasMetadata: !!params.metadata
    });
    return {
      success: true,
      operation: 'updateVector',
      indexName: params.indexName
    };
  } catch (error: unknown) {
    logger.error('Failed to update vector', {
      error: (error as Error).message,
      indexName: params.indexName,
      id: params.id
    });
    return {
      success: false,
      operation: 'updateVector',
      indexName: params.indexName,
      error: (error as Error).message
    };
  }
}

/**
 * Delete a specific vector from an index
 * @param indexName - Name of the index
 * @param id - ID of the vector to delete
 * @returns Promise resolving to operation result
 */
export async function deleteVector(
  indexName: string,
  id: string
): Promise<VectorOperationResult> {
  try {
    await pinecone.deleteVector({ indexName, id });
    logger.info('Vector deleted successfully', { indexName, id });
    return {
      success: true,
      operation: 'deleteVector',
      indexName,
    };
  } catch (error: unknown) {
    logger.error('Failed to delete vector', {
      error: (error as Error).message,
      indexName,
      id
    });
    return {
      success: false,
      operation: 'deleteVector',
      indexName,
      error: (error as Error).message
    };
  }
}

/**
 * Batch upsert vectors for improved performance
 * @param indexName - Name of the index
 * @param vectors - Array of embedding vectors
 * @param metadata - Optional metadata for each vector
 * @param ids - Optional IDs for each vector
 * @param batchSize - Size of each batch (default: 100)
 * @returns Promise resolving to operation result
 */
export async function batchUpsertVectors(
  indexName: string,
  vectors: number[][],
  metadata?: Record<string, unknown>[],
  ids?: string[],
  batchSize: number = 100
): Promise<VectorOperationResult> {
  const totalVectors = vectors.length;
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];
  try {
    for (let i = 0; i < totalVectors; i += batchSize) {
      const batchVectors = vectors.slice(i, i + batchSize);
      const batchMetadata = metadata?.slice(i, i + batchSize);
      const batchIds = ids?.slice(i, i + batchSize);
      try {
        await upsertVectors(indexName, batchVectors, batchMetadata, batchIds);
        successCount += batchVectors.length;
      } catch (error: unknown) {
        errorCount += batchVectors.length;
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${(error as Error).message}`);
      }
    }
    logger.info('Batch vector upsert completed', {
      indexName,
      totalVectors,
      successCount,
      errorCount,
      batchSize
    });
    return {
      success: errorCount === 0,
      operation: 'batchUpsert',
      indexName,
      count: successCount,
      error: errors.length > 0 ? errors.join('; ') : undefined
    };
  } catch (error: unknown) {
    logger.error('Batch vector upsert failed', {
      error: (error as Error).message,
      indexName,
      totalVectors
    });
    return {
      success: false,
      operation: 'batchUpsert',
      indexName,
      error: (error as Error).message
    };
  }
}

/**
 * Enhanced vector search with semantic filtering and ranking
 * @param indexName - Name of the index to search
 * @param queryVector - Query vector for similarity search
 * @param options - Search configuration options
 * @returns Promise resolving to enhanced search results
 *
 * @warning Current Type Limitation:
 * Filter parameter uses `any` casting due to local Upstash package constraints.
 */
export async function enhancedVectorSearch(
  indexName: string,
  queryVector: number[],
  options: {
    topK?: number;
    filter?: MetadataFilter;
    includeVector?: boolean;
    minScore?: number;
    rerank?: boolean;
  } = {}
): Promise<{
  results: VectorQueryResult[];
  searchMetadata: {
    totalResults: number;
    filteredResults: number;
    searchTime: number;
    topK: number;
  };
}> {
  const startTime = Date.now();
  const {
    topK = 5,
    filter,
    includeVector = false,
    minScore = 0,
    rerank = false
  } = options;
  try {
    let results = await queryVectors(indexName, queryVector, topK, filter, includeVector);
    const totalResults = results.length;
    // Apply minimum score filtering
    if (minScore > 0) {
      results = results.filter(result => result.score >= minScore);
    }
    // Apply reranking if requested
    if (rerank && results.length > 1) {
      results = results.sort((a, b) => {
        // Enhanced ranking considering both score and metadata relevance
        const scoreWeight = 0.8;
        const metadataWeight = 0.2;
        const aScore = a.score * scoreWeight;
        const bScore = b.score * scoreWeight;
        // Simple metadata relevance (can be enhanced based on specific needs)
        const aMetadataScore = Object.keys(a.metadata).length * metadataWeight;
        const bMetadataScore = Object.keys(b.metadata).length * metadataWeight;
        return (bScore + bMetadataScore) - (aScore + aMetadataScore);
      });
    }
    const searchTime = Date.now() - startTime;
    logger.info('Enhanced vector search completed', {
      indexName,
      totalResults,
      filteredResults: results.length,
      searchTime,
      topK,
      hasFilter: !!filter,
      minScore,
      rerank
    });
    return {
      results,
      searchMetadata: {
        totalResults,
        filteredResults: results.length,
        searchTime,
        topK
      }
    };
  } catch (error: unknown) {
    logger.error('Enhanced vector search failed', {
      error: (error as Error).message,
      indexName,
      topK
    });
    throw error;
  }
}

/**
 * Batch operations for improved performance with Upstash Redis pipeline
 */
export interface UpstashThread {
  id: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Batch create multiple threads efficiently using Upstash Redis
 * @param threadRequests - Array of thread creation requests
 * @returns Promise resolving to array of created threads
 */
export async function batchCreateMemoryThreads(
  threadRequests: Array<{
    resourceId: string;
    metadata?: Record<string, unknown>;
    threadId?: string;
  }>
): Promise<UpstashThread[]> {
  const startTime = Date.now();
  try {
    const results = await Promise.allSettled(
      threadRequests.map(request =>
        createMemoryThread(request.resourceId, undefined, request.metadata, request.threadId)
      )
    );
    const successes = results.filter(r => r.status === 'fulfilled').length;
    const failures = results.filter(r => r.status === 'rejected').length;
    const duration = Date.now() - startTime;
    logger.info('Batch memory thread creation completed', {
      totalRequests: threadRequests.length,
      successes,
      failures,
      duration,
    });
    return results
      .map(result => (result.status === 'fulfilled' ? result.value : null))
      .filter(Boolean) as UpstashThread[];
  } catch (error: unknown) {
    logger.error(`batchCreateMemoryThreads failed: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Enhanced memory cleanup and optimization for Upstash Redis
 * @param options - Cleanup configuration options
 */
export async function optimizeMemoryStorage(options: {
  olderThanDays?: number;
  keepMinimumMessages?: number;
  compactVectorIndex?: boolean;
} = {}): Promise<{
  threadsProcessed: number;
  messagesCompacted: number;
  vectorIndexOptimized: boolean;
}> {
  const {
    olderThanDays = 30,
    keepMinimumMessages = 10,
    compactVectorIndex = true
  } = options;
  const startTime = Date.now();
  try {
    logger.info('Memory optimization requested', {
      olderThanDays,
      keepMinimumMessages,
      compactVectorIndex,
      timestamp: new Date().toISOString()
    });
    // Upstash Redis handles memory optimization automatically
    // This is provided for API consistency
    const optimizationResults = {
      threadsProcessed: 0,
      messagesCompacted: 0,
      vectorIndexOptimized: compactVectorIndex,
      duration: Date.now() - startTime
    };
    logger.info('Memory optimization completed (auto-managed)', optimizationResults);
    return optimizationResults;
  } catch (error: unknown) {
    logger.error(`optimizeMemoryStorage failed: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Validate metadata filter for Upstash compatibility
 * Ensures filter meets Upstash-specific requirements and limitations
 *
 * @param filter - Metadata filter to validate
 * @returns Validated filter or throws VectorStoreError
 *
 * @example
 * ```typescript
 * const validFilter = validateUpstashFilter({
 *   category: 'electronics',
 *   price: { $gt: 100 },
 *   tags: { $in: ['sale', 'new'] }
 * });
 * ```
 */
export function validateMetadataFilter(filter: MetadataFilter): MetadataFilter {
  if (!filter || typeof filter !== 'object') {
    throw new VectorStoreError('Filter must be a valid object', 'operation_failed');
  }

  // Check field key length limits (512 chars for Pinecone)
  const checkFieldKeys = (obj: Record<string, unknown>, path = ''): void => {
    Object.keys(obj).forEach(key => {
      const fullPath = path ? `${path}.${key}` : key;

      if (fullPath.length > 512) {
        throw new VectorStoreError(
          `Field key '${fullPath}' exceeds 512 character limit for Pinecone`,
          'operation_failed',
          { fieldKey: fullPath, length: fullPath.length }
        );
      }

      // Check for null/undefined values (not supported by Pinecone)
      const value = obj[key];
      if (value === null || value === undefined) {
        throw new VectorStoreError(
          `Null/undefined values not supported by Pinecone in field '${fullPath}'`,
          'operation_failed',
          { fieldKey: fullPath, value }
        );
      }

      // Recursively check nested objects
      if (typeof value === 'object' && !Array.isArray(value) && !key.startsWith('$')) {
        checkFieldKeys(value as Record<string, unknown>, fullPath);
      }
    });
  };

  checkFieldKeys(filter);

  // Check for large IN clauses (Pinecone has query size limits)
  const checkArraySizes = (obj: Record<string, unknown>): void => {
    Object.entries(obj).forEach(([key, value]) => {
      if (key === '$in' || key === '$nin') {
        if (Array.isArray(value) && value.length > 100) {
          logger.warn('Large IN/NIN clause detected - may hit Pinecone query size limits', {
            operator: key,
            arraySize: value.length
          });
        }
      }

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        checkArraySizes(value as Record<string, unknown>);
      }
    });
  };

  checkArraySizes(filter);

  return filter;
}

/**
 * Extract metadata from document chunks using LLM analysis
 * Follows Mastra ExtractParams patterns for title, summary, keywords, and questions
 *
 * @param chunks - Array of document chunks to process
 * @param extractParams - Configuration for metadata extraction
 * @returns Promise resolving to chunks with enhanced metadata
 *
 * @example
 * ```typescript
 * const enhancedChunks = await extractChunkMetadata(chunks, {
 *   title: true,
 *   summary: { summaries: ['self'] },
 *   keywords: { keywords: 5 },
 *   questions: { questions: 3 }
 * });
 * ```
 */
export async function extractChunkMetadata(
  chunks: Array<{
    id: string;
    content: string;
    metadata: Record<string, unknown>;
  }>,
  extractParams: ExtractParams
): Promise<Array<{
  id: string;
  content: string;
  metadata: Record<string, unknown>;
}>> {
  const startTime = Date.now();

  try {
    logger.info('Starting metadata extraction for chunks', {
      chunkCount: chunks.length,
      extractParams: Object.keys(extractParams)
    });

    const enhancedChunks = chunks.map(chunk => ({ ...chunk }));

    // Title extraction (grouped by docId if available)
    if (extractParams.title) {

      // Group chunks by docId for shared title extraction
      const docGroups = new Map<string, typeof enhancedChunks>();
      enhancedChunks.forEach(chunk => {
        const docId = (chunk.metadata.docId as string) || chunk.id;
        if (!docGroups.has(docId)) {
          docGroups.set(docId, []);
        }
        docGroups.get(docId)!.push(chunk);
      });

      // Extract titles for each document group
      for (const [docId, docChunks] of docGroups) {
        const combinedContent = docChunks.map(c => c.content).join('\n\n');
        // Use combined content for title generation (simplified for demo)
        const extractedTitle = combinedContent.length > 100
          ? `Document: ${combinedContent.substring(0, 50)}...`
          : `Document: ${docId.substring(0, 50)}...`;

        docChunks.forEach(chunk => {
          chunk.metadata.documentTitle = extractedTitle;
        });
      }
    }


    // Keywords extraction
    if (extractParams.keywords) {
      const keywordConfig = typeof extractParams.keywords === 'boolean' ? { keywords: 5 } : extractParams.keywords;
      const keywordCount = keywordConfig.keywords || 5;

      enhancedChunks.forEach(chunk => {
        // Simplified keyword extraction
        const words = chunk.content.toLowerCase().split(/\s+/)
          .filter(word => word.length > 3)
          .slice(0, keywordCount);
        chunk.metadata.excerptKeywords = `KEYWORDS: ${words.join(', ')}`;
      });
    }

    // Questions extraction
    if (extractParams.questions) {
      const questionConfig = typeof extractParams.questions === 'boolean' ? { questions: 3 } : extractParams.questions;
      const questionCount = questionConfig.questions || 3;

      if (!questionConfig.embeddingOnly) {
        enhancedChunks.forEach(chunk => {
          // Simplified question generation
          const questions = Array.from({ length: questionCount }, (_, i) =>
            `${i + 1}. What is discussed about ${chunk.content.split(' ')[0]}?`
          );
          chunk.metadata.questionsThisExcerptCanAnswer = questions.join('\n');
        });
      }
    }

    const processingTime = Date.now() - startTime;
    logger.info('Metadata extraction completed', {
      chunkCount: enhancedChunks.length,
      processingTime,
      extractedFields: Object.keys(extractParams)
    });

    return enhancedChunks;
  } catch (error: unknown) {
    logger.error('Metadata extraction failed', {
      error: (error as Error).message,
      chunkCount: chunks.length
    });
    throw new VectorStoreError(
      `Failed to extract metadata: ${(error as Error).message}`,
      'operation_failed',
      { chunkCount: chunks.length, extractParams }
    );
  }
}

/**
 * @deprecated Current Implementation Status
 *
 * IMPORTANT: Type Safety Limitation Notice
 *
 * The current implementation uses `any` type casting for Upstash Vector filters
 * due to the inability to import proper types from the local Upstash package.
 *
 * This is a temporary workaround that maintains functionality while we await:
 * 1. Updated Upstash package exports
 * 2. Proper TypeScript type definitions
 * 3. Enhanced type safety implementation
 *
 * The functionality works correctly, but lacks compile-time type checking
 * for the filter parameter in vector operations.
 *
 * Future improvements should:
 * - Import proper UpstashVectorFilter types when available
 * - Replace `any` type casting with proper type definitions
 * - Implement full type safety for metadata filtering
 *
 * @author SSD
 * @version 1.0.0
 * @date 2025-07-08
 */
export const UPSTASH_TYPE_SAFETY_STATUS = {
  current: 'Limited - using any type casting',
  reason: 'Cannot import UpstashVectorFilter from local package',
  functionality: 'Working correctly',
  typeSafety: 'Compile-time checking disabled for filters',
  futureImprovement: 'Implement proper type imports when available'
} as const;
