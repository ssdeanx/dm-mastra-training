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

export const mastra = new Mastra({
  workflows: { weatherWorkflow, researchAnalysisWorkflow, documentAnalysisWorkflow, researchReportWorkflow, agentPerformanceWorkflow },
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
    middleware: [
      // Weather Agent middleware
      (c, next) => {
        const runtimeContext = c.get("runtimeContext");
        if (runtimeContext) {
          console.log("Weather agent context:", runtimeContext);
        }
        return next();
      },
      // Master Agent middleware
      (c, next) => {
        const runtimeContext = c.get("runtimeContext");
        if (runtimeContext) {
          console.log("Master agent context:", runtimeContext);
        }
        return next();
      },
      // Research Agent middleware
      (c, next) => {
        const runtimeContext = c.get("runtimeContext");
        if (runtimeContext) {
          console.log("Research agent context:", runtimeContext);
        }
        return next();
      },
      // Chance Agent middleware
      (c, next) => {
        const runtimeContext = c.get("runtimeContext");
        if (runtimeContext) {
          console.log("Chance agent context:", runtimeContext);
        }
        return next();
      },
      // Mapping Agent middleware
      (c, next) => {
        const runtimeContext = c.get("runtimeContext");
        if (runtimeContext) {
          console.log("Mapping agent context:", runtimeContext);
        }
        return next();
      }
    ],
    port: env.PORT,
  },
});


