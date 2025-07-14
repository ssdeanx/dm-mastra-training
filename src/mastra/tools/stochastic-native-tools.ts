/* eslint-disable @typescript-eslint/no-explicit-any */
import { createTool, ToolExecutionContext } from "@mastra/core/tools";
import { z } from "zod";
import { PinoLogger } from "@mastra/loggers";

const logger = new PinoLogger({ name: 'StochasticNativeTools', level: 'info' });


/**
 * Multi-Armed Bandit implementation using epsilon-greedy strategy
 */
function runMultiArmedBandit(params: Record<string, any>) {
  const numArms = Math.max(2, Number(params.num_arms) || 2);
  const epsilon = Math.max(0, Math.min(1, Number(params.epsilon) || 0.1));
  const numIterations = Math.max(1, Number(params.num_iterations) || 100);
  const trueSuccessRates = Array.isArray(params.true_success_rates) 
    ? params.true_success_rates.slice(0, numArms)
    : Array.from({length: numArms}, () => Math.random());
  
  const armCounts = new Array(numArms).fill(0);
  const armRewards = new Array(numArms).fill(0);
  const armAverages = new Array(numArms).fill(0);
  
  let totalReward = 0;
  
  for (let i = 0; i < numIterations; i++) {
    let selectedArm: number;
    
    // Epsilon-greedy selection
    if (Math.random() < epsilon) {
      // Explore: random arm
      selectedArm = Math.floor(Math.random() * numArms);
    } else {
      // Exploit: best arm so far
      selectedArm = armAverages.indexOf(Math.max(...armAverages));
    }
    
    // Simulate reward (Bernoulli trial)
    const reward = Math.random() < trueSuccessRates[selectedArm] ? 1 : 0;
    
    // Update statistics
    armCounts[selectedArm]++;
    armRewards[selectedArm] += reward;
    armAverages[selectedArm] = armRewards[selectedArm] / armCounts[selectedArm];
    totalReward += reward;
  }
  
  const bestArm = armAverages.indexOf(Math.max(...armAverages));
  const agentOptions = Array.isArray(params.agent_options) 
    ? params.agent_options 
    : Array.from({length: numArms}, (_, i) => `Option ${i+1}`);
  
  return {
    bestArm,
    armCounts,
    armRewards,
    armAverages,
    totalReward,
    agentOptions,
    trueSuccessRates
  };
}

/**
 * MDP Value Iteration implementation
 */
function runMDP(params: Record<string, any>) {
  const numStates = Math.max(2, Number(params.num_states) || 4);
  const numActions = Math.max(2, Number(params.num_actions) || 2);
  const gamma = Math.max(0, Math.min(1, Number(params.discount_factor) || 0.9));
  const threshold = Math.max(0.001, Number(params.convergence_threshold) || 0.01);
  const maxIterations = Math.max(1, Number(params.max_iterations) || 100);
  
  // Initialize random transition probabilities and rewards
  const transitions = Array.from({length: numStates}, () => 
    Array.from({length: numActions}, () => 
      Array.from({length: numStates}, () => Math.random()).map(p => p / numStates)
    )
  );
  
  const rewards = Array.from({length: numStates}, () => 
    Array.from({length: numActions}, () => Math.random() * 10 - 5)
  );
  
  let values = new Array(numStates).fill(0);
  const policy = new Array(numStates).fill(0);
  let iterations = 0;
  let converged = false;
  
  // Value iteration
  for (iterations = 0; iterations < maxIterations; iterations++) {
    const newValues = [...values];
    let maxDelta = 0;
    
    for (let s = 0; s < numStates; s++) {
      let maxValue = -Infinity;
      let bestAction = 0;
      
      for (let a = 0; a < numActions; a++) {
        let actionValue = rewards[s][a];
        for (let nextS = 0; nextS < numStates; nextS++) {
          actionValue += gamma * transitions[s][a][nextS] * values[nextS];
        }
        
        if (actionValue > maxValue) {
          maxValue = actionValue;
          bestAction = a;
        }
      }
      
      newValues[s] = maxValue;
      policy[s] = bestAction;
      maxDelta = Math.max(maxDelta, Math.abs(newValues[s] - values[s]));
    }
    
    values = newValues;
    
    if (maxDelta < threshold) {
      converged = true;
      break;
    }
  }
  
  return { values, policy, iterations: iterations + 1, converged };
}

/**
 * MCTS implementation with UCB1 selection
 */
