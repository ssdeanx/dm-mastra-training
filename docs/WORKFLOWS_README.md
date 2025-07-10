# Mastra Workflows Overview

This document provides an overview of the workflows available within the `src/mastra/workflows/` directory. These workflows define multi-step processes that orchestrate various agents and tools to achieve complex goals.

## Directory Structure

The `src/mastra/workflows/` directory contains individual workflow implementations, each typically residing in its own file.

```txt
src/mastra/workflows/
├── agent-performance-workflow.ts
├── document-analysis-workflow.ts
├── inngest-multi-agent-workflow.ts
├── research-analysis-workflow.ts
├── research-report-workflow.ts
├── vnext-workflow.ts
└── weather-workflow.ts
```

## Workflow Examples

### 1. Agent Performance Monitoring and Optimization Workflow (`agent-performance-workflow.ts`)

- **ID**: `agent-performance-workflow`
- **Description**: Monitors an agent's performance, analyzes data, generates optimization recommendations, and stores reports.
- **Input Schema**: Defined in [`src/mastra/workflows/agent-performance-workflow.ts`](src/mastra/workflows/agent-performance-workflow.ts:14-28).
  - `agentName`: The name of the agent to monitor.
  - `monitoringPeriod`: Time period for monitoring (e.g., "last 24 hours").
  - `metrics`: Specific performance metrics to focus on.
  - `performanceData`: Actual structured performance data for the agent.
- **Output Schema**: Defined in [`src/mastra/workflows/agent-performance-workflow.ts`](src/mastra/workflows/agent-performance-workflow.ts:31-36).
  - `monitoredAgent`: The name of the agent that was monitored.
  - `monitoringSummary`: A summary of the agent's performance.
  - `performanceInsights`: Key insights into the agent's performance.
  - `optimizationRecommendations`: Actionable recommendations for optimizing the agent.
  - `detailedReportFile`: Filename where the detailed performance report is stored.
- **Workflow Steps**:
    1. **`gather-performance-data`** ([`src/mastra/workflows/agent-performance-workflow.ts`](src/mastra/workflows/agent-performance-workflow.ts:43-76)): Gathers structured performance data.
    2. **`analyze-performance-data`** ([`src/mastra/workflows/agent-performance-workflow.ts`](src/mastra/workflows/agent-performance-workflow.ts:82-113)): Analyzes data using the `Analyzer Agent`.
    3. **`generate-optimization-recommendations`** ([`src/mastra/workflows/agent-performance-workflow.ts`](src/mastra/workflows/agent-performance-workflow.ts:119-146)): Generates recommendations using the `Master Agent`.
    4. **`review-recommendations`** ([`src/mastra/workflows/agent-performance-workflow.ts`](src/mastra/workflows/agent-performance-workflow.ts:152-178)): Reviews and refines recommendations using the `Supervisor Agent`.
    5. **`generate-and-store-report`** ([`src/mastra/workflows/agent-performance-workflow.ts`](src/mastra/workflows/agent-performance-workflow.ts:184-227)): Generates and stores the detailed report using the `Data Agent`.
- **Agents Involved**: `masterAgent`, `supervisorAgent`, `analyzerAgent`, `dataAgent`.
- **Key Functionality**: Provides a structured approach to continuous improvement of agent performance.

### 2. Document Analysis and Summarization Workflow (`document-analysis-workflow.ts`)

- **ID**: `document-analysis-workflow`
- **Description**: Analyzes a document to provide a summary and key insights.
- **Input Schema**: Defined in [`src/mastra/workflows/document-analysis-workflow.ts`](src/mastra/workflows/document-analysis-workflow.ts:12-16).
  - `documentContent`: The content of the document.
  - `documentPath`: The path to the document file.
- **Output Schema**: Defined in [`src/mastra/workflows/document-analysis-workflow.ts`](src/mastra/workflows/document-analysis-workflow.ts:19-24).
  - `originalInput`: The original query or document path.
  - `analysisSummary`: A concise summary of the analysis.
  - `keyInsights`: Key insights extracted.
  - `analysisDetails`: Detailed analysis report.
