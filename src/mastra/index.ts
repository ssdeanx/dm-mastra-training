
/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { NetlifyDeployer } from "@mastra/deployer-netlify";
import { registerApiRoute } from "@mastra/core/server";
//import { CopilotRuntime, copilotRuntimeNodeHttpEndpoint, ExperimentalEmptyAdapter } from "@copilotkit/runtime"; // Uncomment if you need to use CopilotKit runtime
import { registerCopilotKit } from "@ag-ui/mastra";
import type { LogLevel } from '@mastra/loggers';

// Import all agent-specific runtime contexts
import type {
  MasterAgentRuntimeContext,
  WeatherAgentRuntimeContext,
  ResearchAgentRuntimeContext,
  DataAgentRuntimeContext,
  SupervisorAgentRuntimeContext,
  AnalyzerAgentRuntimeContext,
  LangGraphAgentRuntimeContext,
  ChanceAgentRuntimeContext,
  MappingAgentRuntimeContext,
  GenerationAgentRuntimeContext
} from './agents';

export const mastra = new Mastra({
  workflows: { weatherWorkflow, researchAnalysisWorkflow, documentAnalysisWorkflow, researchReportWorkflow, agentPerformanceWorkflow, inngestMultiAgentWorkflow },
  vnext_networks: { 'dean-machines-vnext': vNextNetwork },
  networks: { baseNetwork },
  agents: agentRegistry,
  logger: new PinoLogger({
    level: env.LOG_LEVEL as LogLevel,
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
  deployer: new NetlifyDeployer(),
  server: {
    cors: {
      origin: "*",
      allowMethods: ["*"],
      allowHeaders: ["*"]
    },
    apiRoutes: [
      registerApiRoute("/dm-agents", {
        method: "GET",
        handler: async (c) => {
          // Return the list of registered agent IDs
          const agents = Object.keys(agentRegistry);
          return c.json({ agents });
        },
      }),
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
      registerCopilotKit<MasterAgentRuntimeContext>({
        path: "/copilotkit/master", // Unique path for master agent
        resourceId: "master",
        setContext: (c, runtimeContext) => {
          const masterContext = runtimeContext as unknown as MasterAgentRuntimeContext;
          masterContext["user-id"] = c.req.header("X-User-ID") || "anonymous";
          masterContext["session-id"] = c.req.header("X-Session-ID") || "default";
          // MasterAgentRuntimeContext specific properties:
          masterContext["project-context"] = c.req.query("project-context") || "";
          masterContext["model-version"] = c.req.query("model-version") || "gemini-2.5-flash-lite-preview-06-17";
          masterContext["model-provider"] = c.req.query("model-provider") || "google";
          masterContext["plan-mode"] = c.req.query("plan-mode") === "true";
          masterContext["tasks"] = c.req.query("tasks") || "";
          masterContext["actions"] = c.req.query("actions") || "";
          masterContext["tool-selection"] = c.req.query("tool-selection") || "all";
          masterContext["debug-mode"] = c.req.query("debug-mode") === "true";
        }
      }),
      registerCopilotKit<AnalyzerAgentRuntimeContext>({
        path: "/copilotkit/analyzer", // Unique path for analyzer agent
        resourceId: "analyzer",
        setContext: (c, runtimeContext) => {
          const ctx = runtimeContext as unknown as AnalyzerAgentRuntimeContext;
          ctx["user-id"] = c.req.header("X-User-ID") || "anonymous";
          ctx["session-id"] = c.req.header("X-Session-ID") || "default";
          ctx["analysis-type"] = c.req.query("analysis-type") as any || "exploratory";
          ctx["data-source"] = c.req.query("data-source") as any || "hybrid";
          ctx["data-depth"] = c.req.query("data-depth") as any || "detailed";
          ctx["visualization"] = c.req.query("visualization") as any || "charts";
          ctx["speed-accuracy"] = c.req.query("speed-accuracy") as any || "balanced";
          ctx["domain-context"] = c.req.query("domain-context") || "general";
          ctx["input-confidence"] = parseFloat(c.req.query("input-confidence") || "1.0");
          ctx["bias-mitigation-enabled"] = c.req.query("bias-mitigation-enabled") === "true";
          ctx["low-confidence-strategy"] = c.req.query("low-confidence-strategy") as any || "flag";
          ctx["financial-market-focus"] = c.req.query("financial-market-focus") as any;
          ctx["sports-league-preference"] = c.req.query("sports-league-preference");
          ctx["crypto-asset-focus"] = c.req.query("crypto-asset-focus");
        }
      }),
      registerCopilotKit<SupervisorAgentRuntimeContext>({
        path: "/copilotkit/supervisor", // Unique path for supervisor agent
        resourceId: "supervisor",
        setContext: (c, runtimeContext) => {
          const ctx = runtimeContext as unknown as SupervisorAgentRuntimeContext;
          ctx["user-id"] = c.req.header("X-User-ID") || "anonymous";
          ctx["session-id"] = c.req.header("X-Session-ID") || "default";
          // SupervisorAgentRuntimeContext specific properties:
          ctx["agent-count"] = parseInt(c.req.query("agent-count") || "1");
          ctx["coordination-strategy"] = c.req.query("coordination-strategy") as any || "collaborative";
          ctx["qa-level"] = c.req.query("qa-level") as any || "standard";
          ctx["delegation-level"] = c.req.query("delegation-level") as any || "moderate";
          ctx["escalation-threshold"] = c.req.query("escalation-threshold") as any || "medium";
        }
      }),
      registerCopilotKit<WeatherAgentRuntimeContext>({
        path: "/copilotkit/weather", // Unique path for weather agent
        resourceId: "weather",
        setContext: (c, runtimeContext) => {
          const ctx = runtimeContext as unknown as WeatherAgentRuntimeContext;
          ctx["user-id"] = c.req.header("X-User-ID") || "anonymous";
          ctx["session-id"] = c.req.header("X-Session-ID") || "default";
          ctx["temperature-unit"] = c.req.query("temperature-unit") as any || "celsius";
          // WeatherAgentRuntimeContext specific properties:
          ctx["default-location"] = c.req.query("default-location") || "";
          ctx["extended-forecast"] = c.req.query("extended-forecast") === "true";
          ctx["include-alerts"] = c.req.query("include-alerts") === "true";
          ctx["timezone"] = c.req.query("timezone") || "UTC";
        }
      }),
      registerCopilotKit<ResearchAgentRuntimeContext>({
        path: "/copilotkit/research", // Unique path for research agent
        resourceId: "research",
        setContext: (c, runtimeContext) => {
          const ctx = runtimeContext as unknown as ResearchAgentRuntimeContext;
          ctx["user-id"] = c.req.header("X-User-ID") || "anonymous";
          ctx["session-id"] = c.req.header("X-Session-ID") || "default";
          // ResearchAgentRuntimeContext specific properties:
          ctx["research-depth"] = c.req.query("research-depth") as any || "detailed";
          ctx["source-types"] = c.req.query("source-types")?.split(',') || ["web","academic"];
          ctx["max-sources"] = parseInt(c.req.query("max-sources") || "10");
          ctx["include-academic"] = c.req.query("include-academic") === "true";
          ctx["language-filter"] = c.req.query("language-filter")?.split(',') || ["en"];
          ctx["focus-area"] = c.req.query("focus-area") || "general";
          ctx["input-confidence"] = parseFloat(c.req.query("input-confidence") || "1.0");
          ctx["bias-mitigation-enabled"] = c.req.query("bias-mitigation-enabled") === "true";
          ctx["low-confidence-strategy"] = c.req.query("low-confidence-strategy") as any || "flag";
          ctx["financial-market-focus"] = c.req.query("financial-market-focus") as any;
          ctx["sports-league-preference"] = c.req.query("sports-league-preference");
          ctx["crypto-asset-focus"] = c.req.query("crypto-asset-focus");
        }
      }),
      registerCopilotKit<DataAgentRuntimeContext>({
        path: "/copilotkit/data", // Unique path for data agent
        resourceId: "data",
        setContext: (c, runtimeContext) => {
          const dataContext = runtimeContext as unknown as DataAgentRuntimeContext;
          dataContext["user-id"] = c.req.header("X-User-ID") || "anonymous";
          dataContext["session-id"] = c.req.header("X-Session-ID") || "default";
          // DataAgentRuntimeContext specific properties:
          dataContext["mode"] = c.req.query("mode") as any;
          dataContext["data-dir"] = c.req.query("data-dir");
        }
      }),
      registerCopilotKit<LangGraphAgentRuntimeContext>({
        path: "/copilotkit/langgraph", // Unique path for langgraph agent
        resourceId: "langgraph",
        setContext: (c, runtimeContext) => {
          const langGraphContext = runtimeContext as unknown as LangGraphAgentRuntimeContext;
          langGraphContext["user-id"] = c.req.header("X-User-ID") || "anonymous";
          langGraphContext["session-id"] = c.req.header("X-Session-ID") || "default";
          // LangGraphAgentRuntimeContext specific properties:
          langGraphContext["workflow-mode"] = c.req.query("workflow-mode") as any || "sequential";
          langGraphContext["reasoning-depth"] = c.req.query("reasoning-depth") as any || "moderate";
          langGraphContext["step-tracking"] = c.req.query("step-tracking") === "true";
          langGraphContext["max-iterations"] = parseInt(c.req.query("max-iterations") || "10");
          langGraphContext["domain-focus"] = c.req.query("domain-focus") || "general";
          langGraphContext["output-format"] = c.req.query("output-format") as any || "structured";
        }
      }),
      registerCopilotKit<ChanceAgentRuntimeContext>({
        path: "/copilotkit/chance", // Unique path for chance agent
        resourceId: "chance",
        setContext: (c, runtimeContext) => {
          const chanceContext = runtimeContext as unknown as ChanceAgentRuntimeContext;
          chanceContext["user-id"] = c.req.header("X-User-ID") || "anonymous";
          chanceContext["session-id"] = c.req.header("X-Session-ID") || "default";
          // ChanceAgentRuntimeContext specific properties:
          chanceContext["decision-type"] = c.req.query("decision-type") as any || "operational";
          chanceContext["risk-tolerance"] = c.req.query("risk-tolerance") as any || "medium";
          chanceContext["exploration-exploitation-balance"] = c.req.query("exploration-exploitation-balance") as any || "balanced";
          chanceContext["outcome-feedback-mechanism"] = c.req.query("outcome-feedback-mechanism") as any || "reinforcement";
          chanceContext["confidence-threshold"] = parseFloat(c.req.query("confidence-threshold") || "0.7");
          chanceContext["bias-awareness-enabled"] = c.req.query("bias-awareness-enabled") === "true";
          chanceContext["domain-context"] = c.req.query("domain-context") || "general";
          chanceContext["financial-market-focus"] = c.req.query("financial-market-focus") as any;
          chanceContext["sports-league-preference"] = c.req.query("sports-league-preference");
          chanceContext["crypto-asset-focus"] = c.req.query("crypto-asset-focus");
        }
      }),
      registerCopilotKit<MappingAgentRuntimeContext>({
        path: "/copilotkit/mapping", // Unique path for mapping agent
        resourceId: "mapping",
        setContext: (c, runtimeContext) => {
          const mappingContext = runtimeContext as unknown as MappingAgentRuntimeContext;
          mappingContext["user-id"] = c.req.header("X-User-ID") || "anonymous";
          mappingContext["session-id"] = c.req.header("X-Session-ID") || "default";
          // MappingAgentRuntimeContext specific properties:
          mappingContext["source-data-format"] = c.req.query("source-data-format") as any || "auto";
          mappingContext["target-data-format"] = c.req.query("target-data-format") as any || "json";
          mappingContext["mapping-strategy"] = c.req.query("mapping-strategy") as any || "direct";
          mappingContext["validation-level"] = c.req.query("validation-level") as any || "schema";
          mappingContext["error-handling-strategy"] = c.req.query("error-handling-strategy") as any || "flag";
          mappingContext["visualization-enabled"] = c.req.query("visualization-enabled") === "true";
          mappingContext["domain-context"] = c.req.query("domain-context") || "general";
        }
      }),
      registerCopilotKit<GenerationAgentRuntimeContext>({
        path: "/copilotkit/generation", // Unique path for generation agent
        resourceId: "generation",
        setContext: (c, runtimeContext) => {
          const generationContext = runtimeContext as unknown as GenerationAgentRuntimeContext;
          generationContext["user-id"] = c.req.header("X-User-ID") || "anonymous";
          generationContext["session-id"] = c.req.header("X-Session-ID") || "default";
          // GenerationAgentRuntimeContext specific properties:
          generationContext["content-type"] = c.req.query("content-type") as any || "text";
          generationContext["generation-style"] = c.req.query("generation-style") as any || "balanced";
          generationContext["output-format"] = c.req.query("output-format") as any || "markdown";
          generationContext["detail-level"] = c.req.query("detail-level") as any || "standard";
          generationContext["fact-check-enabled"] = c.req.query("fact-check-enabled") === "true";
          generationContext["domain-context"] = c.req.query("domain-context") || "general";
          generationContext["target-audience"] = c.req.query("target-audience");
          generationContext["keywords"] = c.req.query("keywords")?.split(',');
        }
      })
    ]
  },
  //},

});