function runMCTS(params: Record<string, any>) {
  const numSimulations = Math.max(1, Number(params.num_simulations) || 1000);
  const explorationConstant = Math.max(0, Number(params.exploration_constant) || 1.4);
  const numActions = Math.max(2, Number(params.num_actions) || 4);
  
  const actionCounts = new Array(numActions).fill(0);
  const actionValues = new Array(numActions).fill(0);
  
  for (let sim = 0; sim < numSimulations; sim++) {
    // UCB1 selection
    let selectedAction = 0;
    let maxUCB = -Infinity;
    
    for (let a = 0; a < numActions; a++) {
      let ucbValue: number;
      
      if (actionCounts[a] === 0) {
        ucbValue = Infinity; // Explore unvisited actions first
      } else {
        const exploitation = actionValues[a] / actionCounts[a];
        const exploration = explorationConstant * Math.sqrt(Math.log(sim + 1) / actionCounts[a]);
        ucbValue = exploitation + exploration;
      }
      
      if (ucbValue > maxUCB) {
        maxUCB = ucbValue;
        selectedAction = a;
      }
    }
    
    // Simulate reward (random for this example)
    const reward = Math.random() * (selectedAction + 1); // Higher actions get slightly better rewards
    
    // Update statistics
    actionCounts[selectedAction]++;
    actionValues[selectedAction] += reward;
  }
  
  const bestAction = actionValues.map((v, i) => v / Math.max(1, actionCounts[i]))
    .indexOf(Math.max(...actionValues.map((v, i) => v / Math.max(1, actionCounts[i]))));
  
  return {
    bestAction,
    actionValues: actionValues.map((v, i) => v / Math.max(1, actionCounts[i])),
    actionCounts,
    numSimulations
  };
}

/**
 * Bayesian Optimization with Gaussian Process approximation
 */
function runBayesianOptimization(params: Record<string, any>) {
  const numSamples = Math.max(1, Number(params.num_samples) || 100);
  const dimensions = Math.max(1, Number(params.dimensions) || 2);
  const acquisitionSamples = Math.max(10, Number(params.acquisition_samples) || 50);
  
  const observedPoints: number[][] = [];
  const observedValues: number[] = [];
  
  // Generate initial random samples
  for (let i = 0; i < Math.min(10, numSamples); i++) {
    const point = Array.from({length: dimensions}, () => Math.random() * 2 - 1);
    const value = evaluateFunction(point); // Objective function
    observedPoints.push(point);
    observedValues.push(value);
  }
  
  // Bayesian optimization loop
  for (let i = 10; i < numSamples; i++) {
    // Find next point using acquisition function (simplified)
    let bestPoint: number[] = [];
    let bestAcquisition = -Infinity;
    
    for (let j = 0; j < acquisitionSamples; j++) {
      const candidatePoint = Array.from({length: dimensions}, () => Math.random() * 2 - 1);
      const acquisition = computeAcquisition(candidatePoint, observedPoints, observedValues);
      
      if (acquisition > bestAcquisition) {
        bestAcquisition = acquisition;
        bestPoint = candidatePoint;
      }
    }
    
    // Evaluate the objective function at the selected point
    const value = evaluateFunction(bestPoint);
    observedPoints.push(bestPoint);
    observedValues.push(value);
  }
  
  // Find best observed point
  const bestIndex = observedValues.indexOf(Math.max(...observedValues));
  const bestPoint = observedPoints[bestIndex];
  const bestValue = observedValues[bestIndex];
  
  return {
    bestPoint,
    bestValue,
    numSamples: observedPoints.length,
    mean: observedValues.reduce((a, b) => a + b) / observedValues.length,
    confidenceInterval: [
      Math.min(...observedValues),
      Math.max(...observedValues)
    ]
  };
}

/**
 * Simple objective function for Bayesian optimization
 */
function evaluateFunction(point: number[]): number {
  // Example: minimize sum of squares with some noise
  return -(point.reduce((sum, x) => sum + x * x, 0)) + Math.random() * 0.1;
}

/**
 * Simplified acquisition function (Upper Confidence Bound)
 */
function computeAcquisition(point: number[], observedPoints: number[][], observedValues: number[]): number {
  if (observedPoints.length === 0) return Math.random();
  
  // Simple distance-based uncertainty estimate
  const distances = observedPoints.map(obs => 
    Math.sqrt(point.reduce((sum, x, i) => sum + Math.pow(x - obs[i], 2), 0))
  );
  const minDistance = Math.min(...distances);
  const uncertainty = Math.exp(-minDistance * 2); // Higher uncertainty for distant points
  
  // Predicted mean (simple weighted average)
  const weights = distances.map(d => Math.exp(-d * 2));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const predictedMean = totalWeight > 0 
    ? observedValues.reduce((sum, val, i) => sum + val * weights[i], 0) / totalWeight
    : 0;
  
  return predictedMean + 2 * uncertainty; // UCB acquisition
}

