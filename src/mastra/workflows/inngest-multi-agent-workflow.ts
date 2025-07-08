import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { init } from '@mastra/inngest';
import { inngest } from '../inngest';
import { researchAgent, analyzerAgent, dataAgent, supervisorAgent } from '../agents';
import { synthesisAgent } from '../workflows/vnext-workflow';
import { RuntimeContext } from '@mastra/core/runtime-context';

// Initialize Inngest with Mastra workflow helpers
const { createWorkflow: createInngestWorkflow, createStep: createInngestStep } = init(inngest);

// Input schema for the multi-agent workflow
const multiAgentWorkflowInputSchema = z.object({
  query: z.string().min(1, "Query is required for multi-agent workflow"),
  researchDepth: z.enum(['surface', 'detailed', 'comprehensive']).default('detailed'),
  includeVisualizations: z.boolean().default(false),
});

// Output schema for the multi-agent workflow
const multiAgentWorkflowOutputSchema = z.object({
  originalQuery: z.string(),
  researchSummary: z.string(),
  analysisReport: z.string(),
  finalSynthesis: z.string(),
  visualizationsGenerated: z.boolean(),
});

/**
 * Step 0: Initial Planning and Orchestration using Supervisor Agent
 */
const supervisorInitialPlanStep = createInngestStep({
  id: 'supervisor-initial-plan-step',
  description: 'Uses Supervisor Agent to create an initial plan for the research workflow.',
  inputSchema: z.object({
    query: z.string(),
    researchDepth: z.enum(['surface', 'detailed', 'comprehensive']).default('detailed'),
    includeVisualizations: z.boolean().default(false),
  }),
  outputSchema: z.object({
    plan: z.string(),
    agentsToUse: z.array(z.string()),
  }),
  execute: async ({ inputData }) => {
    const { query, researchDepth } = inputData;
    const supervisorRuntimeContext = new RuntimeContext();
    supervisorRuntimeContext.set("coordination-strategy", "hierarchical");
    supervisorRuntimeContext.set("qa-level", "rigorous");

    const { text: plan } = await supervisorAgent.generate(
      `Create a detailed plan for a research and analysis workflow on the topic: "${query}" with a research depth of "${researchDepth}". Identify the key steps and the agents best suited for each step (e.g., researchAgent, analyzerAgent, synthesisAgent, dataAgent).`,
      {
        runtimeContext: supervisorRuntimeContext
      }
    );
    // Dummy agent extraction for now, replace with actual parsing from plan
    const agentsToUse = ['researchAgent', 'analyzerAgent', 'synthesisAgent']; // Default agents
    if (plan.includes('dataAgent')) agentsToUse.push('dataAgent');
    if (plan.includes('supervisorAgent')) agentsToUse.push('supervisorAgent'); // Self-referential for planning

    return { plan, agentsToUse };
  },
});

/**
 * Step 1: Conduct Research using Research Agent
 */
const conductResearchStep = createInngestStep({
  id: 'conduct-research-step',
  description: 'Conducts comprehensive research based on the query using the Research Agent.',
  inputSchema: z.object({
    query: z.string(),
    researchDepth: z.enum(['surface', 'detailed', 'comprehensive']).default('detailed'),
    includeVisualizations: z.boolean().default(false),
    plan: z.string(), // Added from supervisor step
    agentsToUse: z.array(z.string()), // Added from supervisor step
  }),
  outputSchema: z.object({
    researchFindings: z.string(),
    sources: z.array(z.string()),
  }),
  execute: async ({ inputData }) => {
    const { query, researchDepth, plan } = inputData;
    const researchRuntimeContext = new RuntimeContext();
    researchRuntimeContext.set("research-depth", researchDepth);

    const { text: researchFindings } = await researchAgent.generate(
      `Following the plan: "${plan}", conduct ${researchDepth} research on: "${query}". Provide detailed findings and list sources.`,
      {
        runtimeContext: researchRuntimeContext
      }
    );
    // Dummy sources for now, replace with actual source extraction if researchAgent provides it
    const sources = researchFindings.match(/(https?:\/\/[^\s]+)/g) || [];
    return { researchFindings, sources };
  },
});

