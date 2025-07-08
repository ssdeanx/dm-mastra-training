import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { masterAgent, supervisorAgent, analyzerAgent, dataAgent } from '../agents';
import { PinoLogger } from '@mastra/loggers';
import { RuntimeContext } from '@mastra/core/runtime-context';
import { analyzerAgentOutputSchema } from '../agents/analyzer-agent';
import { masterAgentOutputSchema } from '../agents/master-agent';
import { supervisorAgentOutputSchema } from '../agents/supervisor-agent';
import { dataAgentOutputSchema } from '../agents/data-agent';

const logger = new PinoLogger({ name: 'AgentPerformanceWorkflow', level: 'info' });

// Input schema for the agent performance monitoring workflow
const agentPerformanceInputSchema = z.object({
  agentName: z.string().describe('The name of the agent to monitor.'),
  monitoringPeriod: z.string().optional().describe('Time period for monitoring (e.g., "last 24 hours", "last week").'),
  metrics: z.array(z.string()).optional().describe('Specific performance metrics to focus on (e.g., "accuracy", "latency", "tool_usage").'),
  // This field is for external systems to provide actual structured performance data
  performanceData: z.object({
    accuracy: z.number().min(0).max(1).optional(),
    latency_ms: z.number().int().positive().optional(),
    tool_usage_count: z.number().int().positive().optional(),
    errors_per_1000_requests: z.number().int().min(0).optional(),
    // Add other relevant metrics here
  }).optional().describe('Actual structured performance data for the agent.'),
}).refine(data => data.performanceData, {
  message: "Actual 'performanceData' must be provided for this workflow to execute. This workflow does not simulate data.",
});

// Output schema for the agent performance monitoring workflow
const agentPerformanceOutputSchema = z.object({
  monitoredAgent: z.string().describe('The name of the agent that was monitored.'),
  monitoringSummary: z.string().describe('A summary of the agent\'s performance during the period.'),
  performanceInsights: z.array(z.string()).describe('Key insights into the agent\'s performance.'),
  optimizationRecommendations: z.array(z.string()).describe('Actionable recommendations for optimizing the agent.'),
  detailedReportFile: z.string().optional().describe('Filename where the detailed performance report is stored.'),
});

/**
 * Step 1: Gather Agent Performance Data
 * This step is a placeholder for integrating with actual monitoring systems.
 * It expects structured performance data as input.
 */
