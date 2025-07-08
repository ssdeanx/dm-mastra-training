# Mastra Agents Overview

This document provides an overview of the agents available within the `src/mastra/agents/` directory. These agents are specialized AI entities designed to perform specific tasks and collaborate within the Mastra ecosystem.

## Directory Structure

The `src/mastra/agents/` directory contains individual agent implementations, each typically residing in its own file. The `index.ts` file serves as a central registry for all agents.

```txt
src/mastra/agents/
├── analyzer-agent.ts
├── data-agent.ts
├── index.ts
├── langgraph-agent.ts
├── master-agent.ts
├── research-agent.ts
├── supervisor-agent.ts
└── weather-agent.ts
```

## Agent Categories and Examples

Mastra agents are categorized by their primary domain expertise and function:

### 1. Core Agents

These agents form the foundational intelligence and orchestration layer of the Mastra platform.

- **Master Agent (`master-agent.ts`)**
  - **Description**: Primary debugging and problem-solving assistant. It is a highly capable AI assistant designed to handle complex problem-solving tasks across various domains. It integrates advanced capabilities such as graph-based knowledge retrieval, vector similarity search, file system operations, Git repository management, and real-time data access.
  - **Runtime Context (`MasterAgentRuntimeContext`)**: Defined in [`src/mastra/agents/master-agent.ts`](src/mastra/agents/master-agent.ts:29-40). Includes `user-id`, `session-id`, `project-context`, `model-version`, `model-provider`, `plan-mode`, `tasks`, `actions`, `tool-selection`, and `debug-mode`.
  - **Key Schemas**:
    - `masterAgentInputSchema` ([`src/mastra/agents/master-agent.ts`](src/mastra/agents/master-agent.ts:52-57)): Validates input queries and context.
    - `masterAgentOutputSchema` ([`src/mastra/agents/master-agent.ts`](src/mastra/agents/master-agent.ts:59-65)): Validates agent responses, actions, and tools used.
    - `masterAgentConfigSchema` ([`src/mastra/agents/master-agent.ts`](src/mastra/agents/master-agent.ts:71-89)): Validates agent configuration.
  - **Dependencies**: `upstashMemory`, various tools (GraphRAG, Mem0, Chunker, Vector Query, Weather, Stock, Brave Search, Tavily, Code Search, Web Scraper, Git Operations), `@mastra/evals/nlp` metrics.

- **Supervisor Agent (`supervisor-agent.ts`)**
  - **Description**: Agent for orchestration, coordination, and quality control. Specializes in managing multi-agent workflows and ensuring optimal task distribution.
  - **Runtime Context (`SupervisorAgentRuntimeContext`)**: Defined in [`src/mastra/agents/supervisor-agent.ts`](src/mastra/agents/supervisor-agent.ts:16-24). Includes `user-id`, `session-id`, `agent-count`, `coordination-strategy`, `qa-level`, `delegation-level`, and `escalation-threshold`.
  - **Key Schemas**:
    - `supervisorAgentInputSchema` ([`src/mastra/agents/supervisor-agent.ts`](src/mastra/agents/supervisor-agent.ts:33-39)): Validates tasks, priority, agents, deadline, and requirements.
    - `supervisorAgentOutputSchema` ([`src/mastra/agents/supervisor-agent.ts`](src/mastra/agents/supervisor-agent.ts:45-55)): Validates operation results, delegations, quality score, and recommendations.
    - `supervisorAgentConfigSchema` ([`src/mastra/agents/supervisor-agent.ts`](src/mastra/agents/supervisor-agent.ts:61-78)): Validates agent configuration.
  - **Dependencies**: `upstashMemory`, `vectorQueryTool`, `hybridVectorSearchTool`, `chunkerTool`, `graphRAGTool`, `graphRAGUpsertTool`, `createBraveSearchTool`, `createTavilySearchTool`.

