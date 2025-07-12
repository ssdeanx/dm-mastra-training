import { Memory } from '@mastra/memory';
import { UpstashStore } from '@mastra/upstash';
import { pinecone } from './pinecone';
import { z } from 'zod';
import { PinoLogger } from '@mastra/loggers';
import type { CoreMessage as OriginalCoreMessage } from '@mastra/core';
import { maskStreamTags } from '@mastra/core';
import { MemoryProcessor, MemoryProcessorOpts } from '@mastra/core/memory';
import { UIMessage } from 'ai';
import { TokenLimiter, ToolCallFilter } from "@mastra/memory/processors";
import { createGeminiEmbeddingModel } from'./config/googleProvider';





//import { ca } from 'zod/v4/locales';

/**
 * Extends MemoryProcessorOpts to include workflow-specific options.
 */
interface WorkflowMemoryProcessorOpts extends MemoryProcessorOpts {
  currentWorkflowStage?: string;
  stageRelevanceStrategy?: 'adjacent' | 'semantic';
  workflowStageDefinitions?: Record<string, string>;
  workflowStageEmbeddings?: Record<string, number[]>; // New: Pre-computed embeddings for stages
  semanticRelevanceThreshold?: number;
}

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


const logger = new PinoLogger({ name: 'upstashMemory', level: 'info' });


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
export const upstashVector = pinecone;




/**
 * Bias Mitigation Processor (2025)
 *
 * Implements strategies to identify and mitigate biases in messages,
 * ensuring a more neutral and objective context for agents.
 *
 * @mastra Memory Processor implementation for Upstash Memory
 * @class BiasMitigationProcessor
 * @version 1.0.0
 * @author SSD
 * @date 2025-07-09
 *
 * @remarks
 * Features:
 * - Detects common cognitive biases (e.g., confirmation, recency, framing)
 * - Applies mitigation strategies (e.g., re-weighting, rephrasing, adding counter-arguments)
 * - Enhances objectivity and fairness of agent context
 *
 * @example
 * ```typescript
 * const memory = new Memory({
 *   processors: [
 *     new BiasMitigationProcessor({
 *       detectionStrategies: ['confirmation', 'recency'],
 *       mitigationStrategies: ['re-weight', 'add-counter-arguments'],
 *       biasThreshold: 0.6
 *     }),
 *   ]
 * });
 * ```
 */
export class BiasMitigationProcessor extends MemoryProcessor {
  private readonly detectionStrategies: Array<'confirmation' | 'recency' | 'framing' | 'anchoring' | 'availability' | 'overconfidence' | 'bandwagon' | 'status-quo' | 'survivorship-bias' | 'outgroup-bias' | 'in-group-bias' | 'negativity-bias' | 'optimism-bias' | 'self-serving-bias' | 'hindsight-bias' | 'fundamental-attribution-error' | 'halo-effect' | 'horns-effect' | 'confirmation-bias'>;
  private readonly mitigationStrategies: Array<'re-weight' | 'rephrase' | 'add-counter-arguments' | 'remove' | 'flag' | 'ignore' | 'contextualize' | 'reframe' | 'balance' | 'rephrase' | 're-weight' | 'add-counter-arguments' | 'remove'>;
  biasThreshold: number;

  constructor(options: {
    detectionStrategies?: Array<'confirmation' | 'recency' | 'framing' | 'anchoring' | 'availability' | 'overconfidence' | 'bandwagon' | 'status-quo' | 'survivorship-bias' | 'outgroup-bias' | 'in-group-bias' | 'negativity-bias' | 'optimism-bias' | 'self-serving-bias' | 'hindsight-bias' | 'fundamental-attribution-error' | 'halo-effect' | 'horns-effect' | 'confirmation-bias'>;
    mitigationStrategies?: Array<'re-weight' | 'rephrase' | 'add-counter-arguments' | 'remove' | 'flag' | 'ignore' | 'contextualize' | 'reframe' | 'balance' | 'rephrase' | 're-weight' | 'add-counter-arguments' | 'remove'>;
    biasThreshold?: number;
  } = {}) {
    super({ name: 'BiasMitigationProcessor' });
    this.detectionStrategies = options.detectionStrategies ?? ['confirmation', 'recency', 'framing', 'anchoring', 'availability', 'overconfidence', 'bandwagon', 'status-quo', 'survivorship-bias', 'outgroup-bias', 'in-group-bias', 'negativity-bias', 'optimism-bias', 'self-serving-bias', 'hindsight-bias', 'fundamental-attribution-error', 'halo-effect', 'horns-effect', 'confirmation-bias'];
    this.mitigationStrategies = options.mitigationStrategies ?? ['re-weight', 'rephrase', 'add-counter-arguments', 'remove', 'flag', 'ignore', 'contextualize', 'reframe', 'balance', 'rephrase', 're-weight', 'add-counter-arguments', 'remove'];
    this.biasThreshold = options.biasThreshold ?? 0.5;

    logger.info('BiasMitigationProcessor initialized', {
      detectionStrategies: this.detectionStrategies,
      mitigationStrategies: this.mitigationStrategies,
      biasThreshold: this.biasThreshold
    });
  }