- **Workflow Steps**:
    1. **`read-document-content`** ([`src/mastra/workflows/document-analysis-workflow.ts`](src/mastra/workflows/document-analysis-workflow.ts:31-63)): Reads document content from a file or uses provided content, using the `Data Agent`.
    2. **`analyze-document-content`** ([`src/mastra/workflows/document-analysis-workflow.ts`](src/mastra/workflows/document-analysis-workflow.ts:69-96)): Analyzes the document content using the `Analyzer Agent`.
    3. **`summarize-insights`** ([`src/mastra/workflows/document-analysis-workflow.ts`](src/mastra/workflows/document-analysis-workflow.ts:102-132)): Generates a concise summary and extracts key insights.
- **Agents Involved**: `dataAgent`, `analyzerAgent`.
- **Key Functionality**: Streamlines the process of extracting valuable information from unstructured documents.

### 3. Inngest Multi-Agent Workflow (`inngest-multi-agent-workflow.ts`)

- **ID**: `multi-agent-research-workflow`
- **Description**: Orchestrates multiple agents (Supervisor, Research, Data, Analyzer, Synthesis) to conduct comprehensive research, store data, and generate reports with quality checks.
- **Input Schema**: Defined in [`src/mastra/workflows/inngest-multi-agent-workflow.ts`](src/mastra/workflows/inngest-multi-agent-workflow.ts:12-16).
  - `query`: The research query.
  - `researchDepth`: Depth of research.
  - `includeVisualizations`: Whether to include visualizations.
- **Output Schema**: Defined in [`src/mastra/workflows/inngest-multi-agent-workflow.ts`](src/mastra/workflows/inngest-multi-agent-workflow.ts:19-24).
  - `originalQuery`: The original query.
  - `researchSummary`: Summary of research.
  - `analysisReport`: Analysis report.
  - `finalSynthesis`: Final synthesized report.
  - `visualizationsGenerated`: Whether visualizations were generated.
- **Workflow Steps**:
    1. **`supervisor-initial-plan-step`** ([`src/mastra/workflows/inngest-multi-agent-workflow.ts`](src/mastra/workflows/inngest-multi-agent-workflow.ts:31-74)): Uses `Supervisor Agent` to create an initial plan.
    2. **`conduct-research-step`** ([`src/mastra/workflows/inngest-multi-agent-workflow.ts`](src/mastra/workflows/inngest-multi-agent-workflow.ts:80-107)): Conducts research using `Research Agent`.
    3. **`store-research-data-step`** ([`src/mastra/workflows/inngest-multi-agent-workflow.ts`](src/mastra/workflows/inngest-multi-agent-workflow.ts:113-139)): Stores raw research findings using `Data Agent`.
    4. **`analyze-research-step`** ([`src/mastra/workflows/inngest-multi-agent-workflow.ts`](src/mastra/workflows/inngest-multi-agent-workflow.ts:145-175)): Analyzes research data using `Analyzer Agent`.
    5. **`supervisor-quality-check-step`** ([`src/mastra/workflows/inngest-multi-agent-workflow.ts`](src/mastra/workflows/inngest-multi-agent-workflow.ts:181-224)): Assesses analysis report quality using `Supervisor Agent`.
    6. **`store-analysis-report-step`** ([`src/mastra/workflows/inngest-multi-agent-workflow.ts`](src/mastra/workflows/inngest-multi-agent-workflow.ts:230-258)): Stores analysis report using `Data Agent`.
    7. **`synthesize-report-step`** ([`src/mastra/workflows/inngest-multi-agent-workflow.ts`](src/mastra/workflows/inngest-multi-agent-workflow.ts:264-286)): Synthesizes final report using `Synthesis Agent` (Generation Agent).
    8. **`store-final-report-step`** ([`src/mastra/workflows/inngest-multi-agent-workflow.ts`](src/mastra/workflows/inngest-multi-agent-workflow.ts:292-318)): Stores final synthesized report using `Data Agent`.
- **Agents Involved**: `supervisorAgent`, `researchAgent`, `dataAgent`, `analyzerAgent`, `generationAgent`.
- **Key Functionality**: Demonstrates complex, event-driven orchestration of multiple agents for a comprehensive research and reporting pipeline.

### 4. Research Analysis Workflow (`research-analysis-workflow.ts`)

- **ID**: `research-analysis-workflow`
- **Description**: A comprehensive workflow for advanced research capabilities using intelligent multi-agent orchestration. It supports multi-source research, advanced analysis, data visualization, quality assessment, and flexible output formats.
- **Input Schema (`ResearchAnalysisInput`)**: Defined in [`src/mastra/workflows/research-analysis-workflow.ts`](src/mastra/workflows/research-analysis-workflow.ts:117-129).
  - `topic`: The research topic.
  - `options`: Optional configuration including `depth` (surface, moderate, deep, comprehensive), `sources`, `focusAreas`, `format` (report, presentation, dashboard, summary), `timeframe`, `includeVisuals`, `generateActions`, and `audience`.