- **LangGraph Agent (`langgraph-agent.ts`)**
  - **Description**: Advanced multi-step reasoning and workflow orchestration. Leverages LangGraph to create sophisticated multi-step workflows that can handle complex reasoning tasks, state management, and iterative processing.
  - **Runtime Context (`LangGraphAgentRuntimeContext`)**: Defined in [`src/mastra/agents/langgraph-agent.ts`](src/mastra/agents/langgraph-agent.ts:35-44). Includes `user-id`, `session-id`, `workflow-mode`, `reasoning-depth`, `step-tracking`, `max-iterations`, `domain-focus`, and `output-format`.
  - **Key Functions**:
    - `createLangGraphWorkflow` ([`src/mastra/agents/langgraph-agent.ts`](src/mastra/agents/langgraph-agent.ts:224)): Creates comprehensive LangGraph workflows.
    - `createLangGraphChat` ([`src/mastra/agents/langgraph-agent.ts`](src/mastra/agents/langgraph-agent.ts:283)): Creates conversational LangGraph workflows.
  - **Dependencies**: `upstashMemory`, `createMastraLangGraphWorkflow`, `createMastraLangGraphChat`, various tools (GraphRAG, Vector Query, Chunker, Diffbot, Brave Search, Tavily).

### 2. Domain-Specific Agents

These agents are specialized for particular domains or types of tasks.

- **Analyzer Agent (`analyzer-agent.ts`)**
  - **Description**: Data analysis, processing, and insights generation. Specializes in data manipulation, statistical analysis, and visualization.
  - **Runtime Context (`AnalyzerAgentRuntimeContext`)**: Defined in [`src/mastra/agents/analyzer-agent.ts`](src/mastra/agents/analyzer-agent.ts:17-34). Includes `user-id`, `session-id`, `analysis-type`, `data-source`, `data-depth`, `visualization`, `speed-accuracy`, and `domain-context`.
  - **Key Schemas**:
    - `analyzerAgentInputSchema` ([`src/mastra/agents/analyzer-agent.ts`](src/mastra/agents/analyzer-agent.ts:40-46)): Validates analysis queries and data.
    - `analyzerAgentOutputSchema` ([`src/mastra/agents/analyzer-agent.ts`](src/mastra/agents/analyzer-agent.ts:48-55)): Validates analysis results and recommendations.
    - `analyzerAgentConfigSchema` ([`src/mastra/agents/analyzer-agent.ts`](src/mastra/agents/analyzer-agent.ts:61-78)): Validates agent configuration.
  - **Dependencies**: `upstashMemory`, `vectorQueryTool`, `chunkerTool`, `createBraveSearchTool`, `createTavilySearchTool`, `webScraperTool`, `gitOperationsTool`.

- **Data Agent (`data-agent.ts`)**
  - **Description**: Secure file and directory operations in the `data/` folder. Handles reading, writing, deleting, and listing files with audit logging and robust validation.
  - **Runtime Context (`DataAgentRuntimeContext`)**: Defined in [`src/mastra/agents/data-agent.ts`](src/mastra/agents/data-agent.ts:35-44). Includes `user-id`, `session-id`, `mode`, and `data-dir`.
  - **Key Schemas**:
    - `dataAgentInputSchema` ([`src/mastra/agents/data-agent.ts`](src/mastra/agents/data-agent.ts:55-59)): Validates data operations (read, write, delete, list).
    - `dataAgentOutputSchema` ([`src/mastra/agents/data-agent.ts`](src/mastra/agents/data-agent.ts:67-71)): Validates operation success, messages, and data.
  - **Dependencies**: `upstashMemory`, `readDataFileTool`, `writeDataFileTool`, `deleteDataFileTool`, `listDataDirTool`, `chunkerTool`, `graphRAGQueryTool`, `graphRAGTool`, `graphRAGUpsertTool`, `vectorQueryTool`, `hybridVectorSearchTool`, `diffbotAnalyzeUrlTool`, `diffbotExtractArticleFromUrlTool`, `diffbotEnhanceKnowledgeGraphTool`, `diffbotSearchKnowledgeGraphTool`, `diffbotEnhanceEntityTool`.