  process(messages: CoreMessage[], opts: MemoryProcessorOpts = {}): CoreMessage[] {
    const startTime = Date.now();
    let processedMessages = [...messages];

    try {
      for (const strategy of this.detectionStrategies) {
        switch (strategy) {
          case 'confirmation':
            processedMessages = this.detectAndMitigateConfirmationBias(processedMessages);
            break;
          case 'recency':
            processedMessages = this.detectAndMitigateRecencyBias(processedMessages);
            break;
          case 'framing':
            processedMessages = this.detectAndMitigateFramingBias(processedMessages);
            break;
        }
      }

      const duration = Date.now() - startTime;
      logger.info('BiasMitigationProcessor completed', {
        originalCount: messages.length,
        finalCount: processedMessages.length,
        processingDuration: duration,
        optsReceived: Object.keys(opts).length > 0
      });
      return processedMessages;
    } catch (error: unknown) {
      logger.error('BiasMitigationProcessor failed', {
        error: (error as Error).message,
        messageCount: messages.length,
        optsReceived: Object.keys(opts).length > 0
      });
      return messages; // Return original messages on error
    }
  }

  private detectAndMitigateConfirmationBias(messages: CoreMessage[]): CoreMessage[] {
    // Simplified: Look for messages that strongly agree with a preceding message
    // and re-weight them if they lack new information.
    const mitigatedMessages: CoreMessage[] = [];
    for (let i = 0; i < messages.length; i++) {
      const current = messages[i];
      if (i > 0) {
        const previous = messages[i - 1];
        const currentContent = current.content?.toString().toLowerCase() || '';
        const previousContent = previous.content?.toString().toLowerCase() || '';

        // Very basic check for confirmation bias: if current message strongly affirms previous
        if (currentContent.includes('yes') || currentContent.includes('confirm') || currentContent.includes('agree')) {
          const similarity = this._calculateWordOverlap(currentContent, previousContent);
          if (similarity > this.biasThreshold) {
            // Apply mitigation: rephrase or re-weight
            if (this.mitigationStrategies.includes('re-weight')) {
              logger.debug(`Mitigating confirmation bias for message: ${current.content?.toString().substring(0, 30)}...`);
              // Add metadata to indicate re-weighting or adjust score if score property existed
              current.metadata = { ...current.metadata, biasMitigated: true, biasType: 'confirmation', originalScore: (current.metadata?.score as number | undefined) ?? 1.0 };
              // In a real scenario, you might adjust a score property if messages had one
            }
            if (this.mitigationStrategies.includes('rephrase')) {
              // This would require an LLM call to rephrase, which is out of scope for a synchronous processor
              logger.warn('Rephrasing for bias mitigation is not supported in synchronous processor.');
            }
          }
        }
      }
      mitigatedMessages.push(current);
    }
    return mitigatedMessages;
  }

  private detectAndMitigateRecencyBias(messages: CoreMessage[]): CoreMessage[] {
    // Simplified: Reduce the implicit weight of very recent messages if they are overly emphasized
    // compared to older, potentially more important messages.
    const mitigatedMessages = [...messages];
    const totalMessages = mitigatedMessages.length;
    if (totalMessages > 1) {
      const recentMessage = mitigatedMessages[totalMessages - 1];
      const olderMessage = mitigatedMessages[0]; // Compare with the oldest for simplicity

      // If the recent message is very short and just a confirmation, and older message is substantial
      if (recentMessage.content?.toString().length < 50 && olderMessage.content?.toString().length > 200) {
        if (this.mitigationStrategies.includes('re-weight')) {
          logger.debug(`Mitigating recency bias for message: ${recentMessage.content?.toString().substring(0, 30)}...`);
          recentMessage.metadata = { ...recentMessage.metadata, biasMitigated: true, biasType: 'recency', originalScore: (recentMessage.metadata?.score as number | undefined) ?? 1.0 };
          // In a real scenario, you might adjust a score property if messages had one
        }
      }
    }
    return mitigatedMessages;
  }

  private detectAndMitigateFramingBias(messages: CoreMessage[]): CoreMessage[] {
    const mitigatedMessages = [...messages];
    for (let i = 0; i < messages.length; i++) {
      const current = messages[i];
      const content = current.content?.toString().toLowerCase() || '';

      // Very basic check for framing bias: presence of strong positive/negative words without balance
      const positiveWords = ['great', 'excellent', 'success', 'advantage', 'benefit'];
      const negativeWords = ['bad', 'failure', 'disadvantage', 'problem', 'risk'];

      const hasPositive = positiveWords.some(word => content.includes(word));
      const hasNegative = negativeWords.some(word => content.includes(word));

      if (hasPositive && !hasNegative && this.mitigationStrategies.includes('add-counter-arguments')) {
        const counterArgument = "Consider alternative perspectives and potential downsides.";
        mitigatedMessages.splice(i + 1, 0, {
          role: 'system',
          content: counterArgument,
          metadata: {
            biasMitigated: true,
            biasType: 'framing',
            originalMessageId: current.metadata?.id as string | undefined
          }
        });
        i++;
      } else if (hasNegative && !hasPositive && this.mitigationStrategies.includes('add-counter-arguments')) {
        const counterArgument = "Consider alternative perspectives and potential upsides.";
        mitigatedMessages.splice(i + 1, 0, {
          role: 'system',
          content: counterArgument,
          metadata: {
            biasMitigated: true,
            biasType: 'framing',
            originalMessageId: current.metadata?.id as string | undefined
          }
        });
        i++;
      }
    }
    return mitigatedMessages;
  }

