import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { PinoLogger } from "@mastra/loggers";

const logger = new PinoLogger({ name: 'ClearThoughtNativeTools', level: 'info' });

/**
 * Type definitions for mental model implementations
 */
type MentalModelImplementation = {
  applyFirstPrinciples: (problem: string) => string;
  applyOpportunityCost: (problem: string) => string;
  applyErrorPropagation: (problem: string) => string;
  applyRubberDuck: (problem: string) => string;
  applyParetoApplication: (problem: string) => string;
  applyOccamsRazor: (problem: string) => string;
};

/**
 * Mental model implementation logic
 */
const mentalModelImplementations: MentalModelImplementation = {
  applyFirstPrinciples: (problem: string) => {
    return `First Principles Analysis: Breaking down "${problem}" into fundamental truths and building up from basic assumptions. Identifying core components and their relationships.`;
  },
  applyOpportunityCost: (problem: string) => {
    return `Opportunity Cost Analysis: Evaluating "${problem}" by considering what alternatives are being foregone. Weighing the value of the chosen path against the next best alternative.`;
  },
  applyErrorPropagation: (problem: string) => {
    return `Error Propagation Analysis: Examining how errors in "${problem}" could cascade through the system. Identifying potential failure points and their downstream effects.`;
  },
  applyRubberDuck: (problem: string) => {
    return `Rubber Duck Analysis: Explaining "${problem}" step-by-step as if to a rubber duck. This process often reveals overlooked aspects and clarifies thinking.`;
  },
  applyParetoApplication: (problem: string) => {
    return `Pareto Principle Analysis: Identifying the 20% of factors in "${problem}" that contribute to 80% of the results. Focusing on high-impact elements.`;
  },
  applyOccamsRazor: (problem: string) => {
    return `Occam's Razor Analysis: Seeking the simplest explanation for "${problem}". Eliminating unnecessary complexity and focusing on the most straightforward solution.`;
  }
};

/**
 * Debugging approach implementations
 */
const debuggingImplementations = {
  binarySearch: (issue: string) => {
    return `Binary Search Debugging: Systematically narrowing down the problem space for "${issue}" by eliminating half of the possibilities at each step.`;
  },
  reverseEngineering: (issue: string) => {
    return `Reverse Engineering Debugging: Working backwards from the symptoms of "${issue}" to identify root causes and understand the system flow.`;
  },
  divideConquer: (issue: string) => {
    return `Divide and Conquer Debugging: Breaking "${issue}" into smaller, manageable sub-problems and solving each independently.`;
  },
  backtracking: (issue: string) => {
    return `Backtracking Debugging: Tracing the execution path of "${issue}" step by step to identify where the problem first occurs.`;
  },
  causeElimination: (issue: string) => {
    return `Cause Elimination Debugging: Systematically eliminating potential causes of "${issue}" one by one until the root cause is identified.`;
  },
  programSlicing: (issue: string) => {
    return `Program Slicing Debugging: Analyzing only the parts of the code that could affect "${issue}", reducing complexity and focusing investigation.`;
  }
};

// --- sequentialthinking ---
export const sequentialThinkingInputSchema = z.object({
  thought: z.string().describe("Your current thinking step."),
  nextThoughtNeeded: z.boolean().describe("Whether another thought step is needed."),
  thoughtNumber: z.number().int().min(1).describe("Current thought number."),
  totalThoughts: z.number().int().min(1).describe("Estimated total thoughts needed."),
  isRevision: z.boolean().optional().describe("Whether this revises previous thinking."),
  revisesThought: z.number().int().min(1).optional().describe("Which thought is being reconsidered."),
  branchFromThought: z.number().int().min(1).optional().describe("Branching point thought number."),
  branchId: z.string().optional().describe("Branch identifier."),
  needsMoreThoughts: z.boolean().optional().describe("If more thoughts are needed."),
}).strict();

export const sequentialThinkingOutputSchema = z.object({
  status: z.string().describe("Status of the thinking process."),
  summary: z.string().optional().describe("Summary of the current thought step."),
  nextThoughtNeeded: z.boolean().describe("Whether another thought step is needed."),
  thoughtNumber: z.number().int().describe("Current thought number."),
  totalThoughts: z.number().int().describe("Updated estimated total thoughts needed."),
}).strict();

/**
 * Sequential thinking tool for dynamic and reflective problem-solving
 *
 * This tool enables structured, step-by-step thinking processes with support for:
 * - Linear progression through numbered thoughts
 * - Revision of previous thoughts
 * - Branching to explore alternative paths
 * - Dynamic adjustment of total thought count
 *
 * @example
 * ```typescript
 * const result = await sequentialThinkingTool.execute({
 *   context: {
 *     thought: "Let me analyze this problem step by step",
 *     nextThoughtNeeded: true,
 *     thoughtNumber: 1,
 *     totalThoughts: 5
 *   }
 * });
 * ```
 */