const gatherPerformanceDataStep = createStep({
  id: 'gather-performance-data',
  description: 'Gathers structured performance data for the specified agent from monitoring systems.',
  inputSchema: agentPerformanceInputSchema,
  outputSchema: z.object({
    agentName: z.string(),
    monitoringPeriod: z.string().optional(),
    performanceData: z.object({
      accuracy: z.number().min(0).max(1).optional(),
      latency_ms: z.number().int().positive().optional(),
      tool_usage_count: z.number().int().positive().optional(),
      errors_per_1000_requests: z.number().int().min(0).optional(),
    }),
  }),
  execute: async ({ inputData }) => {
    logger.info(`Gathering performance data for agent: ${inputData.agentName}`);

    if (!inputData.performanceData) {
      const errorMessage = `No structured 'performanceData' provided. This step requires integration with a real monitoring system for agent: ${inputData.agentName}.`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    // In a real scenario, this would involve calling an external monitoring API
    // or querying a database to fetch the actual performance data.
    // For now, we simply pass through the provided structured data.
    return {
      agentName: inputData.agentName,
      monitoringPeriod: inputData.monitoringPeriod,
      performanceData: inputData.performanceData,
    };
  },
});

/**
 * Step 2: Analyze Performance Data using Analyzer Agent
 */
const analyzePerformanceDataStep = createStep({
  id: 'analyze-performance-data',
  description: 'Analyzes the structured performance data using the Analyzer Agent.',
  inputSchema: z.object({
    agentName: z.string(),
    monitoringPeriod: z.string().optional(),
    performanceData: z.object({
      accuracy: z.number().min(0).max(1).optional(),
      latency_ms: z.number().int().positive().optional(),
      tool_usage_count: z.number().int().positive().optional(),
      errors_per_1000_requests: z.number().int().min(0).optional(),
    }),
  }),
  outputSchema: analyzerAgentOutputSchema, // Use structured output schema
  execute: async ({ inputData }) => {
    logger.info(`Analyzing performance data for agent: ${inputData.agentName}`);
    const analyzerRuntimeContext = new RuntimeContext();
    analyzerRuntimeContext.set("analysis-type", "diagnostic");
    analyzerRuntimeContext.set("data-source", "internal"); // Data is now internal to the workflow

    const { object: analysisResultObject } = await analyzerAgent.generate(
      `Analyze the following raw performance data for agent "${inputData.agentName}" for the period "${inputData.monitoringPeriod || 'N/A'}". Provide a diagnostic analysis under the key 'analysis', identify any anomalies or trends, and extract key performance insights as a JSON array of strings under the key 'keyInsights'.\n\nPerformance Data:\n${JSON.stringify(inputData.performanceData, null, 2)}\n\nReturn a JSON object with 'analysis' and 'keyInsights'.`,
      { runtimeContext: analyzerRuntimeContext, output: analyzerAgentOutputSchema }
    );
    return {
      analysis: analysisResultObject.analysis,
      visualizations: analysisResultObject.visualizations,
      recommendations: analysisResultObject.recommendations,
      toolsUsed: analysisResultObject.toolsUsed,
      requestId: analysisResultObject.requestId,
      timestamp: analysisResultObject.timestamp,
    };
  },
});

/**
 * Step 3: Generate Optimization Recommendations using Master Agent
 */
const generateRecommendationsStep = createStep({
  id: 'generate-optimization-recommendations',
  description: 'Generates optimization recommendations using the Master Agent.',
  inputSchema: z.object({
    agentName: z.string(),
    analysisReport: z.string(),
    performanceInsights: z.array(z.string()),
  }),
  outputSchema: masterAgentOutputSchema, // Use structured output schema
  execute: async ({ inputData }) => {
    logger.info(`Generating optimization recommendations for agent: ${inputData.agentName}`);
    const masterRuntimeContext = new RuntimeContext();
    masterRuntimeContext.set("project-context", "agent-optimization");
    masterRuntimeContext.set("plan-mode", true); // Master agent can plan its optimization strategies

    const { object: recommendationsResultObject } = await masterAgent.generate(
      `Based on the following performance analysis and insights for agent "${inputData.agentName}", provide actionable recommendations for optimization. Focus on improving efficiency, accuracy, and resource utilization. List recommendations as a JSON array of strings under the key 'recommendations'.\n\nAnalysis Report:\n${inputData.analysisReport}\n\nPerformance Insights:\n${inputData.performanceInsights.join('\n')}\n\nReturn a JSON object with 'recommendations'.`,
      { runtimeContext: masterRuntimeContext, output: masterAgentOutputSchema }
    );
    return {
      response: recommendationsResultObject.response,
      actions: recommendationsResultObject.actions,
      toolsUsed: recommendationsResultObject.toolsUsed,
      requestId: recommendationsResultObject.requestId,
      timestamp: recommendationsResultObject.timestamp,
    };
  },
});

/**
 * Step 4: Review and Refine Recommendations using Supervisor Agent
 */
const reviewRecommendationsStep = createStep({
  id: 'review-recommendations',
  description: 'Reviews and refines optimization recommendations using the Supervisor Agent.',
  inputSchema: z.object({
    agentName: z.string(),
    optimizationRecommendations: z.array(z.string()),
  }),
  outputSchema: supervisorAgentOutputSchema, // Use structured output schema
  execute: async ({ inputData }) => {
    logger.info(`Reviewing recommendations for agent: ${inputData.agentName}`);
    const supervisorRuntimeContext = new RuntimeContext();
    supervisorRuntimeContext.set("qa-level", "rigorous");
    supervisorRuntimeContext.set("coordination-strategy", "collaborative");

    const { object: reviewResultObject } = await supervisorAgent.generate(
      `Review the following optimization recommendations for agent "${inputData.agentName}". Provide constructive feedback under the key 'feedback', suggest improvements, and refine the recommendations for clarity and actionability. List the refined recommendations as a JSON array of strings under the key 'refinedRecommendations'.\n\nRecommendations:\n${inputData.optimizationRecommendations.join('\n')}\n\nReturn a JSON object with 'refinedRecommendations' and 'feedback'.`,
      { runtimeContext: supervisorRuntimeContext, output: supervisorAgentOutputSchema }
    );
    return {
      result: reviewResultObject.result,
      delegations: reviewResultObject.delegations,
      quality_score: reviewResultObject.quality_score,
      recommendations: reviewResultObject.recommendations,
    };
  },
});

/**
 * Step 5: Generate and Store Detailed Report using Data Agent
 */
const generateAndStoreReportStep = createStep({
  id: 'generate-and-store-report',
  description: 'Generates a detailed performance report and stores it using the Data Agent.',
  inputSchema: z.object({
    agentName: z.string(),
    monitoringPeriod: z.string().optional(),
    analysisReport: z.string(),
    performanceInsights: z.array(z.string()),
    optimizationRecommendations: z.array(z.string()), // Refined recommendations
    reviewFeedback: z.string(),
  }),
  outputSchema: z.object({ // Define a specific output schema for this step
    fileName: z.string(),
    success: z.boolean(),
  }),
  execute: async ({ inputData }) => {
    const fileName = `agent_performance_report_${inputData.agentName.replace(/\s/g, '_')}_${Date.now()}.md`;
    const dataRuntimeContext = new RuntimeContext();
    dataRuntimeContext.set("mode", "write");
    dataRuntimeContext.set("data-dir", "agent_performance_reports");

    const reportContent = `## Agent Performance Report: ${inputData.agentName}
Monitoring Period: ${inputData.monitoringPeriod || 'N/A'}

### Performance Analysis
${inputData.analysisReport}

### Key Performance Insights
${inputData.performanceInsights.map(insight => `- ${insight}`).join('\n')}

### Optimization Recommendations
${inputData.optimizationRecommendations.map(rec => `- ${rec}`).join('\n')}

### Reviewer Feedback
${inputData.reviewFeedback}
`;

    const { object: resultObject } = await dataAgent.generate(
      `Write the following content to a file named "${fileName}" in the "agent_performance_reports" directory:\n\n${reportContent}\n\nReturn a JSON object with 'success', 'fileName', and 'message'.`,
      { runtimeContext: dataRuntimeContext, output: dataAgentOutputSchema }
    );
    return {
      fileName: fileName, // Return the locally constructed fileName
      success: resultObject.success,
    };
  },
});

/**
 * Agent Performance Monitoring and Optimization Workflow
 * Monitors an agent's performance, analyzes data, generates recommendations, and stores reports.
 */
export const agentPerformanceWorkflow = createWorkflow({
  id: 'agent-performance-workflow',
  description: 'Monitors agent performance, analyzes data, generates optimization recommendations, and stores reports.',
  inputSchema: agentPerformanceInputSchema,
  outputSchema: agentPerformanceOutputSchema,
})
  .then(gatherPerformanceDataStep)
  .map(async ({ getStepResult, getInitData }) => {
    const dataResult = getStepResult(gatherPerformanceDataStep);
    const initialData = await getInitData();
    return {
      agentName: initialData.agentName,
      rawPerformanceData: JSON.stringify(dataResult.performanceData, null, 2), // Pass structured data as string for analysis
      monitoringPeriod: initialData.monitoringPeriod,
    };
  })
  .then(analyzePerformanceDataStep)
  .map(async ({ getStepResult, getInitData }) => {
    const analysisResult = getStepResult(analyzePerformanceDataStep);
    const initialData = await getInitData();
    return {
      agentName: initialData.agentName,
      analysisReport: analysisResult.analysis, // Use .analysis
      performanceInsights: analysisResult.recommendations, // Use .recommendations as insights
      monitoringPeriod: initialData.monitoringPeriod,
    };
  })
  .then(generateRecommendationsStep)
  .map(async ({ getStepResult, getInitData }) => {
    const recommendationsResult = getStepResult(generateRecommendationsStep);
    const analysisResult = getStepResult(analyzePerformanceDataStep);
    const initialData = await getInitData();
    return {
      agentName: initialData.agentName,
      optimizationRecommendations: recommendationsResult.response, // Use .response
      analysisReport: analysisResult.analysis,
      performanceInsights: analysisResult.recommendations,
      monitoringPeriod: initialData.monitoringPeriod,
    };
  })
  .then(reviewRecommendationsStep)
  .map(async ({ getStepResult, getInitData }) => {
    const reviewResult = getStepResult(reviewRecommendationsStep);
    const analysisResult = getStepResult(analyzePerformanceDataStep);
    const initialData = await getInitData();
    return {
      agentName: initialData.agentName,
      optimizationRecommendations: reviewResult.recommendations, // Use .recommendations
      reviewFeedback: reviewResult.result, // Use .result
      analysisReport: analysisResult.analysis,
      performanceInsights: analysisResult.recommendations,
      monitoringPeriod: initialData.monitoringPeriod,
    };
  })
  .then(generateAndStoreReportStep)
  .map(async ({ getStepResult, getInitData }) => {
    const storeReportResult = getStepResult(generateAndStoreReportStep);
    const reviewResult = getStepResult(reviewRecommendationsStep);
    const analysisResult = getStepResult(analyzePerformanceDataStep);
    const initialData = await getInitData();

    return {
      monitoredAgent: initialData.agentName,
      monitoringSummary: `Performance analysis completed for ${initialData.agentName} during ${initialData.monitoringPeriod || 'the specified period'}.`,
      performanceInsights: analysisResult.recommendations,
      optimizationRecommendations: reviewResult.recommendations,
      detailedReportFile: storeReportResult.fileName,
    };
  })
  .commit();

logger.info('Agent Performance Monitoring Workflow registered successfully.');