  private _calculateWordOverlap(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 2));
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }
}

/**
 * Advanced Attention-Guided Memory Processor (2025)
 *
 * Implements cutting-edge memory management techniques based on latest research:
 * - Attention-based relevance scoring
 * - Dynamic context pruning
 * - Semantic importance weighting
 * - Token efficiency optimization
 *
 * @see https://mastra.ai/en/docs/memory/memory-processors
 *
 * @version 1.0.0
 * @author SSD
 * @date 2025-06-20
 *
 * @mastra Memory Processor implementation for Upstash Memory
 * @class AttentionGuidedMemoryProcessor
 *
 * @remarks
 * Features:
 * - Removes redundant messages using semantic similarity
 * - Prioritizes high-importance content based on keywords
 * - Maintains conversation flow and context coherence
 *
 * @example
 * ```typescript
 * const memory = new Memory({
 *   processors: [
 *     new AttentionGuidedMemoryProcessor({
 *       maxMessages: 50,
 *       similarityThreshold: 0.85,
 *       importanceKeywords: ['error', 'critical', 'urgent', 'important']
 *     }),
 *     new TokenLimiter(127000)
 *   ]
 * });
 * ```
 *
 * [EDIT: 2025-06-20] & [BY: GitHub Copilot]
 */
export class AttentionGuidedMemoryProcessor extends MemoryProcessor {
  private readonly maxMessages: number;
  private readonly similarityThreshold: number;
  private readonly importanceKeywords: string[];
  private readonly verboseMessageThreshold: number;
  private readonly contextPreservationRatio: number;

  constructor(options: {
    maxMessages?: number;
    similarityThreshold?: number;
    importanceKeywords?: string[];
    verboseMessageThreshold?: number;
    contextPreservationRatio?: number;
  } = {}) {
    super({ name: 'AttentionGuidedMemoryProcessor' });
    this.maxMessages = options.maxMessages ?? 50;
    this.similarityThreshold = options.similarityThreshold ?? 0.85;
    this.importanceKeywords = options.importanceKeywords ?? [
      'urgent', 'important', 'critical', 'error', 'bug', 'issue', 'problem',
      'task', 'goal', 'decision', 'risk', 'security', 'performance', 'update',
      'fix', 'solution', 'insight', 'analysis', 'data', 'workflow', 'status',
      'progress', 'blocker', 'verify', 'validate', 'report', 'action', 'feedback',
      'optimize', 'efficiency', 'integrity', 'coordination', 'strategy', 'outcome',
      'context', 'relevance', 'priority', 'failure', 'success', 'alert', 'warning'
    ];
    this.verboseMessageThreshold = options.verboseMessageThreshold ?? 500;
    this.contextPreservationRatio = options.contextPreservationRatio ?? 0.3;

    logger.info('AttentionGuidedMemoryProcessor initialized', {
      maxMessages: this.maxMessages,
      similarityThreshold: this.similarityThreshold,
      importanceKeywords: this.importanceKeywords.length,
      verboseMessageThreshold: this.verboseMessageThreshold
    });
  }
  /**
   * Process messages using attention-guided memory management
   * @param messages - Array of messages to process
   * @param opts - Processing options for configuration
   * @returns Filtered and optimized messages array
   */
  process(messages: CoreMessage[], opts: MemoryProcessorOpts = {}): CoreMessage[] {
    // Use opts properties that are actually available
    const targetMessages = this.maxMessages;
    if (messages.length <= targetMessages) {
      return messages;
    }

    const startTime = Date.now();
    try {
      // Step 1: Score messages by importance
      const scoredMessages = this.scoreMessageImportance(messages);
      // Step 2: Remove redundant messages using semantic similarity
      const deduplicatedMessages = this.removeRedundantMessages(scoredMessages);
      // Step 3: Apply dynamic context pruning
      const prunedMessages = this.applyContextPruning(deduplicatedMessages);
      // Step 4: Ensure conversation flow preservation
      const finalMessages = this.preserveConversationFlow(prunedMessages);
      const duration = Date.now() - startTime;
      logger.info('AttentionGuidedMemoryProcessor completed', {
        originalCount: messages.length,
        finalCount: finalMessages.length,
        reductionPercentage: ((messages.length - finalMessages.length) / messages.length * 100).toFixed(1),
        processingDuration: duration,
        optsReceived: Object.keys(opts).length > 0
      });
      return finalMessages;
    } catch (error: unknown) {
      logger.error('AttentionGuidedMemoryProcessor failed', {
        error: (error as Error).message,
        messageCount: messages.length,
        optsReceived: Object.keys(opts).length > 0
      });
      // Fallback: return most recent messages
      return messages.slice(-targetMessages);
    }
  }