/**
 * Step 1.5: Store Research Data using Data Agent
 */
const storeResearchDataStep = createInngestStep({
  id: 'store-research-data-step',
  description: 'Stores the raw research findings using the Data Agent.',
  inputSchema: z.object({
    originalQuery: z.string(),
    researchFindings: z.string(),
    sources: z.array(z.string()),
  }),
  outputSchema: z.object({
    fileName: z.string(),
    success: z.boolean(),
  }),
  execute: async ({ inputData }) => {
    const { originalQuery, researchFindings } = inputData;
    const fileName = `research_findings_${originalQuery.replace(/\s/g, '_')}_${Date.now()}.md`;
    const dataRuntimeContext = new RuntimeContext();
    dataRuntimeContext.set("mode", "write");
    dataRuntimeContext.set("data-dir", "research_data");

    const { text: result } = await dataAgent.generate(
      `Write the following research findings to a file named "${fileName}" in the "research_data" directory:\n\n${researchFindings}`,
      {
        runtimeContext: dataRuntimeContext
      }
    );
    const success = result.includes("success"); // Simple check for now
    return { fileName, success };
  },
});

/**
 * Step 2: Analyze Research Data using Analyzer Agent
 */
const analyzeResearchStep = createInngestStep({
  id: 'analyze-research-step',
  description: 'Analyzes the research findings and generates an analysis report using the Analyzer Agent.',
  inputSchema: z.object({
    originalQuery: z.string(),
    researchFindings: z.string(),
    sources: z.array(z.string()),
    researchDataFileName: z.string(), // Added from data agent step
    researchDataSuccess: z.boolean(), // Added from data agent step
  }),
  outputSchema: z.object({
    analysisReport: z.string(),
    insights: z.array(z.string()),
  }),
  execute: async ({ inputData }) => {
    const { originalQuery, researchFindings, sources } = inputData;
    const analyzerRuntimeContext = new RuntimeContext();
    analyzerRuntimeContext.set("analysis-type", "detailed");
    analyzerRuntimeContext.set("data-source", "external");

    const { text: analysisReport } = await analyzerAgent.generate(
      `Analyze the following research findings related to "${originalQuery}":\n\n${researchFindings}\n\nSources: ${sources.join(', ')}. Provide a comprehensive analysis and key insights.`,
      {
        runtimeContext: analyzerRuntimeContext
      }
    );
    // Dummy insights for now, replace with actual insight extraction
    const insights = analysisReport.split('\n').filter(line => line.startsWith('- ')).map(line => line.substring(2));
    return { analysisReport, insights };
  },
});

/**
 * Step 2.5: Quality Check Analysis Report using Supervisor Agent
 */
const supervisorQualityCheckStep = createInngestStep({
  id: 'supervisor-quality-check-step',
  description: 'Uses Supervisor Agent to assess the quality of the analysis report.',
  inputSchema: z.object({
    originalQuery: z.string(),
    analysisReport: z.string(),
    insights: z.array(z.string()),
  }),
  outputSchema: z.object({
    qualityScore: z.number(),
    feedback: z.string(),
  }),
  execute: async ({ inputData }) => {
    const { originalQuery, analysisReport } = inputData;
    const supervisorRuntimeContext = new RuntimeContext();
    supervisorRuntimeContext.set("qa-level", "rigorous");

    const { text: feedback } = await supervisorAgent.generate(
      `Assess the quality of the following analysis report for "${originalQuery}". Provide a quality score (0-100) and detailed feedback for improvement.\n\nReport:\n${analysisReport}`,
      {
        runtimeContext: supervisorRuntimeContext
      }
    );
    // Dummy score extraction for now
    const qualityScoreMatch = feedback.match(/Quality Score: (\d+)/);
    const qualityScore = qualityScoreMatch ? parseInt(qualityScoreMatch[1]) : 75; // Default to 75 if not found
    return { qualityScore, feedback };
  },
});