export const sequentialThinkingTool = createTool({
  id: "sequential-thinking-native",
  description: "A native tool for dynamic and reflective problem-solving through thoughts.",
  inputSchema: sequentialThinkingInputSchema,
  outputSchema: sequentialThinkingOutputSchema,
  execute: async ({ context }) => {
    // Destructure validated input from context
    const {
      thought,
      nextThoughtNeeded,
      thoughtNumber,
      totalThoughts,
      isRevision,
      revisesThought,
      branchFromThought,
      branchId,
      needsMoreThoughts
    } = context;
    try {
      logger.info('Executing sequentialThinkingTool natively', { thought, thoughtNumber });
      // Validate required fields
      const status = "processed";
      let summary = `Thought ${thoughtNumber}: ${thought}`;
      let updatedNextThoughtNeeded = nextThoughtNeeded;
      let updatedTotalThoughts = totalThoughts;

      // Handle dynamic thought count adjustment
      if (needsMoreThoughts) {
        updatedNextThoughtNeeded = true;
        updatedTotalThoughts = totalThoughts + 1;
      }

      // Handle thought revision
      if (isRevision && revisesThought) {
        summary = `Revision of Thought ${revisesThought}: ${thought}`;
        logger.info(`Thought revision detected`, { revisesThought, thoughtNumber });
      }

      // Handle thought branching
      if (branchFromThought && branchId) {
        summary = `Branch from Thought ${branchFromThought} (Branch ID: ${branchId}): ${thought}`;
        logger.info(`Thought branching detected`, { branchFromThought, branchId, thoughtNumber });
      }

      const result = {
        status,
        summary,
        nextThoughtNeeded: updatedNextThoughtNeeded,
        thoughtNumber,
        totalThoughts: updatedTotalThoughts,
      };

      logger.info('Sequential thinking completed successfully', result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Sequential thinking failed', { error: errorMessage });
      throw new Error(`Sequential thinking failed: ${errorMessage}`);
    }
  },
});

// --- mentalmodel ---
export const mentalModelInputSchema = z.object({
  modelName: z.enum(["first_principles", "opportunity_cost", "error_propagation", "rubber_duck", "pareto_principle", "occams_razor"]).describe("The mental model to apply."),
  problem: z.string().describe("The problem to analyze using the mental model."),
  steps: z.array(z.string()).optional().describe("Steps taken or to be taken in applying the model."),
  reasoning: z.string().optional().describe("Detailed reasoning process."),
  conclusion: z.string().optional().describe("Conclusion derived from applying the model."),
}).strict();

export const mentalModelOutputSchema = z.object({
  status: z.string().describe("Status of the mental model application."),
  analysis: z.string().describe("Result of the mental model analysis."),
  modelUsed: z.string().describe("The mental model that was applied."),
}).strict();

/**
 * Mental model tool for structured problem-solving approaches
 *
 * Implements six core mental models for systematic analysis:
 * - First Principles: Breaking down to fundamental truths
 * - Opportunity Cost: Evaluating alternatives and trade-offs
 * - Error Propagation: Analyzing failure modes and cascading effects
 * - Rubber Duck: Explaining problems step-by-step for clarity
 * - Pareto Principle: Identifying high-impact factors (80/20 rule)
 * - Occam's Razor: Seeking the simplest viable explanation
 *
 * @example
 * ```typescript
 * const result = await mentalModelTool.execute({
 *   context: {
 *     modelName: "first_principles",
 *     problem: "How to optimize database performance"
 *   }
 * });
 * ```
 */
export const mentalModelTool = createTool({
  id: "mental-model-native",
  description: "A native tool for applying structured mental models to problem-solving.",
  inputSchema: mentalModelInputSchema,
  outputSchema: mentalModelOutputSchema,
  execute: async ({ context }) => {
    const { modelName, problem, steps, reasoning, conclusion } = context;
    try {
      logger.info(`Executing mentalModelTool natively with model: ${modelName}`, { modelName, problem });
      // Validate required fields
      let analysis = `Applied ${modelName} to problem: "${problem}".`;
      if (!problem || !modelName) {
        throw new Error("Both 'modelName' and 'problem' are required fields.");
      }
      // Apply specific mental model logic
      switch (modelName) {
        case "first_principles":
          analysis += mentalModelImplementations.applyFirstPrinciples(problem);
          break;
        case "opportunity_cost":
          analysis += mentalModelImplementations.applyOpportunityCost(problem);
          break;
        case "error_propagation":
          analysis += mentalModelImplementations.applyErrorPropagation(problem);
          break;
        case "rubber_duck":
          analysis += mentalModelImplementations.applyRubberDuck(problem);
          break;
        case "pareto_principle":
          analysis += mentalModelImplementations.applyParetoApplication(problem);
          break;
        case "occams_razor":
          analysis += mentalModelImplementations.applyOccamsRazor(problem);
          break;
      }

      // Include additional context if provided
      if (steps && steps.length > 0) {
        analysis += ` Steps: ${steps.join(', ')}.`;
      }
      if (reasoning) {
        analysis += ` Reasoning: ${reasoning}.`;
      }
      if (conclusion) {
        analysis += ` Conclusion: ${conclusion}.`;
      }
      // Construct result object
      const result = {
        status: "completed",
        analysis,
        modelUsed: modelName,
      };

      logger.info('Mental model application completed successfully', result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Mental model application failed', { error: errorMessage });
      throw new Error(`Mental model application failed: ${errorMessage}`);
    }
  },
});

// --- debuggingapproach ---
export const debuggingApproachInputSchema = z.object({
  approachName: z.enum(["binary_search", "reverse_engineering", "divide_conquer", "backtracking", "cause_elimination", "program_slicing"]).describe("The debugging approach to apply."),
  issue: z.string().describe("The technical issue to debug."),
  steps: z.array(z.string()).optional().describe("Steps taken or to be taken in debugging."),
  findings: z.string().optional().describe("Findings from the debugging process."),
  resolution: z.string().optional().describe("Resolution of the issue."),
}).strict();

export const debuggingApproachOutputSchema = z.object({
  status: z.string().describe("Status of the debugging process."),
  report: z.string().describe("Debugging report."),
  approachUsed: z.string().describe("The debugging approach that was applied."),
}).strict();

/**
 * Debugging approach tool for systematic technical problem-solving
 *
 * Implements six proven debugging methodologies:
 * - Binary Search: Systematically narrowing problem space
 * - Reverse Engineering: Working backwards from symptoms
 * - Divide and Conquer: Breaking into manageable sub-problems
 * - Backtracking: Tracing execution paths step-by-step
 * - Cause Elimination: Systematic exclusion of potential causes
 * - Program Slicing: Analyzing only relevant code sections
 *
 * @example
 * ```typescript
 * const result = await debuggingApproachTool.execute({
 *   context: {
 *     approachName: "binary_search",
  execute: async ({ context }) => {
 *   }
 * });
 * ```
 */
export const debuggingApproachTool = createTool({
  id: "debugging-approach-native",
  description: "A native tool for applying systematic debugging approaches to solve technical issues.",
  inputSchema: debuggingApproachInputSchema,
  outputSchema: debuggingApproachOutputSchema,
  execute: async ({ context }) => {
    const { approachName, issue, steps, findings, resolution } = context;
    try {
      logger.info(`Executing debuggingApproachTool natively with approach: ${approachName}`, { approachName, issue });
      // Validate required fields
      if (!issue || !approachName) {
        throw new Error("Both 'issue' and 'approachName' are required fields.");
      }
      let report = `Applied ${approachName} to issue: "${issue}".`;

      // Apply specific debugging approach
      switch (approachName) {
        case "binary_search":
          report += ` ${debuggingImplementations.binarySearch(issue)}`;
          break;
        case "reverse_engineering":
          report += ` ${debuggingImplementations.reverseEngineering(issue)}`;
          break;
        case "divide_conquer":
          report += ` ${debuggingImplementations.divideConquer(issue)}`;
          break;
        case "backtracking":
          report += ` ${debuggingImplementations.backtracking(issue)}`;
          break;
        case "cause_elimination":
          report += ` ${debuggingImplementations.causeElimination(issue)}`;
          break;
        case "program_slicing":
          report += ` ${debuggingImplementations.programSlicing(issue)}`;
          break;
      }

      // Include additional context if provided
      if (steps && steps.length > 0) {
        report += ` Steps taken: ${steps.join(', ')}.`;
      }
      if (findings) {
        report += ` Findings: ${findings}.`;
      }
      if (resolution) {
        report += ` Resolution: ${resolution}.`;
      }
      // Construct result object
      const result = {
        status: resolution ? "resolved" : "in-progress",
        report,
        approachUsed: approachName,
      };

      logger.info('Debugging approach completed successfully', result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Debugging approach failed', { error: errorMessage });
      throw new Error(`Debugging approach failed: ${errorMessage}`);
    }
  },
});

// --- collaborativereasoning ---
export const collaborativeReasoningInputSchema = z.object({
  topic: z.string().describe("The topic for collaborative reasoning."),
  personas: z.array(z.object({
    id: z.string(),
    name: z.string(),
    expertise: z.array(z.string()),
    background: z.string(),
    perspective: z.string(),
    biases: z.array(z.string()),
    communication: z.object({ style: z.string(), tone: z.string() }),
  })).describe("List of personas involved in the collaboration."),
  contributions: z.array(z.object({
    personaId: z.string(),
    content: z.string(),
    type: z.enum(["observation", "question", "insight", "concern", "suggestion", "challenge", "synthesis"]),
    confidence: z.number().min(0).max(1),
    referenceIds: z.array(z.string()).optional(),
  })).describe("Contributions made by each persona."),
  stage: z.enum(["problem-definition", "ideation", "critique", "integration", "decision", "reflection"]).describe("Current stage of collaboration."),
  activePersonaId: z.string().describe("ID of the currently active persona."),
  nextPersonaId: z.string().optional().describe("ID of the next persona to contribute."),
  consensusPoints: z.array(z.string()).optional().describe("Points of consensus reached."),
  disagreements: z.array(z.object({
    topic: z.string(),
    positions: z.array(z.object({
      personaId: z.string(),
      position: z.string(),
      arguments: z.array(z.string()),
    })),
    resolution: z.object({
      type: z.enum(["consensus", "compromise", "integration", "tabled"]),
      description: z.string(),
    }).optional(),
  })).optional().describe("Identified disagreements and their resolutions."),
  keyInsights: z.array(z.string()).optional().describe("Key insights generated."),
  openQuestions: z.array(z.string()).optional().describe("Open questions remaining."),
  finalRecommendation: z.string().optional().describe("Final recommendation from the collaboration."),
  sessionId: z.string().describe("Unique identifier for this collaboration session."),
  iteration: z.number().int().min(0).describe("Current iteration of the collaboration."),
  suggestedContributionTypes: z.array(z.enum(["observation", "question", "insight", "concern", "suggestion", "challenge", "synthesis"])).optional().describe("Suggested types for the next contribution."),
  nextContributionNeeded: z.boolean().describe("Whether another contribution is needed."),
}).strict();

export const collaborativeReasoningOutputSchema = z.object({
  status: z.string().describe("Status of the collaborative reasoning process."),
  summary: z.string().describe("Summary of the collaboration's progress."),
  keyInsights: z.array(z.string()).describe("Key insights from the current stage."),
  nextSteps: z.array(z.string()).describe("Suggested next steps for the collaboration."),
}).strict();

export const collaborativeReasoningTool = createTool({
  id: "collaborative-reasoning-native",
  description: "A native tool for simulating expert collaboration with diverse perspectives.",
  inputSchema: collaborativeReasoningInputSchema,
  outputSchema: collaborativeReasoningOutputSchema,
  execute: async ({ context }) => {
    const { topic, stage, contributions, activePersonaId, personas } = context;
    try {
      logger.info(`Executing collaborativeReasoningTool natively for topic: ${topic}`, { topic, stage });

      let summary = `Collaboration on "${topic}" at stage "${stage}".`;
      const insights: string[] = [];
      const nextSteps: string[] = [];

      // Find active persona
      const activePersona = personas.find(p => p.id === activePersonaId);
      if (activePersona) {
        summary += ` Active persona: ${activePersona.name} (${activePersona.expertise.join(', ')}).`;
      }

      if (contributions.length > 0) {
        const latestContribution = contributions[contributions.length - 1];
        summary += ` Latest contribution: "${latestContribution.content}" (${latestContribution.type}, confidence: ${latestContribution.confidence}).`;
      }

      // Generate insights based on stage and contributions
      if (stage === "ideation" && contributions.length > 0) {
        insights.push("New ideas generated based on diverse perspectives.");
        insights.push("Cross-pollination of expertise areas identified.");
        nextSteps.push("Critique proposed ideas.");
        nextSteps.push("Identify potential integration points.");
      } else if (stage === "critique" && contributions.length > 0) {
        insights.push("Strengths and weaknesses of ideas identified.");
        insights.push("Potential risks and opportunities highlighted.");
        nextSteps.push("Integrate feedback and refine ideas.");
        nextSteps.push("Synthesize different viewpoints.");
      } else if (stage === "integration") {
        insights.push("Synthesis of different perspectives attempted.");
        nextSteps.push("Finalize integrated solution.");
        nextSteps.push("Prepare for decision stage.");
      }

      const result = {
        status: "in-progress",
        summary,
        keyInsights: insights,
        nextSteps,
      };

      logger.info('Collaborative reasoning completed successfully', result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Collaborative reasoning failed', { error: errorMessage });
      throw new Error(`Collaborative reasoning failed: ${errorMessage}`);
    }
  },
});

// --- decisionframework ---
export const decisionFrameworkInputSchema = z.object({
  decisionStatement: z.string().describe("The statement defining the decision to be made."),
  options: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
  })).describe("List of options to evaluate."),
  criteria: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    weight: z.number().min(0).max(1),
    evaluationMethod: z.enum(["quantitative", "qualitative", "boolean"]),
  })).describe("List of criteria for evaluation."),
  stakeholders: z.array(z.string()).optional().describe("List of stakeholders affected by the decision."),
  constraints: z.array(z.string()).optional().describe("List of constraints affecting the decision."),
  timeHorizon: z.string().optional().describe("Time horizon for the decision's impact."),
  riskTolerance: z.enum(["risk-averse", "risk-neutral", "risk-seeking"]).optional().describe("Risk tolerance for the decision."),
  possibleOutcomes: z.array(z.object({
    description: z.string(),
    probability: z.number().min(0).max(1),
    value: z.number(),
    optionId: z.string(),
    confidenceInEstimate: z.number().min(0).max(1),
  })).optional().describe("Possible outcomes for each option."),
  criteriaEvaluations: z.array(z.object({
    criterionId: z.string(),
    optionId: z.string(),
    score: z.number().min(0).max(1),
    justification: z.string(),
  })).optional().describe("Evaluations of each option against criteria."),
  informationGaps: z.array(z.object({
    description: z.string(),
    impact: z.number().min(0).max(1),
    researchMethod: z.string(),
  })).optional().describe("Identified information gaps."),
  analysisType: z.enum(["expected-utility", "multi-criteria", "maximin", "minimax-regret", "satisficing"]).describe("Type of decision analysis to perform."),
  stage: z.enum(["problem-definition", "options", "criteria", "evaluation", "analysis", "recommendation"]).describe("Current stage of decision analysis."),
  recommendation: z.string().optional().describe("Final recommendation."),
  sensitivityInsights: z.array(z.string()).optional().describe("Insights from sensitivity analysis."),
  expectedValues: z.record(z.number()).optional().describe("Calculated expected values for options."),
  multiCriteriaScores: z.record(z.number()).optional().describe("Calculated multi-criteria scores for options."),
  decisionId: z.string().describe("Unique identifier for this decision."),
  iteration: z.number().int().min(0).describe("Current iteration of the decision analysis."),
  suggestedNextStage: z.string().optional().describe("Suggested next stage in the process."),
  nextStageNeeded: z.boolean().describe("Whether another stage is needed."),
}).strict();