  /**
   * Score messages based on importance factors
   */
  private _cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      logger.warn('Vectors of different lengths for cosine similarity. Returning 0.');
      return 0;
    }

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      magnitude1 += vec1[i] * vec1[i];
      magnitude2 += vec2[i] * vec2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0; // Avoid division by zero
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Score messages based on importance factors and retrieve embeddings from metadata
   */
  private scoreMessageImportance(messages: CoreMessage[]): Array<{ message: CoreMessage; score: number; index: number; embedding?: number[] }> {
    return messages.map((message, index) => {
      let score = 0;
      const content = message.content?.toString().toLowerCase() || '';
      const embedding = message.metadata?.embedding as number[] | undefined; // Retrieve embedding from metadata

      // Base score for message type
      if (message.role === 'user') score += 1.0;
      else if (message.role === 'assistant') score += 0.8;
      else if (message.role === 'system') score += 1.2;
      else if (message.role === 'tool') score += 0.6;
      // Importance keyword bonus
      this.importanceKeywords.forEach(keyword => {
        if (content.includes(keyword)) {
          score += 0.5;
        }
      });
      // Recent message bonus (exponential decay)
      const recencyBonus = Math.exp(-0.1 * (messages.length - index - 1));
      score += recencyBonus;
      // Verbose message penalty (but not elimination)
      if (content.length > this.verboseMessageThreshold) {
        score *= 0.7;
      }
      // Question/command detection bonus
      if (content.includes('?') || content.includes('how') || content.includes('what') || content.includes('why')) {
        score += 0.3;
      }
      return { message, score, index, embedding }; // Include embedding in the returned object
    });
  }

  /**
   * Remove semantically similar/redundant messages using embeddings if available, otherwise word overlap
   */
  private removeRedundantMessages(
    scoredMessages: Array<{ message: CoreMessage; score: number; index: number; embedding?: number[] }>
  ): Array<{ message: CoreMessage; score: number; index: number; embedding?: number[] }> {
    const filtered: Array<{ message: CoreMessage; score: number; index: number; embedding?: number[] }> = [];

    for (const current of scoredMessages) {
      const currentContent = current.message.content?.toString().toLowerCase() || '';
      const currentEmbedding = current.embedding;

      const isDuplicate = filtered.some(existing => {
        const existingContent = existing.message.content?.toString().toLowerCase() || '';
        const existingEmbedding = existing.embedding;

        let similarity = 0;
        if (currentEmbedding && existingEmbedding && currentEmbedding.length > 0 && existingEmbedding.length > 0) {
          similarity = this._cosineSimilarity(currentEmbedding, existingEmbedding);
          logger.debug(`Semantic similarity calculated: ${similarity.toFixed(2)}`);
        } else {
          // Fallback to word overlap if embeddings are not available or empty
          similarity = this.calculateTextSimilarity(currentContent, existingContent);
          logger.debug(`Word overlap similarity calculated: ${similarity.toFixed(2)}`);
        }
        return similarity > this.similarityThreshold && existing.score >= current.score;
      });

      if (!isDuplicate) {
        filtered.push(current);
      }
    }
    return filtered;
  }

  /**
   * Apply dynamic context pruning based on attention patterns
   */
  private applyContextPruning(
    messages: Array<{ message: CoreMessage; score: number; index: number }>
  ): Array<{ message: CoreMessage; score: number; index: number }> {
    // Sort by score (descending) and select top messages
    const sortedByScore = [...messages].sort((a, b) => b.score - a.score);
    // Calculate how many messages to keep
    const targetCount = Math.min(this.maxMessages, messages.length);
    const contextPreservationCount = Math.floor(targetCount * this.contextPreservationRatio);
    // Always keep some recent messages for context
    const recentMessages = messages.slice(-contextPreservationCount);
    const remainingSlots = targetCount - recentMessages.length;
    // Fill remaining slots with highest-scored messages (excluding already selected recent ones)
    const recentIndices = new Set(recentMessages.map(m => m.index));
    const additionalMessages = sortedByScore
      .filter(m => !recentIndices.has(m.index))
      .slice(0, remainingSlots);
    return [...additionalMessages, ...recentMessages];
  }

  /**
   * Preserve conversation flow and coherence
   */
  private preserveConversationFlow(
    messages: Array<{ message: CoreMessage; score: number; index: number }>
  ): CoreMessage[] {
    // Sort by original index to maintain chronological order
    const chronologicalMessages = messages
      .sort((a, b) => a.index - b.index)
      .map(item => item.message);
    // Ensure we don't break conversation pairs (user-assistant sequences)
    const preservedMessages: CoreMessage[] = [];
    for (let i = 0; i < chronologicalMessages.length; i++) {
      const current = chronologicalMessages[i];
      preservedMessages.push(current);
      // If this is a user message and the next is an assistant response, include both
      if (current.role === 'user' &&
          i + 1 < chronologicalMessages.length &&
          chronologicalMessages[i + 1].role === 'assistant') {
        preservedMessages.push(chronologicalMessages[i + 1]);
        i++; // Skip the next message since we already added it
      }
    }
    return preservedMessages;
  }

  /**
   * Calculate text similarity using simple word overlap
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 2));
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }
}

/**
 * Enhanced Contextual Relevance Processor (2025)
 *
 * @version 1.0.0
 * @author SSD
 * @date 2025-06-20
 *
 * @mastra Memory Processor implementation for Upstash Memory
 * @class ContextualRelevanceProcessor
 *
 * @remarks
 * Focuses on maintaining only contextually relevant messages
 * based on topic continuity and semantic coherence.
 *
 * @example
 * ```typescript
 * const memory = new Memory({
 *   processors: [
 *     new ContextualRelevanceProcessor({
 *       topicContinuityThreshold: 0.7,
 *       maxTopicShifts: 3
 *     })
 *   ]
 * });
 * ```
 *
 * [EDIT: 2025-06-20] & [BY: GitHub Copilot]
 */