/**
 * HMM Forward-Backward algorithm implementation
 */
function runHMM(params: Record<string, any>) {
  const numStates = Math.max(2, Number(params.num_states) || 3);
  const numObservations = Math.max(1, Number(params.num_observations) || 10);
  const numSymbols = Math.max(2, Number(params.num_symbols) || 2);
  
  // Initialize random HMM parameters
  const initialProbs = Array.from({length: numStates}, () => Math.random());
  const normalizeInitial = initialProbs.reduce((sum, p) => sum + p, 0);
  initialProbs.forEach((_, i) => initialProbs[i] /= normalizeInitial);
  
  const transitionProbs = Array.from({length: numStates}, () => {
    const row = Array.from({length: numStates}, () => Math.random());
    const sum = row.reduce((s, p) => s + p, 0);
    return row.map(p => p / sum);
  });
  
  const emissionProbs = Array.from({length: numStates}, () => {
    const row = Array.from({length: numSymbols}, () => Math.random());
    const sum = row.reduce((s, p) => s + p, 0);
    return row.map(p => p / sum);
  });
  
  // Generate random observation sequence
  const observations = Array.from({length: numObservations}, () => 
    Math.floor(Math.random() * numSymbols)
  );
  
  // Forward algorithm
  const forward = Array.from({length: numObservations}, () => new Array(numStates).fill(0));
  
  // Initialize forward probabilities
  for (let s = 0; s < numStates; s++) {
    forward[0][s] = initialProbs[s] * emissionProbs[s][observations[0]];
  }
  
  // Forward pass
  for (let t = 1; t < numObservations; t++) {
    for (let s = 0; s < numStates; s++) {
      forward[t][s] = 0;
      for (let prevS = 0; prevS < numStates; prevS++) {
        forward[t][s] += forward[t-1][prevS] * transitionProbs[prevS][s];
      }
      forward[t][s] *= emissionProbs[s][observations[t]];
    }
  }
  
  // Viterbi algorithm for most likely sequence
  const viterbi = Array.from({length: numObservations}, () => new Array(numStates).fill(0));
  const path = Array.from({length: numObservations}, () => new Array(numStates).fill(0));
  
  // Initialize Viterbi
  for (let s = 0; s < numStates; s++) {
    viterbi[0][s] = initialProbs[s] * emissionProbs[s][observations[0]];
  }
  
  // Viterbi forward pass
  for (let t = 1; t < numObservations; t++) {
    for (let s = 0; s < numStates; s++) {
      let maxProb = -Infinity;
      let maxState = 0;
      
      for (let prevS = 0; prevS < numStates; prevS++) {
        const prob = viterbi[t-1][prevS] * transitionProbs[prevS][s];
        if (prob > maxProb) {
          maxProb = prob;
          maxState = prevS;
        }
      }
      
      viterbi[t][s] = maxProb * emissionProbs[s][observations[t]];
      path[t][s] = maxState;
    }
  }
  
  // Backtrack to find most likely sequence
  const mostLikelySequence = new Array(numObservations);
  let maxFinalProb = -Infinity;
  let maxFinalState = 0;
  
  for (let s = 0; s < numStates; s++) {
    if (viterbi[numObservations - 1][s] > maxFinalProb) {
      maxFinalProb = viterbi[numObservations - 1][s];
      maxFinalState = s;
    }
  }
  
  mostLikelySequence[numObservations - 1] = maxFinalState;
  for (let t = numObservations - 2; t >= 0; t--) {
    mostLikelySequence[t] = path[t + 1][mostLikelySequence[t + 1]];
  }
  
  // Calculate observation likelihood
  const totalLikelihood = forward[numObservations - 1].reduce((sum, p) => sum + p, 0);
  
  return {
    mostLikelySequence,
    observationLikelihood: totalLikelihood,
    forwardProbabilities: forward[numObservations - 1],
    numStates,
    observations
  };
}

// --- stochasticalgorithm ---
export const stochasticAlgorithmInputSchema = z.object({
  algorithm: z.enum(["mdp", "mcts", "bandit", "bayesian", "hmm"]).describe("The stochastic algorithm to apply."),
  problem: z.string().describe("The problem to solve using the algorithm."),
  parameters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.number())])).describe("Parameters specific to the algorithm."),
  result: z.string().optional().describe("Result of the algorithm application."),
}).strict();