export const decisionFrameworkOutputSchema = z.object({
  status: z.string().describe("Status of the decision analysis."),
  recommendation: z.string().describe("The recommended option."),
  rationale: z.string().describe("Rationale for the recommendation."),
  analysisSummary: z.string().describe("Summary of the analysis performed."),
  nextStage: z.string().optional().describe("Suggested next stage in the decision process."),
}).strict();

export const decisionFrameworkTool = createTool({
  id: "decision-framework-native",
  description: "A native tool for structured decision analysis and rational choice.",
  inputSchema: decisionFrameworkInputSchema,
  outputSchema: decisionFrameworkOutputSchema,
  execute: async ({ context }) => {
    const { decisionStatement, options, criteria, stage, criteriaEvaluations, analysisType, suggestedNextStage } = context;
    try {
      logger.info(`Executing decisionFrameworkTool natively for: ${decisionStatement}`, { decisionStatement, stage });

      let recommendation = "No clear recommendation yet.";
      let rationale = "Analysis in progress.";
      let analysisSummary = `Analyzing "${decisionStatement}" using ${analysisType} at stage ${stage}.`;
      let nextStage = suggestedNextStage || "evaluation";

      if (stage === "evaluation" && criteriaEvaluations && options.length > 0) {
        // Calculate weighted scores for each option
        const scores: { [key: string]: number } = {};
        options.forEach(opt => scores[opt.id] = 0);

        criteriaEvaluations.forEach(evalItem => {
          const criterion = criteria.find(c => c.id === evalItem.criterionId);
          const weight = criterion?.weight || 1;
          scores[evalItem.optionId] += evalItem.score * weight;
        });

        const bestOptionId = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b, options[0].id);
        const bestOption = options.find(opt => opt.id === bestOptionId);
        if (!bestOption) {
          throw new Error("No valid option found for recommendation.");
        }
        if (bestOption) {
          recommendation = bestOption.name;
          rationale = `Based on weighted criteria evaluation, "${bestOption.name}" scored ${scores[bestOptionId].toFixed(2)} points.`;
          analysisSummary += ` Recommended "${bestOption.name}" with score ${scores[bestOptionId].toFixed(2)}.`;
          nextStage = "recommendation";
        }
      }

      const result = {
        status: "in-progress",
        recommendation,
        rationale,
        analysisSummary,
        nextStage,
      };

      logger.info('Decision framework completed successfully', result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Decision framework failed', { error: errorMessage });
      throw new Error(`Decision framework failed: ${errorMessage}`);
    }
  },
});