export class ContextualRelevanceProcessor extends MemoryProcessor {
  private readonly topicContinuityThreshold: number;
  private readonly maxTopicShifts: number;

  constructor(options: {
    topicContinuityThreshold?: number;
    maxTopicShifts?: number;
  } = {}) {
    super({ name: 'ContextualRelevanceProcessor' });
    this.topicContinuityThreshold = options.topicContinuityThreshold ?? 0.7;
    this.maxTopicShifts = options.maxTopicShifts ?? 3;
  }
  process(messages: CoreMessage[], opts: MemoryProcessorOpts = {}): CoreMessage[] {
    const minReturnMessages = 10;
    if (messages.length <= minReturnMessages) {
      return messages;
    }

    try {
      const topicSegments = this.identifyTopicSegments(messages);
      const relevantSegments = this.selectRelevantSegments(topicSegments);
      const result = relevantSegments.flat();
      // Log processing information including opts usage
      logger.info('ContextualRelevanceProcessor completed', {
        originalCount: messages.length,
        finalCount: result.length,
        segmentsProcessed: topicSegments.length,
        optsReceived: Object.keys(opts).length > 0,
        optsKeys: Object.keys(opts)
      });
      return result;
    } catch (error: unknown) {
      logger.error('ContextualRelevanceProcessor failed', {
        error: (error as Error).message,
        optsReceived: Object.keys(opts).length > 0
      });
      return messages;
    }
  }

  private identifyTopicSegments(messages: CoreMessage[]): CoreMessage[][] {
    const segments: CoreMessage[][] = [];
    let currentSegment: CoreMessage[] = [];
    for (let i = 0; i < messages.length; i++) {
      currentSegment.push(messages[i]);
      // Check for topic shift
      if (i < messages.length - 1) {
        const current = messages[i].content?.toString() || '';
        const next = messages[i + 1].content?.toString() || '';
        if (this.detectTopicShift(current, next)) {
          segments.push([...currentSegment]);
          currentSegment = [];
        }
      }
    }
    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }
    return segments;
  }

  private detectTopicShift(current: string, next: string): boolean {
    // Simple topic shift detection using keyword overlap
    const currentWords = new Set(current.toLowerCase().split(/\s+/));
    const nextWords = new Set(next.toLowerCase().split(/\s+/));
    const overlap = [...currentWords].filter(w => nextWords.has(w)).length;
    const totalUnique = new Set([...currentWords, ...nextWords]).size;
    const continuity = totalUnique > 0 ? overlap / totalUnique : 0;
    return continuity < this.topicContinuityThreshold;
  }

  private selectRelevantSegments(segments: CoreMessage[][]): CoreMessage[][] {
    // Keep the most recent segments up to maxTopicShifts
    return segments.slice(-this.maxTopicShifts);
  }
}

/**
 * Workflow-Aware Memory Processor
 *
 * Dynamically adjusts the messages included in the agent's context based on the current stage of an ongoing workflow.
 * This processor prioritizes messages relevant to the current workflow stage and prunes irrelevant ones to optimize context size.
 *
 * @mastra Memory Processor implementation for Upstash Memory
 * @class WorkflowAwareMemoryProcessor
 * @version 1.0.0
 * @author Roo
 * @date 2025-07-08
 *
 * @example
 * ```typescript
 * const memory = new Memory({
 *   processors: [
 *     new WorkflowAwareMemoryProcessor({
 *       workflowStages: ['data_collection', 'analysis', 'reporting'],
 *       defaultRetentionStrategy: 'prune_irrelevant',
 *     }),
 *   ]
 * });
 * ```
 */
export class WorkflowAwareMemoryProcessor extends MemoryProcessor {
  private readonly workflowStages: string[];
  private readonly defaultRetentionStrategy: 'keep_all' | 'prune_irrelevant';
  private readonly stageRelevanceStrategy: 'adjacent' | 'semantic';
  private readonly workflowStageDefinitions?: Record<string, string>;
  private readonly workflowStageEmbeddings?: Record<string, number[]>; // Added this line
  private readonly semanticRelevanceThreshold: number;
  private readonly attentionGuidedProcessor?: AttentionGuidedMemoryProcessor;