/**
 * Step 2.7: Store Analysis Report using Data Agent
 */
const storeAnalysisReportStep = createInngestStep({
  id: 'store-analysis-report-step',
  description: 'Stores the analysis report using the Data Agent.',
  inputSchema: z.object({
    originalQuery: z.string(),
    analysisReport: z.string(),
    qualityScore: z.number(), // Added from supervisor step
    feedback: z.string(), // Added from supervisor step
  }),
  outputSchema: z.object({
    fileName: z.string(),
    success: z.boolean(),
  }),
  execute: async ({ inputData }) => {
    const { originalQuery, analysisReport, qualityScore } = inputData;
    const fileName = `analysis_report_${originalQuery.replace(/\s/g, '_')}_${Date.now()}.md`;
    const dataRuntimeContext = new RuntimeContext();
    dataRuntimeContext.set("mode", "write");
    dataRuntimeContext.set("data-dir", "analysis_reports");

    const { text: result } = await dataAgent.generate(
      `Write the following analysis report (Quality Score: ${qualityScore}) to a file named "${fileName}" in the "analysis_reports" directory:\n\n${analysisReport}`,
      {
        runtimeContext: dataRuntimeContext
      }
    );
    const success = result.includes("success"); // Simple check for now
    return { fileName, success };
  },
});

/**
 * Step 3: Synthesize Final Report using Synthesis Agent
 */
const synthesizeReportStep = createInngestStep({
  id: 'synthesize-report-step',
  description: 'Synthesizes the analysis report into a final comprehensive report using the Synthesis Agent.',
  inputSchema: z.object({
    originalQuery: z.string(),
    analysisReport: z.string(),
    insights: z.array(z.string()),
    includeVisualizations: z.boolean(),
    analysisReportFileName: z.string(), // Added from data agent step
    analysisReportSuccess: z.boolean(), // Added from data agent step
    qualityScore: z.number(), // Added from supervisor step
    feedback: z.string(), // Added from supervisor step
  }),
  outputSchema: z.object({
    finalSynthesis: z.string(),
    visualizationsGenerated: z.boolean(),
  }),
  execute: async ({ inputData }) => {
    const { originalQuery, analysisReport, insights, includeVisualizations, qualityScore } = inputData;
    const { text: finalSynthesis } = await synthesisAgent.generate(
      `Synthesize the following analysis report (Quality Score: ${qualityScore}) and insights into a comprehensive final report for the query "${originalQuery}". ${includeVisualizations ? "Also, suggest potential visualizations." : ""}\n\nAnalysis Report:\n${analysisReport}\n\nKey Insights:\n${insights.join('\n')}`,
    );
    return { finalSynthesis, visualizationsGenerated: includeVisualizations };
  },
});

/**
 * Step 3.5: Store Final Report using Data Agent
 */
const storeFinalReportStep = createInngestStep({
  id: 'store-final-report-step',
  description: 'Stores the final synthesized report using the Data Agent.',
  inputSchema: z.object({
    originalQuery: z.string(),
    finalSynthesis: z.string(),
    visualizationsGenerated: z.boolean(),
  }),
  outputSchema: z.object({
    fileName: z.string(),
    success: z.boolean(),
  }),
  execute: async ({ inputData }) => {
    const { originalQuery, finalSynthesis } = inputData;
    const fileName = `final_report_${originalQuery.replace(/\s/g, '_')}_${Date.now()}.md`;
    const dataRuntimeContext = new RuntimeContext();
    dataRuntimeContext.set("mode", "write");
    dataRuntimeContext.set("data-dir", "final_reports");

    const { text: result } = await dataAgent.generate(
      `Write the following final synthesized report to a file named "${fileName}" in the "final_reports" directory:\n\n${finalSynthesis}`,
      {
        runtimeContext: dataRuntimeContext
      }
    );
    const success = result.includes("success"); // Simple check for now
    return { fileName, success };
  },
});

/**
 * Main Inngest Multi-Agent Workflow
 */
