# Mastra Workflows Overview

This document provides an overview of the workflows available within the `src/mastra/workflows/` directory. These workflows define multi-step processes that orchestrate various agents and tools to achieve complex goals.

## Directory Structure

The `src/mastra/workflows/` directory contains individual workflow implementations, each typically residing in its own file.

```txt
src/mastra/workflows/
├── research-analysis-workflow.ts
├── vnext-workflow.ts
└── weather-workflow.ts
```

## Workflow Examples

### 1. Research Analysis Workflow (`research-analysis-workflow.ts`)

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

### 2. vNext Workflow (`vnext-workflow.ts`)

- **ID**: `dean-machines-vnext`
- **Description**: An advanced agent network workflow designed to orchestrate tasks across specialized agents and workflows. It supports both single and complex task execution.
- **Agents Involved**: `masterAgent`, `supervisorAgent`, `researchAgent`, `analyzerAgent`, `synthesisAgent`.
- **Workflows Involved**: `weatherWorkflow`.
- **Key Functions**:
  - **`vNextSingleTask(task, options)`** ([`src/mastra/workflows/vnext-workflow.ts`](src/mastra/workflows/vnext-workflow.ts:102-107)): Executes a single task through the vNext network.
  - **`vNextComplexTask(task, options)`** ([`src/mastra/workflows/vnext-workflow.ts`](src/mastra/workflows/vnext-workflow.ts:110-115)): Executes a complex task through the vNext network, potentially involving iterative processing.
  - **`vNextWorkflow(task, options)`** ([`src/mastra/workflows/vnext-workflow.ts`](src/mastra/workflows/vnext-workflow.ts:122-137)): Main function to route tasks to either single or complex execution based on the `isComplex` option.
- **Key Functionality**: Acts as a meta-orchestrator, dynamically routing tasks to the most appropriate agent or sub-workflow within the vNext network. It is designed for flexible and scalable task execution.

### 3. Weather Workflow (`weather-workflow.ts`)

- **ID**: `weather-workflow`
- **Description**: A simple workflow to fetch weather forecasts for a given city and suggest activities based on the weather conditions.
- **Input Schema**: Defined in [`src/mastra/workflows/weather-workflow.ts`](src/mastra/workflows/weather-workflow.ts:171-174).
  - `city`: The city to get the weather for.
- **Output Schema**: Defined in [`src/mastra/workflows/weather-workflow.ts`](src/mastra/workflows/weather-workflow.ts:175-178).
  - `activities`: A string containing suggested activities.
- **Workflow Steps**:
    1. **`fetch-weather`** ([`src/mastra/workflows/weather-workflow.ts`](src/mastra/workflows/weather-workflow.ts:35-87)): Fetches weather forecast data using the Open-Meteo API.
    2. **`plan-activities`** ([`src/mastra/workflows/weather-workflow.ts`](src/mastra/workflows/weather-workflow.ts:89-168)): Suggests activities based on the fetched weather conditions, utilizing the `weatherAgent`.
- **Agents Involved**: `weatherAgent` (implicitly through `mastra.getAgent('weatherAgent')`).
- **Key Functionality**: Provides a straightforward example of how to chain tool calls and agent interactions to achieve a specific, user-facing outcome.

## Integration with Mastra Core

Workflows are defined using the `@mastra/core/workflows` framework, which provides `createWorkflow` and `createStep` functions. This allows for a clear, sequential definition of tasks and their execution order. Workflows can integrate various agents and tools, enabling complex, multi-stage operations.