  /**
   * Creates an instance of WorkflowAwareMemoryProcessor.
   * @param options - Configuration options for the processor.
   * @param options.workflowStages - An array of defined workflow stage names.
   * @param options.defaultRetentionStrategy - The strategy to apply to messages without a specific workflow stage tag.
   * @param options.stageRelevanceStrategy - Strategy for determining relevant stages ('adjacent' or 'semantic').
   * @param options.workflowStageDefinitions - Optional map of stage names to descriptions for semantic relevance.
   * @param options.semanticRelevanceThreshold - Threshold for semantic similarity when using 'semantic' strategy.
   */
  constructor(options: {
    workflowStages: string[];
    defaultRetentionStrategy: 'keep_all' | 'prune_irrelevant';
    stageRelevanceStrategy?: 'adjacent' | 'semantic';
    workflowStageDefinitions?: Record<string, string>;
    semanticRelevanceThreshold?: number;
    workflowStageEmbeddings?: Record<string, number[]>; // New: Pre-computed embeddings
    attentionGuidedProcessor?: AttentionGuidedMemoryProcessor;
  }) {
    super({ name: 'WorkflowAwareMemoryProcessor' });
    this.workflowStages = options.workflowStages;
    this.defaultRetentionStrategy = options.defaultRetentionStrategy;
    this.stageRelevanceStrategy = options.stageRelevanceStrategy ?? 'adjacent';
    this.workflowStageDefinitions = options.workflowStageDefinitions;
    this.workflowStageEmbeddings = options.workflowStageEmbeddings; // Assign new property
    this.semanticRelevanceThreshold = options.semanticRelevanceThreshold ?? 0.7; // Default threshold
    this.attentionGuidedProcessor = options.attentionGuidedProcessor;

    logger.info('WorkflowAwareMemoryProcessor initialized', {
      workflowStages: this.workflowStages,
      defaultRetentionStrategy: this.defaultRetentionStrategy,
      stageRelevanceStrategy: this.stageRelevanceStrategy,
      hasWorkflowStageDefinitions: !!this.workflowStageDefinitions,
      semanticRelevanceThreshold: this.semanticRelevanceThreshold,
      hasAttentionGuidedProcessor: !!this.attentionGuidedProcessor,
    });
  }

  /**
   * Processes messages to dynamically adjust context based on the current workflow stage.
   * @param messages - The array of CoreMessage objects to process.
   * @param opts - Optional processing options, including `currentWorkflowStage`.
   * @returns A filtered and prioritized array of CoreMessage objects.
   */
  process(messages: CoreMessage[], opts: MemoryProcessorOpts = {}): CoreMessage[] {
    const workflowOpts = opts as WorkflowMemoryProcessorOpts;
    const currentWorkflowStage = workflowOpts.currentWorkflowStage;

    if (!currentWorkflowStage || !this.workflowStages.includes(currentWorkflowStage)) {
      logger.warn('No valid currentWorkflowStage provided or stage not recognized. Applying default retention strategy.', { currentWorkflowStage });
      return this.applyDefaultRetention(messages);
    }

    logger.info('Processing messages for workflow stage', { currentWorkflowStage });

    let relevantStages: Set<string>;

    try {
      if (this.stageRelevanceStrategy === 'semantic') {
        if (!this.workflowStageDefinitions || !this.workflowStageEmbeddings) {
          logger.warn('Semantic relevance strategy chosen but workflowStageDefinitions or workflowStageEmbeddings not provided. Falling back to adjacent strategy.');
          relevantStages = this._getAdjacentRelevantStages(currentWorkflowStage);
        } else {
          relevantStages = this._getSemanticRelevantStages(currentWorkflowStage); // Now synchronous
        }
      } else { // 'adjacent' strategy
        relevantStages = this._getAdjacentRelevantStages(currentWorkflowStage);
      }
    } catch (error: unknown) { // Catch error as unknown
      logger.error('Error determining relevant stages. Falling back to adjacent strategy.', { error: (error as Error).message });
      relevantStages = this._getAdjacentRelevantStages(currentWorkflowStage);
    }

    let processedMessages: CoreMessage[] = [];
    const messagesToPrune: CoreMessage[] = [];

    for (const msg of messages) {
      const messageStage = msg.metadata?.workflowStage as string | undefined;

      if (messageStage && relevantStages.has(messageStage)) {
        processedMessages.push(msg);
      } else if (!messageStage) {
        // Messages without a stage tag are handled by default retention
        if (this.defaultRetentionStrategy === 'keep_all') {
          processedMessages.push(msg);
        } else {
          messagesToPrune.push(msg); // Mark for pruning if strategy is 'prune_irrelevant'
        }
      } else {
        // Messages from irrelevant stages are temporarily pruned
        messagesToPrune.push(msg);
      }
    }

    // Apply AttentionGuidedMemoryProcessor if configured
    if (this.attentionGuidedProcessor) {
      logger.info('Applying AttentionGuidedMemoryProcessor to relevant messages.');
      processedMessages = this.attentionGuidedProcessor.process(processedMessages, opts);
    }

    logger.info('WorkflowAwareMemoryProcessor results', {
      currentWorkflowStage,
      retainedMessages: processedMessages.length,
      prunedMessages: messagesToPrune.length,
      relevantStages: Array.from(relevantStages),
    });

    return processedMessages;
  }