export const inngestMultiAgentWorkflow = createInngestWorkflow({
  id: 'multi-agent-research-workflow',
  description: 'Orchestrates multiple agents (Supervisor, Research, Data, Analyzer, Synthesis) to conduct comprehensive research, store data, and generate reports with quality checks.',
  inputSchema: multiAgentWorkflowInputSchema,
  outputSchema: multiAgentWorkflowOutputSchema,
})
  .then(supervisorInitialPlanStep) // New initial planning step
  .map(async ({ getStepResult, getInitData }) => {
    const initialData = await getInitData();
    const planResult = getStepResult(supervisorInitialPlanStep);
    return {
      query: initialData.query,
      researchDepth: initialData.researchDepth,
      includeVisualizations: initialData.includeVisualizations,
      plan: planResult.plan,
      agentsToUse: planResult.agentsToUse,
    };
  })
  .then(conductResearchStep)
  .map(async ({ getStepResult, getInitData }) => {
    const initialData = await getInitData();
    const researchResult = getStepResult(conductResearchStep);
    const planResult = getStepResult(supervisorInitialPlanStep); // Get plan from initial step
    return {
      originalQuery: initialData.query,
      researchFindings: researchResult.researchFindings,
      sources: researchResult.sources,
      includeVisualizations: initialData.includeVisualizations,
      plan: planResult.plan, // Pass plan along
      agentsToUse: planResult.agentsToUse, // Pass agents to use along
    };
  })
  .then(storeResearchDataStep) // New data storage step
  .map(async ({ getStepResult, getInitData }) => {
    const initialData = await getInitData();
    const researchResult = getStepResult(conductResearchStep);
    const storeResult = getStepResult(storeResearchDataStep);
    const planResult = getStepResult(supervisorInitialPlanStep);
    return {
      originalQuery: initialData.query,
      researchFindings: researchResult.researchFindings,
      sources: researchResult.sources,
      includeVisualizations: initialData.includeVisualizations,
      researchDataFileName: storeResult.fileName,
      researchDataSuccess: storeResult.success,
      plan: planResult.plan,
      agentsToUse: planResult.agentsToUse,
    };
  })
  .then(analyzeResearchStep)
  .map(async ({ getStepResult, getInitData }) => {
    const initialData = await getInitData();
    const analysisResult = getStepResult(analyzeResearchStep);
    const researchResult = getStepResult(conductResearchStep);
    const storeResearchResult = getStepResult(storeResearchDataStep);
    const planResult = getStepResult(supervisorInitialPlanStep);
    return {
      originalQuery: initialData.query,
      researchSummary: researchResult.researchFindings,
      analysisReport: analysisResult.analysisReport,
      insights: analysisResult.insights,
      includeVisualizations: initialData.includeVisualizations,
      researchDataFileName: storeResearchResult.fileName,
      researchDataSuccess: storeResearchResult.success,
      plan: planResult.plan,
      agentsToUse: planResult.agentsToUse,
    };
  })
  .then(supervisorQualityCheckStep) // New quality check step
  .map(async ({ getStepResult, getInitData }) => {
    const initialData = await getInitData();
    const analysisResult = getStepResult(analyzeResearchStep);
    const researchResult = getStepResult(conductResearchStep);
    const storeResearchResult = getStepResult(storeResearchDataStep);
    const qualityCheckResult = getStepResult(supervisorQualityCheckStep);
    const planResult = getStepResult(supervisorInitialPlanStep);
    return {
      originalQuery: initialData.query,
      researchSummary: researchResult.researchFindings,
      analysisReport: analysisResult.analysisReport,
      insights: analysisResult.insights,
      includeVisualizations: initialData.includeVisualizations,
      researchDataFileName: storeResearchResult.fileName,
      researchDataSuccess: storeResearchResult.success,
      qualityScore: qualityCheckResult.qualityScore,
      feedback: qualityCheckResult.feedback,
      plan: planResult.plan,
      agentsToUse: planResult.agentsToUse,
    };
  })
  .then(storeAnalysisReportStep) // New data storage step
  .map(async ({ getStepResult, getInitData }) => {
    const initialData = await getInitData();
    const analysisResult = getStepResult(analyzeResearchStep);
    const researchResult = getStepResult(conductResearchStep);
    const storeResearchResult = getStepResult(storeResearchDataStep);
    const qualityCheckResult = getStepResult(supervisorQualityCheckStep);
    const storeAnalysisResult = getStepResult(storeAnalysisReportStep);
    const planResult = getStepResult(supervisorInitialPlanStep);
    return {
      originalQuery: initialData.query,
      researchSummary: researchResult.researchFindings,
      analysisReport: analysisResult.analysisReport,
      insights: analysisResult.insights,
      includeVisualizations: initialData.includeVisualizations,
      researchDataFileName: storeResearchResult.fileName,
      researchDataSuccess: storeResearchResult.success,
      qualityScore: qualityCheckResult.qualityScore,
      feedback: qualityCheckResult.feedback,
      analysisReportFileName: storeAnalysisResult.fileName,
      analysisReportSuccess: storeAnalysisResult.success,
      plan: planResult.plan,
      agentsToUse: planResult.agentsToUse,
    };
  })
  .then(synthesizeReportStep)
  .map(async ({ getStepResult, getInitData }) => {
    const initialData = await getInitData();
    const synthesisResult = getStepResult(synthesizeReportStep);
    const analysisResult = getStepResult(analyzeResearchStep);
    const researchResult = getStepResult(conductResearchStep);
    const storeResearchResult = getStepResult(storeResearchDataStep);
    const qualityCheckResult = getStepResult(supervisorQualityCheckStep);
    const storeAnalysisResult = getStepResult(storeAnalysisReportStep);
    const planResult = getStepResult(supervisorInitialPlanStep);
    return {
      originalQuery: initialData.query,
      researchSummary: researchResult.researchFindings,
      analysisReport: analysisResult.analysisReport,
      finalSynthesis: synthesisResult.finalSynthesis,
      visualizationsGenerated: synthesisResult.visualizationsGenerated,
      researchDataFileName: storeResearchResult.fileName,
      researchDataSuccess: storeResearchResult.success,
      qualityScore: qualityCheckResult.qualityScore,
      feedback: qualityCheckResult.feedback,
      analysisReportFileName: storeAnalysisResult.fileName,
      analysisReportSuccess: storeAnalysisResult.success,
      plan: planResult.plan,
      agentsToUse: planResult.agentsToUse,
    };
  })
  .then(storeFinalReportStep) // New data storage step
  .map(async ({ getStepResult, getInitData }) => {
    const initialData = await getInitData();
    const synthesisResult = getStepResult(synthesizeReportStep);
    const storeFinalResult = getStepResult(storeFinalReportStep);
    const analysisResult = getStepResult(analyzeResearchStep);
    const researchResult = getStepResult(conductResearchStep);
    const storeResearchResult = getStepResult(storeResearchDataStep);
    const qualityCheckResult = getStepResult(supervisorQualityCheckStep);
    const storeAnalysisResult = getStepResult(storeAnalysisReportStep);
    const planResult = getStepResult(supervisorInitialPlanStep);
    return {
      originalQuery: initialData.query,
      researchSummary: researchResult.researchFindings,
      analysisReport: analysisResult.analysisReport,
      finalSynthesis: synthesisResult.finalSynthesis,
      visualizationsGenerated: synthesisResult.visualizationsGenerated,
      researchDataFileName: storeResearchResult.fileName,
      researchDataSuccess: storeResearchResult.success,
      qualityScore: qualityCheckResult.qualityScore,
      feedback: qualityCheckResult.feedback,
      analysisReportFileName: storeAnalysisResult.fileName,
      analysisReportSuccess: storeAnalysisResult.success,
      finalReportFileName: storeFinalResult.fileName,
      finalReportSuccess: storeFinalResult.success,
      plan: planResult.plan,
      agentsToUse: planResult.agentsToUse,
    };
  })
  .commit();