// --- metacognitivemonitoring ---
export const metacognitiveMonitoringInputSchema = z.object({
  task: z.string().describe("The task being monitored."),
  stage: z.enum(["knowledge-assessment", "planning", "execution", "monitoring", "evaluation", "reflection"]).describe("Current stage of the task."),
  knowledgeAssessment: z.object({
    domain: z.string(),
    knowledgeLevel: z.enum(["expert", "proficient", "familiar", "basic", "minimal", "none"]),
    confidenceScore: z.number().min(0).max(1),
    supportingEvidence: z.string(),
    knownLimitations: z.array(z.string()),
    relevantTrainingCutoff: z.string().optional(),
  }).optional().describe("Assessment of knowledge related to the task."),
  claims: z.array(z.object({
    claim: z.string(),
    status: z.enum(["fact", "inference", "speculation", "uncertain"]),
    confidenceScore: z.number().min(0).max(1),
    evidenceBasis: z.string(),
    falsifiabilityCriteria: z.string().optional(),
    alternativeInterpretations: z.array(z.string()).optional(),
  })).optional().describe("Claims made during the task."),
  reasoningSteps: z.array(z.object({
    step: z.string(),
    potentialBiases: z.array(z.string()),
    assumptions: z.array(z.string()),
    logicalValidity: z.number().min(0).max(1),
    inferenceStrength: z.number().min(0).max(1),
  })).optional().describe("Steps taken in reasoning."),
  overallConfidence: z.number().min(0).max(1).describe("Overall confidence in the task outcome."),
  uncertaintyAreas: z.array(z.string()).describe("Areas of uncertainty."),
  recommendedApproach: z.string().describe("Recommended approach for the task."),
  monitoringId: z.string().describe("Unique identifier for this monitoring session."),
  iteration: z.number().int().min(0).describe("Current iteration of the monitoring process."),
  suggestedAssessments: z.array(z.enum(["knowledge", "claim", "reasoning", "overall"])).optional().describe("Suggested types for the next assessment."),
  nextAssessmentNeeded: z.boolean().describe("Whether further assessment is needed."),
}).strict();