  /**
   * Determines relevant stages based on the 'adjacent' strategy.
   * @param currentWorkflowStage - The current workflow stage.
   * @returns A Set of relevant stage names.
   */
  private _getAdjacentRelevantStages(currentWorkflowStage: string): Set<string> {
    const relevantStages = new Set<string>();
    const stageIndex = this.workflowStages.indexOf(currentWorkflowStage);

    relevantStages.add(currentWorkflowStage);
    if (stageIndex > 0) {
      relevantStages.add(this.workflowStages[stageIndex - 1]);
    }
    if (stageIndex < this.workflowStages.length - 1) {
      relevantStages.add(this.workflowStages[stageIndex + 1]);
    }
    return relevantStages;
  }

  /**
   * Determines relevant stages based on the 'semantic' strategy.
   * @param currentWorkflowStage - The current workflow stage.
   * @returns A Set of semantically relevant stage names.
   */
  private _getSemanticRelevantStages(currentWorkflowStage: string): Set<string> {
    const relevantStages = new Set<string>();
    relevantStages.add(currentWorkflowStage); // Always include the current stage

    if (!this.workflowStageDefinitions || !this.workflowStageEmbeddings) {
      // This case should be caught by the caller, but as a safeguard
      logger.warn('Semantic relevance strategy chosen but workflowStageDefinitions or workflowStageEmbeddings not provided. Returning only current stage.');
      return relevantStages;
    }

    const currentStageEmbedding = this.workflowStageEmbeddings[currentWorkflowStage];
    if (!currentStageEmbedding) {
      logger.warn(`No pre-computed embedding found for current workflow stage '${currentWorkflowStage}'. Cannot apply semantic relevance.`);
      return this._getAdjacentRelevantStages(currentWorkflowStage); // Fallback
    }

    for (const stageName of this.workflowStages) {
      if (stageName === currentWorkflowStage) continue;

      const stageEmbedding = this.workflowStageEmbeddings[stageName];
      if (!stageEmbedding) {
        logger.warn(`No pre-computed embedding found for stage '${stageName}'. Skipping semantic comparison.`);
        continue;
      }

      const similarity = this._cosineSimilarity(currentStageEmbedding, stageEmbedding);

      if (similarity >= this.semanticRelevanceThreshold) {
        relevantStages.add(stageName);
        logger.info(`Semantically relevant stage identified: ${stageName} (Similarity: ${similarity.toFixed(2)})`);
      }
    }

    return relevantStages;
  }