export const stochasticAlgorithmOutputSchema = z.object({
  status: z.string().describe("Status of the algorithm execution."),
  summary: z.string().describe("Summary of the algorithm's outcome."),
  algorithmUsed: z.string().describe("The stochastic algorithm that was applied."),
  details: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.number())])).optional().describe("Detailed results of the algorithm."),
}).strict();

export const stochasticAlgorithmTool = createTool({
  id: "stochastic-algorithm-native",
  description: "A native tool for applying stochastic algorithms to decision-making problems.",
  inputSchema: stochasticAlgorithmInputSchema,
  outputSchema: stochasticAlgorithmOutputSchema,
  execute: async ({ context }: ToolExecutionContext<typeof stochasticAlgorithmInputSchema>) => {
    const startTime = Date.now();
    const { algorithm, problem, parameters } = context;
    
    try {
      logger.info(`Executing stochasticAlgorithmTool natively with algorithm: ${algorithm}`, { algorithm, problem });
      
      let summary: string;
      const details: Record<string, string | number | boolean | number[]> = {};

      switch (algorithm) {
        case "bandit": {
          const result = runMultiArmedBandit(parameters);
          summary = `Multi-Armed Bandit with ${result.armCounts.length} arms completed. Best arm: ${result.agentOptions[result.bestArm]} (avg reward: ${result.armAverages[result.bestArm].toFixed(3)}). Total reward: ${result.totalReward}.`;
          details.simulated_optimal_arm = result.agentOptions[result.bestArm];
          details.simulated_max_reward = result.armAverages[result.bestArm];
          details.epsilon = Number(parameters.epsilon) || 0.1;
          details.iterations = Number(parameters.num_iterations) || 100;
          details.arm_counts = result.armCounts;
          details.arm_rewards = result.armAverages;
          break;
        }
        
        case "mdp": {
          const result = runMDP(parameters);
          summary = `MDP Value Iteration completed in ${result.iterations} iterations. Convergence: ${result.converged ? 'achieved' : 'not achieved'}.`;
          details.policy_iterations = result.iterations;
          details.convergence_threshold = Number(parameters.convergence_threshold) || 0.01;
          details.convergence_achieved = result.converged;
          details.final_policy = result.policy;
          details.state_values = result.values;
          break;
        }
        
        case "mcts": {
          const result = runMCTS(parameters);
          summary = `MCTS completed ${result.numSimulations} simulations. Best action: ${result.bestAction} (value: ${result.actionValues[result.bestAction].toFixed(3)}).`;
          details.simulations_run = result.numSimulations;
          details.exploration_constant = Number(parameters.exploration_constant) || 1.4;
          details.best_action = result.bestAction;
          details.action_values = result.actionValues;
          break;
        }
        
        case "bayesian": {
          const result = runBayesianOptimization(parameters);
          summary = `Bayesian Optimization completed with ${result.numSamples} samples. Best value: ${result.bestValue.toFixed(3)} at point [${result.bestPoint.map(x => x.toFixed(3)).join(', ')}].`;
          details.posterior_samples = result.numSamples;
          details.confidence_interval = result.confidenceInterval;
          details.best_point = result.bestPoint;
          details.acquisition_values = [result.bestValue];
          break;
        }
        
        case "hmm": {
          const result = runHMM(parameters);
          summary = `HMM analysis completed. Most likely state sequence: [${result.mostLikelySequence.join(', ')}]. Observation likelihood: ${result.observationLikelihood.toExponential(3)}.`;
          details.hidden_states = result.numStates;
          details.observation_likelihood = result.observationLikelihood;
          details.most_likely_sequence = result.mostLikelySequence;
          details.forward_probabilities = result.forwardProbabilities;
          break;
        }
        default:
          throw new Error(`Unsupported algorithm: ${algorithm}`);
      }

      const executionTime = Date.now() - startTime;
      details.execution_time_ms = executionTime;

      logger.info(`Algorithm ${algorithm} completed in ${executionTime}ms`);

      return {
        status: "completed",
        summary,
        algorithmUsed: algorithm,
        details,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Algorithm ${algorithm} failed after ${executionTime}ms: ${errorMessage}`);
      return {
        status: "error",
        summary: `Algorithm ${algorithm} failed: ${errorMessage}`,
        algorithmUsed: algorithm,
        details: {
          execution_time_ms: executionTime,
          error: errorMessage,
        },
      };
    }
  },
});