- **Output Schema (`ResearchAnalysisOutput`)**: Defined in [`src/mastra/workflows/research-analysis-workflow.ts`](src/mastra/workflows/research-analysis-workflow.ts:132-154).
  - `workflowId`: Unique identifier for the workflow run.
  - `executiveSummary`: High-level summary of findings.
  - `detailedFindings`: Array of detailed findings with categories, content, sources, confidence, and relevance.
  - `visualizations`: Optional array of visualization specifications.
  - `recommendations`: Array of prioritized recommendations.
  - `actionItems`: Optional array of actionable tasks.
  - `metadata`: Workflow execution metadata (sources count, confidence, duration, strategy, insights).
  - `status`: Workflow status (`success`, `partial`, `failed`).
  - `error`: Optional error message if the workflow failed.
- **Workflow Steps**:
    1. **`initialize-research`** ([`src/mastra/workflows/research-analysis-workflow.ts`](src/mastra/workflows/research-analysis-workflow.ts:157-242)): Initializes the workflow and plans the research strategy using the `langGraphAgent`.
    2. **`conduct-research`** ([`src/mastra/workflows/research-analysis-workflow.ts`](src/mastra/workflows/research-analysis-workflow.ts:245-342)): Conducts comprehensive research using the `researchAgent` and various MCP tools.
    3. **`analyze-research`** ([`src/mastra/workflows/research-analysis-workflow.ts`](src/mastra/workflows/research-analysis-workflow.ts:345-445)): Analyzes the collected research data and generates insights using the `analyzerAgent`.
    4. **`generate-visualizations`** ([`src/mastra/workflows/research-analysis-workflow.ts`](src/mastra/workflows/research-analysis-workflow.ts:448-604)): (Conditional) Generates data visualizations and insights using the `supervisorAgent`.
    5. **`generate-recommendations`** ([`src/mastra/workflows/research-analysis-workflow.ts`](src/mastra/workflows/research-analysis-workflow.ts:607-694)): Generates recommendations and action items using the `masterAgent`.
    6. **`finalize-workflow`** ([`src/mastra/workflows/research-analysis-workflow.ts`](src/mastra/workflows/research-analysis-workflow.ts:697-755)): Finalizes the workflow and prepares the output.
- **Agents Involved**: `researchAgent`, `analyzerAgent`, `supervisorAgent`, `masterAgent`, `langGraphAgent`.
- **Key Functionality**: Orchestrates a multi-agent process to perform in-depth research, analyze findings, generate visualizations, and provide actionable recommendations.

### 5. Research and Report Generation Workflow (`research-report-workflow.ts`)

- **ID**: `research-report-workflow`
- **Description**: Conducts comprehensive research and generates a detailed report.
- **Input Schema**: Defined in [`src/mastra/workflows/research-report-workflow.ts`](src/mastra/workflows/research-report-workflow.ts:14-18).
  - `topic`: The research topic.
  - `researchDepth`: Depth of the research.
  - `outputFormat`: Desired format of the final report.
- **Output Schema**: Defined in [`src/mastra/workflows/research-report-workflow.ts`](src/mastra/workflows/research-report-workflow.ts:21-31).
  - `originalTopic`: The original research topic.
  - `researchSummary`: A summary of the conducted research.
  - `analysisReport`: The detailed analysis report.
  - `finalReport`: The comprehensive final report.
  - `reportQualityScore`: Quality score of the final report.
  - `reportFeedback`: Feedback on the quality of the final report.
  - `researchDataFile`: Filename where raw research data is stored.
  - `finalReportFile`: Filename where the final report is stored.
  - `researchConfidence`: Confidence score of the research findings.
  - `researchMethodology`: Methodology used for the research.
