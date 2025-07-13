import { MemoryProcessor, MemoryProcessorOpts } from '@mastra/core/memory';
import { CoreMessage as OriginalCoreMessage } from '@mastra/core';
import { PinoLogger } from '@mastra/loggers';

type CoreMessage = OriginalCoreMessage & {
  metadata?: Record<string, unknown>;
};

const logger = new PinoLogger({ name: 'processor-extra', level: 'info' });

export class ExtendedMemoryProcessor extends MemoryProcessor {
  constructor() {
    super({ name: 'processor-extra' });
  }

  override process(messages: CoreMessage[], opts: MemoryProcessorOpts = {}): CoreMessage[] {
    messages.forEach(msg =>
      logger.info('Processing message with metadata', { metadata: msg.metadata })
    );
    return super.process(messages, opts);
  }
}


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