- **Research Agent (`research-agent.ts`)**
  - **Description**: Information gathering, analysis, and knowledge synthesis. Specializes in comprehensive research, fact-checking, and insight generation.
  - **Runtime Context (`ResearchAgentRuntimeContext`)**: Defined in [`src/mastra/agents/research-agent.ts`](src/mastra/agents/research-agent.ts:19-36). Includes `user-id`, `session-id`, `research-depth`, `source-types`, `max-sources`, `include-academic`, `language-filter`, and `focus-area`.
  - **Key Schemas**:
    - `researchAgentInputSchema` ([`src/mastra/agents/research-agent.ts`](src/mastra/agents/research-agent.ts:41-46)): Validates research queries and parameters.
    - `researchAgentOutputSchema` ([`src/mastra/agents/research-agent.ts`](src/mastra/agents/research-agent.ts:48-53)): Validates research findings, sources, confidence, and methodology.
    - `researchAgentConfigSchema` ([`src/mastra/agents/research-agent.ts`](src/mastra/agents/research-agent.ts:59-77)): Validates agent configuration.
  - **Dependencies**: `upstashMemory`, `graphRAGTool`, `vectorQueryTool`, `chunkerTool`, `createBraveSearchTool`, `createTavilySearchTool`, `diffbotAnalyzeUrlTool`, `diffbotExtractArticleFromUrlTool`, `diffbotEnhanceKnowledgeGraphTool`, `diffbotSearchKnowledgeGraphTool`, `diffbotEnhanceEntityTool`, `codeSearchTool`, `webScraperTool`, `gitOperationsTool`.

- **Weather Agent (`weather-agent.ts`)**
  - **Description**: Provides accurate weather information. Specializes in retrieving current weather conditions, forecasts, and alerts for various locations.
  - **Runtime Context (`WeatherAgentRuntimeContext`)**: Defined in [`src/mastra/agents/weather-agent.ts`](src/mastra/agents/weather-agent.ts:21-36). Includes `user-id`, `session-id`, `temperature-unit`, `default-location`, `extended-forecast`, `include-alerts`, and `timezone`.
  - **Dependencies**: `upstashMemory`, `weatherTool`, `chunkerTool`, `vectorQueryTool`, `hybridVectorSearchTool`, `graphRAGTool`, `graphRAGUpsertTool`, `createBraveSearchTool`, `createTavilySearchTool`.

## Agent Registry and Management

The `src/mastra/agents/index.ts` file provides a centralized registry for all agents, enabling easy access and management:

- **`agentRegistry`** ([`src/mastra/agents/index.ts`](src/mastra/agents/index.ts:46-60)): An object mapping agent names to their instances.
- **`agentCategories`** ([`src/mastra/agents/index.ts`](src/mastra/agents/index.ts:67-75)): Defines categories for organized access (e.g., `core`, `development`, `data`).
- **`getAgent(agentName)`** ([`src/mastra/agents/index.ts`](src/mastra/agents/index.ts:82-84)): Retrieves an agent instance by name.
- **`getAgentsByCategory(category)`** ([`src/mastra/agents/index.ts`](src/mastra/agents/index.ts:87-89)): Retrieves all agents within a specified category.
- **`getAllAgentNames()`** ([`src/mastra/agents/index.ts`](src/mastra/agents/index.ts:96-98)): Returns a list of all available agent names.
- **`hasAgent(agentName)`** ([`src/mastra/agents/index.ts`](src/mastra/agents/index.ts:105-107)): Checks if an agent exists in the registry.
- **`agentMetadata`** ([`src/mastra/agents/index.ts`](src/mastra/agents/index.ts:115-147)): Provides descriptions and tags for each agent, useful for documentation and dynamic agent selection.

## Integration with Mastra Core

Agents are built using the `@mastra/core/agent` framework, which provides a consistent structure for defining their `name`, `instructions`, `model`, `tools`, `memory`, and `evals`. This modular design allows for flexible agent development and integration into larger workflows and networks.
