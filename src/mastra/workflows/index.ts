import { weatherWorkflow } from './weather-workflow';
import { researchAnalysisWorkflow } from './research-analysis-workflow';
import { inngestMultiAgentWorkflow } from './inngest-multi-agent-workflow';
import { documentAnalysisWorkflow } from './document-analysis-workflow';
import { researchReportWorkflow } from './research-report-workflow';
import { agentPerformanceWorkflow } from './agent-performance-workflow';


export const workflowRegistry = {
  weatherWorkflow,
  researchAnalysisWorkflow,
  inngestMultiAgentWorkflow,
  documentAnalysisWorkflow,
  researchReportWorkflow,
  agentPerformanceWorkflow,
    // Add new workflows here as needed
} as const;

export type WorkflowName = keyof typeof workflowRegistry;

export type Workflow = (typeof workflowRegistry)[WorkflowName];

export { weatherWorkflow, researchAnalysisWorkflow, inngestMultiAgentWorkflow, documentAnalysisWorkflow, researchReportWorkflow, agentPerformanceWorkflow };