export const metacognitiveMonitoringOutputSchema = z.object({
  status: z.string().describe("Status of the monitoring process."),
  report: z.string().describe("Monitoring report."),
  overallConfidence: z.number().min(0).max(1).describe("Updated overall confidence."),
  uncertaintyAreas: z.array(z.string()).describe("Updated areas of uncertainty."),
  nextAssessmentNeeded: z.boolean().describe("Whether further assessment is needed."),
}).strict();

export const metacognitiveMonitoringTool = createTool({
  id: "metacognitive-monitoring-native",
  description: "A native tool for systematic self-monitoring of knowledge and reasoning quality.",
  inputSchema: metacognitiveMonitoringInputSchema,
  outputSchema: metacognitiveMonitoringOutputSchema,
  execute: async ({ context }: { context: z.infer<typeof metacognitiveMonitoringInputSchema> }) => {
    const { task, stage, knowledgeAssessment, claims, overallConfidence, uncertaintyAreas, nextAssessmentNeeded } = context;
    try {
      logger.info(`Executing metacognitiveMonitoringTool natively for task: ${task}`, { task, stage });
      // Validate required fields
      if (!task || !stage) {
        throw new Error("Both 'task' and 'stage' are required fields.");
      }
      let report = `Monitoring task "${task}" at stage "${stage}".`;
      let updatedOverallConfidence = overallConfidence;
      const updatedUncertaintyAreas = [...uncertaintyAreas];
      let nextAssessmentNeededFlag = nextAssessmentNeeded;

      // Assess knowledge confidence
      if (knowledgeAssessment && knowledgeAssessment.confidenceScore < 0.7) {
        report += ` Identified low confidence in knowledge domain: ${knowledgeAssessment.domain}.`;
        updatedUncertaintyAreas.push(`Knowledge gap in ${knowledgeAssessment.domain}`);
        updatedOverallConfidence = Math.min(updatedOverallConfidence, knowledgeAssessment.confidenceScore);
        nextAssessmentNeededFlag = true;
      }

      // Assess claim confidence
      if (claims) {
        const uncertainClaims = claims.filter(c => c.status === "uncertain" || c.confidenceScore < 0.5);
        if (uncertainClaims.length > 0) {
          report += ` Found ${uncertainClaims.length} uncertain claims.`;
          updatedUncertaintyAreas.push(...uncertainClaims.map(c => `Uncertain claim: ${c.claim}`));
          updatedOverallConfidence = Math.min(updatedOverallConfidence, ...uncertainClaims.map(c => c.confidenceScore));
          nextAssessmentNeededFlag = true;
        }
      }

      const result = {
        status: "monitoring-active",
        report,
        overallConfidence: updatedOverallConfidence,
        uncertaintyAreas: updatedUncertaintyAreas,
        nextAssessmentNeeded: nextAssessmentNeededFlag,
      };

      logger.info('Metacognitive monitoring completed successfully', result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Metacognitive monitoring failed', { error: errorMessage });
      throw new Error(`Metacognitive monitoring failed: ${errorMessage}`);
    }
  },
});

// --- scientificmethod ---
export const scientificMethodInputSchema = z.object({
  stage: z.enum(["observation", "question", "hypothesis", "experiment", "analysis", "conclusion", "iteration"]).describe("Current stage of the scientific process."),
  observation: z.string().optional().describe("Detailed observation."),
  question: z.string().optional().describe("Research question."),
  hypothesis: z.object({
    statement: z.string(),
    variables: z.array(z.object({ name: z.string(), type: z.enum(["independent", "dependent", "controlled", "confounding"]), operationalization: z.string().optional() })),
    assumptions: z.array(z.string()),
    hypothesisId: z.string(),
    confidence: z.number().min(0).max(1),
    domain: z.string(),
    iteration: z.number().int().min(0),
    alternativeTo: z.array(z.string()).optional(),
    refinementOf: z.string().optional(),
    status: z.enum(["proposed", "testing", "supported", "refuted", "refined"]),
  }).optional().describe("Hypothesis details."),
  experiment: z.object({
    design: z.string(),
    methodology: z.string(),
    predictions: z.array(z.object({ if: z.string(), then: z.string(), else: z.string().optional() })),
    experimentId: z.string(),
    hypothesisId: z.string(),
    controlMeasures: z.array(z.string()),
    results: z.string().optional(),
    outcomeMatched: z.boolean().optional(),
    unexpectedObservations: z.array(z.string()).optional(),
    limitations: z.array(z.string()).optional(),
    nextSteps: z.array(z.string()).optional(),
  }).optional().describe("Experiment details."),
  analysis: z.string().optional().describe("Analysis of experiment results."),
  conclusion: z.string().optional().describe("Conclusion from the scientific inquiry."),
  inquiryId: z.string().describe("Unique identifier for this scientific inquiry."),
  iteration: z.number().int().min(0).describe("Current iteration of the scientific process."),
  nextStageNeeded: z.boolean().describe("Whether another stage is needed in the process."),
}).strict();

export const scientificMethodOutputSchema = z.object({
  status: z.string().describe("Status of the scientific inquiry."),
  report: z.string().describe("Report on the current stage."),
  nextStage: z.string().optional().describe("Suggested next stage."),
  conclusion: z.string().optional().describe("Final conclusion if inquiry is complete."),
}).strict();

export const scientificMethodTool = createTool({
  id: "scientific-method-native",
  description: "A native tool for applying formal scientific reasoning to questions and problems.",
  inputSchema: scientificMethodInputSchema,
  outputSchema: scientificMethodOutputSchema,
  execute: async ({ context }: { context: z.infer<typeof scientificMethodInputSchema> }) => {
    const { stage, observation, question, hypothesis, experiment, analysis, conclusion, inquiryId, nextStageNeeded } = context;
    try {
      logger.info(`Executing scientificMethodTool natively at stage: ${stage}`, { stage, inquiryId });

      let report = `Scientific inquiry "${inquiryId}" at stage "${stage}".`;
      let nextStage = nextStageNeeded ? "analysis" : undefined;
      let finalConclusion: string | undefined;
      let status = "in-progress";

      switch (stage) {
        case "observation":
          report += ` Observed: "${observation}".`;
          nextStage = "question";
          break;
        case "question":
          report += ` Question: "${question}".`;
          nextStage = "hypothesis";
          break;
        case "hypothesis":
          report += ` Hypothesis: "${hypothesis?.statement}".`;
          if (hypothesis?.confidence) {
            report += ` Confidence: ${hypothesis.confidence}.`;
          }
          nextStage = "experiment";
          break;
        case "experiment":
          report += ` Experiment design: "${experiment?.design}".`;
          if (experiment?.results) {
            report += ` Results: "${experiment.results}".`;
            nextStage = "analysis";
          } else {
            report += " Awaiting experiment results.";
            nextStage = "experiment";
          }
          break;
        case "analysis":
          report += ` Analysis: "${analysis}".`;
          if (experiment?.outcomeMatched) {
            report += " Outcome matched prediction.";
            nextStage = "conclusion";
          } else {
            report += " Outcome did not match prediction. Re-evaluating.";
            nextStage = "hypothesis";
          }
          break;
        case "conclusion":
          finalConclusion = conclusion || "Inquiry concluded.";
          report += ` Conclusion: "${finalConclusion}".`;
          status = "completed";
          nextStage = undefined;
          break;
        case "iteration":
          report += ` Iterating on inquiry.`;
          nextStage = "observation";
          break;
      }

      const result = {
        status,
        report,
        nextStage,
        conclusion: finalConclusion,
      };

      logger.info('Scientific method completed successfully', result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Scientific method failed', { error: errorMessage });
      throw new Error(`Scientific method failed: ${errorMessage}`);
    }
  },
});

// --- structuredargumentation ---
export const structuredArgumentationInputSchema = z.object({
  claim: z.string().describe("The main claim or thesis of the argument."),
  premises: z.array(z.string()).describe("Supporting premises for the claim."),
  conclusion: z.string().describe("The conclusion derived from the premises."),
  argumentId: z.string().optional().describe("Optional unique identifier for this argument."),
  argumentType: z.enum(["thesis", "antithesis", "synthesis", "objection", "rebuttal"]).describe("Type of argument."),
  confidence: z.number().min(0).max(1).describe("Confidence level in this argument (0.0-1.0)."),
  respondsTo: z.string().optional().describe("ID of the argument this directly responds to."),
  supports: z.array(z.string()).optional().describe("IDs of arguments this supports."),
  contradicts: z.array(z.string()).optional().describe("IDs of arguments this contradicts."),
  strengths: z.array(z.string()).optional().describe("Notable strong points of the argument."),
  weaknesses: z.array(z.string()).optional().describe("Notable weak points of the argument."),
  nextArgumentNeeded: z.boolean().describe("Whether another argument is needed in the dialectic."),
  suggestedNextTypes: z.array(z.enum(["thesis", "antithesis", "synthesis", "objection", "rebuttal"])).optional().describe("Suggested types for the next argument."),
}).strict();

export const structuredArgumentationOutputSchema = z.object({
  status: z.string().describe("Status of the argumentation process."),
  analysis: z.string().describe("Analysis of the argument."),
  argumentId: z.string().describe("ID of the processed argument."),
  nextArgumentNeeded: z.boolean().describe("Whether another argument is needed."),
  suggestedNextTypes: z.array(z.string()).optional().describe("Suggested types for the next argument."),
}).strict();

export const structuredArgumentationTool = createTool({
  id: "structured-argumentation-native",
  description: "A native tool for systematic dialectical reasoning and argument analysis.",
  inputSchema: structuredArgumentationInputSchema,
  outputSchema: structuredArgumentationOutputSchema,
  execute: async ({ context }: { context: z.infer<typeof structuredArgumentationInputSchema> }) => {
    const { claim, premises, conclusion, argumentType, confidence, nextArgumentNeeded, argumentId, suggestedNextTypes } = context;
    try {
      logger.info(`Executing structuredArgumentationTool natively for claim: ${claim}`, { claim, argumentType });

      const analysis = `Argument type: ${argumentType}. Claim: "${claim}". Premises: ${premises.join(', ')}. Conclusion: "${conclusion}". Confidence: ${confidence}.`;
      let updatedSuggestedNextTypes = suggestedNextTypes;

      // Suggest next argument types based on current type
      if (argumentType === "thesis" && nextArgumentNeeded) {
        updatedSuggestedNextTypes = ["antithesis", "objection"];
      } else if (argumentType === "antithesis" && nextArgumentNeeded) {
        updatedSuggestedNextTypes = ["rebuttal", "synthesis"];
      } else if (argumentType === "objection" && nextArgumentNeeded) {
        updatedSuggestedNextTypes = ["rebuttal"];
      } else if (argumentType === "rebuttal" && nextArgumentNeeded) {
        updatedSuggestedNextTypes = ["synthesis"];
      }

      const result = {
        status: "analyzed",
        analysis,
        argumentId: argumentId || `arg-${Date.now()}`,
        nextArgumentNeeded,
        suggestedNextTypes: updatedSuggestedNextTypes,
      };

      logger.info('Structured argumentation completed successfully', result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Structured argumentation failed', { error: errorMessage });
      throw new Error(`Structured argumentation failed: ${errorMessage}`);
    }
  },
});

// --- visualreasoning ---
export const visualReasoningInputSchema = z.object({
  operation: z.enum(["create", "update", "delete", "transform", "observe"]).describe("The visual operation to perform."),
  elements: z.array(z.object({
    id: z.string(),
    type: z.enum(["node", "edge", "container", "annotation"]),
    label: z.string().optional(),
    properties: z.record(z.any()),
    source: z.string().optional(),
    target: z.string().optional(),
    contains: z.array(z.string()).optional(),
  })).describe("Elements to operate on."),
  transformationType: z.enum(["rotate", "move", "resize", "recolor", "regroup"]).optional().describe("Type of transformation for 'transform' operation."),
  diagramId: z.string().describe("Unique identifier for the diagram."),
  diagramType: z.enum(["graph", "flowchart", "stateDiagram", "conceptMap", "treeDiagram", "custom"]).describe("Type of diagram."),
  iteration: z.number().int().min(0).describe("Current iteration of visual reasoning."),
  observation: z.string().optional().describe("Observation from visual analysis."),
  insight: z.string().optional().describe("Insight derived from visual analysis."),
  hypothesis: z.string().optional().describe("Hypothesis related to visual data."),
  nextOperationNeeded: z.boolean().describe("Whether another visual operation is needed."),
}).strict();

export const visualReasoningOutputSchema = z.object({
  status: z.string().describe("Status of the visual reasoning operation."),
  report: z.string().describe("Report on the visual operation."),
  diagramId: z.string().describe("ID of the diagram operated on."),
  insight: z.string().optional().describe("Key insight from the operation."),
  nextOperationNeeded: z.boolean().describe("Whether another visual operation is needed."),
}).strict();

export const visualReasoningTool = createTool({
  id: "visual-reasoning-native",
  description: "A native tool for visual thinking, problem-solving, and communication.",
  inputSchema: visualReasoningInputSchema,
  outputSchema: visualReasoningOutputSchema,
  execute: async ({ context }: { context: z.infer<typeof visualReasoningInputSchema> }) => {
    const { operation, diagramId, diagramType, observation, transformationType, elements, insight: insightParam, nextOperationNeeded: nextOpFlag } = context;
    let insight = insightParam;
    let nextOperationNeeded = nextOpFlag;
    try {
      logger.info(`Executing visualReasoningTool natively for diagram: ${diagramId}, operation: ${operation}`, { diagramId, operation });

      let report = `Performed "${operation}" on diagram "${diagramId}" (Type: ${diagramType}).`;

      // Process different operations
      if (operation === "observe" && observation) {
        report += ` Observed: "${observation}".`;
        insight = insight || "New observation made from visual analysis.";
        nextOperationNeeded = true;
      } else if (operation === "transform" && transformationType) {
        report += ` Applied ${transformationType} transformation.`;
        insight = insight || `Visual transformation (${transformationType}) completed.`;
      } else if (operation === "create" && elements) {
        report += ` Created ${elements.length} elements.`;
        insight = insight || `New visual elements created for ${diagramType}.`;
      } else if (operation === "update" && elements) {
        report += ` Updated ${elements.length} elements.`;
        insight = insight || `Visual elements updated in ${diagramType}.`;
      } else if (operation === "delete" && elements) {
        report += ` Deleted ${elements.length} elements.`;
        insight = insight || `Visual elements removed from ${diagramType}.`;
      }

      const result = {
        status: "processed",
        report,
        diagramId,
        insight,
        nextOperationNeeded,
      };

      logger.info('Visual reasoning completed successfully', result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Visual reasoning failed', { error: errorMessage });
      throw new Error(`Visual reasoning failed: ${errorMessage}`);
    }
  },
});