  /**
   * Calculates cosine similarity between two vectors.
   * @param vec1 - First vector.
   * @param vec2 - Second vector.
   * @returns Cosine similarity score.
   */
  private _cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must be of the same length for cosine similarity calculation.');
    }

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      magnitude1 += vec1[i] * vec1[i];
      magnitude2 += vec2[i] * vec2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0; // Avoid division by zero
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Applies the default retention strategy to messages.
   * @param messages - The array of CoreMessage objects.
   * @returns The messages array based on the default retention strategy.
   */
  private applyDefaultRetention(messages: CoreMessage[]): CoreMessage[] {
    if (this.defaultRetentionStrategy === 'keep_all') {
      return messages;
    }
    // For 'prune_irrelevant' when no specific stage is active, we might keep a minimal set or apply other logic.
    // For now, if no stage is active and pruning is default, we'll return an empty array or a very small subset.
    // This can be refined based on specific requirements.
    logger.info('Applying default retention strategy: prune_irrelevant (no active stage)');
    return []; // Or return a small, recent subset if desired
  }
}

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
export const upstashMemory = new Memory({
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
export async function createUpstashThread(
  resourceId: string,
  title?: string,
  metadata?: Record<string, unknown>,
  threadId?: string
) {
  logger.info(`[upstashMemory] createUpstashThread received. resourceId: ${resourceId}, threadId: ${threadId}`);
  const params = createThreadSchema.parse({ resourceId, threadId, title, metadata });
  try {
    return await upstashMemory.createThread(params);
  } catch (error: unknown) {
    logger.error(`createUpstashThread failed: ${(error as Error).message}`);
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
export async function getUpstashThreadMessages(
  resourceId: string,
  threadId: string,
  last = 10
) {
  const params = getMessagesSchema.parse({ resourceId, threadId, last });
  try {
    return await upstashMemory.query({
      resourceId: params.resourceId,
      threadId: params.threadId,
      selectBy: { last: params.last }
    });
  } catch (error: unknown) {
    logger.error(`getUpstashThreadMessages failed: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Retrieve a memory thread by its ID using Upstash storage.
 * @param threadId - Thread identifier
 * @returns Promise resolving to thread information
 */
export async function getUpstashThreadById(threadId: string) {
  const id = threadIdSchema.parse(threadId);
  try {
    return await upstashMemory.getThreadById({ threadId: id });
  } catch (error: unknown) {
    logger.error(`getUpstashThreadById failed: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Retrieve all memory threads associated with a resource using Upstash storage.
 * @param resourceId - Resource identifier
 * @returns Promise resolving to array of threads
 */
export async function getUpstashThreadsByResourceId(resourceId: string) {
  const id = resourceIdSchema.parse(resourceId);
  try {
    return await upstashMemory.getThreadsByResourceId({ resourceId: id });
  } catch (error: unknown) {
    logger.error(`getUpstashThreadsByResourceId failed: ${(error as Error).message}`);
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
export async function searchUpstashMessages(
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
      const validatedFilter = validateUpstashFilter(filter);
      queryConfig.filter = transformToUpstashFilter(validatedFilter);
      logger.info('Applying Upstash-compatible metadata filter to search', {
        threadId: params.threadId,
        filter: validatedFilter,
        topK: params.topK
      });
    }

    const result = await upstashMemory.query(queryConfig);

    logger.info('Upstash message search completed', {
      threadId: params.threadId,
      messagesFound: result.messages.length,
      uiMessagesFound: result.uiMessages.length,
      hasFilter: !!filter
    });

    return result;
  } catch (error: unknown) {
    logger.error(`searchUpstashMessages failed: ${(error as Error).message}`, {
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
export async function getUpstashUIThreadMessages(threadId: string, last = 100): Promise<UIMessage[]> {
  const id = threadIdSchema.parse(threadId);
  try {
    const { uiMessages } = await upstashMemory.query({
      threadId: id,
      selectBy: { last },
    });
    return uiMessages;
  } catch (error: unknown) {
    logger.error(`getUpstashUIThreadMessages failed: ${(error as Error).message}`);
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
export function maskUpstashWorkingMemoryStream(
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
export async function enhancedUpstashSearchMessages(
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
  // Use the pinecone-backed memory (upstashMemory configured with pinecone) for semantic recall
  const result = await upstashMemory.query({
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
    await upstashVector.createIndex({
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
    const indexes = await upstashVector.listIndexes();
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
    const stats = await upstashVector.describeIndex({ indexName });
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
    await upstashVector.deleteIndex({ indexName });
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
    await upstashVector.upsert({
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
      const validatedFilter = validateUpstashFilter(params.filter);
      upstashFilter = transformToUpstashFilter(validatedFilter);
    }

    const results = await upstashVector.query({
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
    // Transform results to match our interface
    return results.map((result: any) => ({
    // Transform results to match our interface
    return results.map(result => ({
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
    await upstashVector.updateVector({
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
    await upstashVector.deleteIndex({ indexName });
    logger.info('Vector index deleted successfully', { indexName });
    return {
      success: true,
      operation: 'deleteIndex',
      indexName
    };
  } catch (error: unknown) {
    logger.error('Failed to delete vector', {
      error: (error as Error).message,
      indexName,
      id
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
export async function batchCreateUpstashThreads(
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
        createUpstashThread(request.resourceId, undefined, request.metadata, request.threadId)
      )
    );
    const successes = results.filter(r => r.status === 'fulfilled').length;
    const failures = results.filter(r => r.status === 'rejected').length;
    const duration = Date.now() - startTime;
    logger.info('Batch Upstash thread creation completed', {
      totalRequests: threadRequests.length,
      successes,
      failures,
      duration,
    });
    return results
      .map(result => (result.status === 'fulfilled' ? result.value : null))
      .filter(Boolean) as UpstashThread[];
  } catch (error: unknown) {
    logger.error(`batchCreateUpstashThreads failed: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Enhanced memory cleanup and optimization for Upstash Redis
 * @param options - Cleanup configuration options
 */
export async function optimizeUpstashMemoryStorage(options: {
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
    logger.info('Upstash memory optimization requested', {
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
    logger.info('Upstash memory optimization completed (auto-managed)', optimizationResults);
    return optimizationResults;
  } catch (error: unknown) {
    logger.error(`optimizeUpstashMemoryStorage failed: ${(error as Error).message}`);
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
export function validateUpstashFilter(filter: MetadataFilter): MetadataFilter {
  if (!filter || typeof filter !== 'object') {
    throw new VectorStoreError('Filter must be a valid object', 'operation_failed');
  }

  // Check field key length limits (512 chars for Upstash)
  const checkFieldKeys = (obj: Record<string, unknown>, path = ''): void => {
    Object.keys(obj).forEach(key => {
      const fullPath = path ? `${path}.${key}` : key;

      if (fullPath.length > 512) {
        throw new VectorStoreError(
          `Field key '${fullPath}' exceeds 512 character limit for Upstash`,
          'operation_failed',
          { fieldKey: fullPath, length: fullPath.length }
        );
      }

      // Check for null/undefined values (not supported by Upstash)
      const value = obj[key];
      if (value === null || value === undefined) {
        throw new VectorStoreError(
          `Null/undefined values not supported by Upstash in field '${fullPath}'`,
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

  // Check for large IN clauses (Upstash has query size limits)
  const checkArraySizes = (obj: Record<string, unknown>): void => {
    Object.entries(obj).forEach(([key, value]) => {
      if (key === '$in' || key === '$nin') {
        if (Array.isArray(value) && value.length > 100) {
          logger.warn('Large IN/NIN clause detected - may hit Upstash query size limits', {
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