- **Workflow Steps**:
    1. **`conduct-research`** ([`src/mastra/workflows/research-report-workflow.ts`](src/mastra/workflows/research-report-workflow.ts:39-73)): Conducts comprehensive research on the topic using the `Research Agent`.
    2. **`store-raw-research-data`** ([`src/mastra/workflows/research-report-workflow.ts`](src/mastra/workflows/research-report-workflow.ts:79-112)): Stores the raw research findings using the `Data Agent`.
    3. **`analyze-research-data`** ([`src/mastra/workflows/research-report-workflow.ts`](src/mastra/workflows/research-report-workflow.ts:118-161)): Analyzes the research findings using the `Analyzer Agent`.
    4. **`generate-final-report`** ([`src/mastra/workflows/research-report-workflow.ts`](src/mastra/workflows/research-report-workflow.ts:167-211)): Generates the comprehensive final report using the `Master Agent`.
    5. **`quality-check-report`** ([`src/mastra/workflows/research-report-workflow.ts`](src/mastra/workflows/research-report-workflow.ts:217-256)): Performs a quality check on the final report using the `Supervisor Agent`.
    6. **`store-final-report`** ([`src/mastra/workflows/research-report-workflow.ts`](src/mastra/workflows/research-report-workflow.ts:262-293)): Stores the final generated report using the `Data Agent`.
- **Agents Involved**: `researchAgent`, `analyzerAgent`, `dataAgent`, `masterAgent`, `supervisorAgent`.
- **Key Functionality**: Provides an end-to-end pipeline for generating high-quality research reports, from data collection to final output and quality assurance.

### 6. vNext Workflow (`vnext-workflow.ts`)

- **ID**: `dean-machines-vnext`
- **Description**: An advanced agent network workflow designed to orchestrate tasks across specialized agents and workflows. It supports both single and complex task execution.
- **Input Schema**: Not explicitly defined as a top-level schema in the workflow file, but tasks are typically passed as strings.
- **Output Schema**: Not explicitly defined as a top-level schema in the workflow file, but returns results of agent network operations.
- **Agents Involved**: `masterAgent`, `supervisorAgent`, `researchAgent`, `analyzerAgent`, `synthesisAgent` (a custom agent defined within the workflow).
- **Workflows Involved**: `weatherWorkflow`.
- **Key Functions**:
  - **`vNextSingleTask(task, options)`** ([`src/mastra/workflows/vnext-workflow.ts`](src/mastra/workflows/vnext-workflow.ts:254-284)): Executes a single task through the vNext network.
  - **`vNextComplexTask(task, options)`** ([`src/mastra/workflows/vnext-workflow.ts`](src/mastra/workflows/vnext-workflow.ts:287-317)): Executes a complex task through the vNext network, potentially involving iterative processing.
  - **`vNextWorkflow(task, options)`** ([`src/mastra/workflows/vnext-workflow.ts`](src/mastra/workflows/vnext-workflow.ts:320-337)): Main function to route tasks to either single or complex execution based on the `isComplex` option.
- **Key Functionality**: Acts as a meta-orchestrator, dynamically routing tasks to the most appropriate agent or sub-workflow within the vNext network. It is designed for flexible and scalable task execution.

### 7. Weather Workflow (`weather-workflow.ts`)

- **ID**: `weather-workflow`
- **Description**: A simple workflow to fetch weather forecasts for a given city and suggest activities based on the weather conditions.
- **Input Schema**: Defined in [`src/mastra/workflows/weather-workflow.ts`](src/mastra/workflows/weather-workflow.ts:38-41).
  - `city`: The city to get the weather for.
- **Output Schema**: Defined in [`src/mastra/workflows/weather-workflow.ts`](src/mastra/workflows/weather-workflow.ts:42-45).
  - `activities`: A string containing suggested activities.
- **Workflow Steps**:
    1. **`fetch-weather`** ([`src/mastra/workflows/weather-workflow.ts`](src/mastra/workflows/weather-workflow.ts:48-99)): Fetches weather forecast data using the Open-Meteo API.
    2. **`plan-activities`** ([`src/mastra/workflows/weather-workflow.ts`](src/mastra/workflows/weather-workflow.ts:101-190)): Suggests activities based on the fetched weather conditions, utilizing the `weatherAgent`.
- **Agents Involved**: `weatherAgent` (implicitly through `mastra.getAgent('weatherAgent')`).
- **Key Functionality**: Provides a straightforward example of how to chain tool calls and agent interactions to achieve a specific, user-facing outcome.

## Integration with Mastra Core

Workflows are defined using the `@mastra/core/workflows` framework, which provides `createWorkflow` and `createStep` functions. This allows for a clear, sequential definition of tasks and their execution order. Workflows can integrate various agents and tools, enabling complex, multi-stage operations.
