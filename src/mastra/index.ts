import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { agentRegistry } from './agents';
import { weatherWorkflow } from './workflows/weather-workflow';
import { researchAnalysisWorkflow } from './workflows/research-analysis-workflow';
import { inngestMultiAgentWorkflow } from './workflows/inngest-multi-agent-workflow';
import { documentAnalysisWorkflow } from './workflows/document-analysis-workflow';
import { researchReportWorkflow } from './workflows/research-report-workflow';
import { agentPerformanceWorkflow } from './workflows/agent-performance-workflow';
import { baseNetwork } from './networks/base-network';
import { vNextNetwork } from './workflows/vnext-workflow';
import { LangfuseExporter } from 'langfuse-vercel';
import { env } from './config/environment';
import { inngest } from './inngest';
import { serve as inngestServe } from "@mastra/inngest";

export const mastra = new Mastra({
  workflows: { weatherWorkflow, researchAnalysisWorkflow, documentAnalysisWorkflow, researchReportWorkflow, agentPerformanceWorkflow, inngestMultiAgentWorkflow },
  vnext_networks: { 'dean-machines-vnext': vNextNetwork },
  networks: { baseNetwork },
  agents: agentRegistry,
  logger: new PinoLogger({
    level: env.LOG_LEVEL,
  }),
  telemetry: {
        serviceName: "ai",
        enabled: true,
        sampling: {
            type: "always_on",
        },
        export: {
            type: "custom",
            tracerName: "mastra",
            exporter: new LangfuseExporter({
                publicKey: process.env.LANGFUSE_PUBLIC_KEY,
                secretKey: process.env.LANGFUSE_SECRET_KEY,
                baseUrl: process.env.LANGFUSE_HOST,
        })},
        },
  server: {
    // The server configuration is required to allow local docker container can connect to the mastra server
    host: "0.0.0.0",
    apiRoutes: [
      // This API route is used to register the Mastra workflow (inngest function) on the inngest server
      {
        path: "/api/inngest",
        method: "ALL",
        createHandler: async ({ mastra }) => inngestServe({ mastra, inngest }),
        // The inngestServe function integrates Mastra workflows with Inngest by:
        // 1. Creating Inngest functions for each workflow with unique IDs (workflow.${workflowId})
        // 2. Setting up event handlers that:
        //    - Generate unique run IDs for each workflow execution
        //    - Create an InngestExecutionEngine to manage step execution
        //    - Handle workflow state persistence and real-time updates
        // 3. Establishing a publish-subscribe system for real-time monitoring
        //    through the workflow:${workflowId}:${runId} channel
      },
    ],
  },

});


