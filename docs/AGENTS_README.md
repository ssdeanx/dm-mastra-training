# Mastra Agents Overview

This document provides an overview of the agents available within the `src/mastra/agents/` directory. These agents are specialized AI entities designed to perform specific tasks and collaborate within the Mastra ecosystem.

## Directory Structure

The `src/mastra/agents/` directory contains individual agent implementations, each typically residing in its own file. The `index.ts` file serves as a central registry for all agents.

```txt
src/mastra/agents/
├── analyzer-agent.ts
├── chance-agent.ts
├── data-agent.ts
├── generation-agent.ts
├── index.ts
├── langgraph-agent.ts
├── mapping-agent.ts
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
  - **Runtime Context (`MasterAgentRuntimeContext`)**: Defined in [`src/mastra/agents/master-agent.ts`](src/mastra/agents/master-agent.ts:31-42). Includes `user-id`, `session-id`, `project-context`, `model-version`, `model-provider`, `plan-mode`, `tasks`, `actions`, `tool-selection`, and `debug-mode`.
  - **Key Schemas**:
    - `masterAgentInputSchema` ([`src/mastra/agents/master-agent.ts`](src/mastra/agents/master-agent.ts:54-59)): Validates input queries and context.
    - `masterAgentOutputSchema` ([`src/mastra/agents/master-agent.ts`](src/mastra/agents/master-agent.ts:61-67)): Validates agent responses, actions, and tools used.
    - `masterAgentConfigSchema` ([`src/mastra/agents/master-agent.ts`](src/mastra/agents/master-agent.ts:73-91)): Validates agent configuration.
  - **Dependencies**: `upstashMemory`, `createGemini25Provider`, `PinoLogger`, `graphRAGTool`, `graphRAGQueryTool`, `graphRAGUpsertTool`, `mem0RememberTool`, `mem0MemorizeTool`, `weatherTool`, `stockPriceTool`, `historicalStockPriceTool`, `stockNewsTool`, `earningsCalendarTool`, `sportsOddsTool`, `historicalOddsTool`, `listSportsTool`, `listBookmakersTool`, `cryptoPriceTool`, `historicalCryptoPriceTool`, `cryptoMarketDataTool`, `listCryptoCoinsTool`, `chunkerTool`, `vectorQueryTool`, `hybridVectorSearchTool`, `createBraveSearchTool`, `createTavilySearchTool`, `codeSearchTool`, `webScraperTool`, `gitOperationsTool`, various `@mastra/evals/nlp` metrics.

- **Supervisor Agent (`supervisor-agent.ts`)**
  - **Description**: Agent for orchestration, coordination, and quality control. Specializes in managing multi-agent workflows and ensuring optimal task distribution.
  - **Runtime Context (`SupervisorAgentRuntimeContext`)**: Defined in [`src/mastra/agents/supervisor-agent.ts`](src/mastra/agents/supervisor-agent.ts:16-24). Includes `user-id`, `session-id`, `agent-count`, `coordination-strategy`, `qa-level`, `delegation-level`, and `escalation-threshold`.
  - **Key Schemas**:
    - `supervisorAgentInputSchema` ([`src/mastra/agents/supervisor-agent.ts`](src/mastra/agents/supervisor-agent.ts:33-39)): Validates tasks, priority, agents, deadline, and requirements.
    - `supervisorAgentOutputSchema` ([`src/mastra/agents/supervisor-agent.ts`](src/mastra/agents/supervisor-agent.ts:45-55)): Validates operation results, delegations, quality score, and recommendations.
    - `supervisorAgentConfigSchema` ([`src/mastra/agents/supervisor-agent.ts`](src/mastra/agents/supervisor-agent.ts:61-78)): Validates agent configuration.
  - **Dependencies**: `upstashMemory`, `createGemini25Provider`, `PinoLogger`, `vectorQueryTool`, `chunkerTool`, `graphRAGTool`, `createBraveSearchTool`, `createTavilySearchTool`, `stockPriceTool`, `historicalStockPriceTool`, `stockNewsTool`, `earningsCalendarTool`, `sportsOddsTool`, `historicalOddsTool`, `listSportsTool`, `listBookmakersTool`, `cryptoPriceTool`, `historicalCryptoPriceTool`, `cryptoMarketDataTool`, `listCryptoCoinsTool`.

- **LangGraph Agent (`langgraph-agent.ts`)**
  - **Description**: Advanced multi-step reasoning and workflow orchestration. Leverages LangGraph to create sophisticated multi-step workflows that can handle complex reasoning tasks, state management, and iterative processing.
  - **Runtime Context (`LangGraphAgentRuntimeContext`)**: Defined in [`src/mastra/agents/langgraph-agent.ts`](src/mastra/agents/langgraph-agent.ts:38-47). Includes `user-id`, `session-id`, `workflow-mode`, `reasoning-depth`, `step-tracking`, `max-iterations`, `domain-focus`, and `output-format`.
  - **Key Functions**:
    - `createLangGraphWorkflow` ([`src/mastra/agents/langgraph-agent.ts`](src/mastra/agents/langgraph-agent.ts:213)): Creates comprehensive LangGraph workflows.
    - `createLangGraphChat` ([`src/mastra/agents/langgraph-agent.ts`](src/mastra/agents/langgraph-agent.ts:281)): Creates conversational LangGraph workflows.
  - **Dependencies**: `upstashMemory`, `createGemini25Provider`, `PinoLogger`, `createMastraLangGraphWorkflow`, `createMastraLangGraphChat`, `graphRAGTool`, `vectorQueryTool`, `chunkerTool`, `diffbotAnalyzeUrlTool`, `diffbotEnhanceEntityTool`, `diffbotEnhanceKnowledgeGraphTool`, `diffbotExtractArticleFromUrlTool`, `diffbotSearchKnowledgeGraphTool`, `stockPriceTool`, `historicalStockPriceTool`, `stockNewsTool`, `earningsCalendarTool`, `sportsOddsTool`, `historicalOddsTool`, `listSportsTool`, `listBookmakersTool`, `cryptoPriceTool`, `historicalCryptoPriceTool`, `cryptoMarketDataTool`, `listCryptoCoinsTool`, `createBraveSearchTool`, `createTavilySearchTool`.

### 2. Domain-Specific Agents

These agents are specialized for particular domains or types of tasks.

- **Analyzer Agent (`analyzer-agent.ts`)**
  - **Description**: Data analysis, processing, and insights generation. Specializes in data manipulation, statistical analysis, and visualization.
  - **Runtime Context (`AnalyzerAgentRuntimeContext`)**: Defined in [`src/mastra/agents/analyzer-agent.ts`](src/mastra/agents/analyzer-agent.ts:17-46). Includes `user-id`, `session-id`, `analysis-type`, `data-source`, `data-depth`, `visualization`, `speed-accuracy`, `domain-context`, `input-confidence`, `bias-mitigation-enabled`, `low-confidence-strategy`, `financial-market-focus`, `sports-league-preference`, and `crypto-asset-focus`.
  - **Key Schemas**:
    - `analyzerAgentInputSchema` ([`src/mastra/agents/analyzer-agent.ts`](src/mastra/agents/analyzer-agent.ts:53-71)): Validates analysis queries and data.
    - `analyzerAgentOutputSchema` ([`src/mastra/agents/analyzer-agent.ts`](src/mastra/agents/analyzer-agent.ts:73-80)): Validates analysis results and recommendations.
    - `analyzerAgentConfigSchema` ([`src/mastra/agents/analyzer-agent.ts`](src/mastra/agents/analyzer-agent.ts:86-119)): Validates agent configuration.
  - **Dependencies**: `upstashMemory`, `PinoLogger`, `createGemini25Provider`, `vectorQueryTool`, `hybridVectorSearchTool`, `chunkerTool`, `graphRAGTool`, `graphRAGQueryTool`, `graphRAGUpsertTool`, `rerankTool`, `createBraveSearchTool`, `createTavilySearchTool`, `webScraperTool`, `gitOperationsTool`, `diffbotAnalyzeUrlTool`, `diffbotExtractArticleFromUrlTool`, `diffbotEnhanceKnowledgeGraphTool`, `diffbotSearchKnowledgeGraphTool`, `diffbotEnhanceEntityTool`, `arxivSearch`, `redditGetSubredditPosts`, `hackerNewsGetBestStories`, `hackerNewsGetSearchUser`, `hackerNewsSearchItems`, `hackerNewsGetSearchTopStories`, `hackerNewsGetSearchItem`, `hackerNewsGetItem`, `hackerNewsGetTopStories`, `hackerNewsGetNewStories`, `collaborativeReasoningTool`, `decisionFrameworkTool`, `metacognitiveMonitoringTool`, `scientificMethodTool`, `stockPriceTool`, `historicalStockPriceTool`, `stockNewsTool`, `earningsCalendarTool`, `sportsOddsTool`, `historicalOddsTool`, `listSportsTool`, `listBookmakersTool`, `cryptoPriceTool`, `historicalCryptoPriceTool`, `cryptoMarketDataTool`, `listCryptoCoinsTool`, `listDataDirTool`, `readDataFileTool`, `writeDataFileTool`, `deleteDataFileTool`.

- **Data Agent (`data-agent.ts`)**
  - **Description**: Secure file and directory operations in the `data/` folder. Handles reading, writing, deleting, and listing files with audit logging and robust validation.
  - **Runtime Context (`DataAgentRuntimeContext`)**: Defined in [`src/mastra/agents/data-agent.ts`](src/mastra/agents/data-agent.ts:48-57). Includes `user-id`, `session-id`, `mode`, and `data-dir`.
  - **Key Schemas**:
    - `dataAgentInputSchema` ([`src/mastra/agents/data-agent.ts`](src/mastra/agents/data-agent.ts:68-72)): Validates data operations (read, write, delete, list).
    - `dataAgentOutputSchema` ([`src/mastra/agents/data-agent.ts`](src/mastra/agents/data-agent.ts:80-84)): Validates operation success, messages, and data.
  - **Dependencies**: `upstashMemory`, `PinoLogger`, `createGemini25Provider`, `readDataFileTool`, `writeDataFileTool`, `deleteDataFileTool`, `listDataDirTool`, `chunkerTool`, `graphRAGTool`, `vectorQueryTool`, `diffbotAnalyzeUrlTool`, `diffbotExtractArticleFromUrlTool`, `diffbotEnhanceEntityTool`, `diffbotSearchKnowledgeGraphTool`, `diffbotEnhanceKnowledgeGraphTool`, `hackerNewsGetBestStories`, `hackerNewsGetSearchTopStories`, `arxivSearch`, `redditGetSubredditPosts`, `stockPriceTool`, `historicalStockPriceTool`, `stockNewsTool`, `earningsCalendarTool`, `sportsOddsTool`, `historicalOddsTool`, `listSportsTool`, `listBookmakersTool`, `cryptoPriceTool`, `historicalCryptoPriceTool`, `cryptoMarketDataTool`, `listCryptoCoinsTool`.

- **Research Agent (`research-agent.ts`)**
  - **Description**: Information gathering, analysis, and knowledge synthesis. Specializes in comprehensive research, fact-checking, and insight generation.
  - **Runtime Context (`ResearchAgentRuntimeContext`)**: Defined in [`src/mastra/agents/research-agent.ts`](src/mastra/agents/research-agent.ts:20-49). Includes `user-id`, `session-id`, `research-depth`, `source-types`, `max-sources`, `include-academic`, `language-filter`, `focus-area`, `input-confidence`, `bias-mitigation-enabled`, `low-confidence-strategy`, `financial-market-focus`, `sports-league-preference`, and `crypto-asset-focus`.
  - **Key Schemas**:
    - `researchAgentInputSchema` ([`src/mastra/agents/research-agent.ts`](src/mastra/agents/research-agent.ts:54-59)): Validates research queries and parameters.
    - `researchAgentOutputSchema` ([`src/mastra/agents/research-agent.ts`](src/mastra/agents/research-agent.ts:61-66)): Validates research findings, sources, confidence, and methodology.
    - `researchAgentConfigSchema` ([`src/mastra/agents/research-agent.ts`](src/mastra/agents/research-agent.ts:72-105)): Validates agent configuration.
  - **Dependencies**: `upstashMemory`, `PinoLogger`, `createGemini25Provider`, `graphRAGTool`, `vectorQueryTool`, `chunkerTool`, `createBraveSearchTool`, `createTavilySearchTool`, `diffbotAnalyzeUrlTool`, `diffbotExtractArticleFromUrlTool`, `diffbotEnhanceKnowledgeGraphTool`, `diffbotSearchKnowledgeGraphTool`, `diffbotEnhanceEntityTool`, `codeSearchTool`, `webScraperTool`, `gitOperationsTool`, `stockPriceTool`, `historicalStockPriceTool`, `stockNewsTool`, `earningsCalendarTool`, `sportsOddsTool`, `historicalOddsTool`, `listSportsTool`, `listBookmakersTool`, `cryptoPriceTool`, `historicalCryptoPriceTool`, `cryptoMarketDataTool`, `listCryptoCoinsTool`.

- **Weather Agent (`weather-agent.ts`)**
  - **Description**: Provides accurate weather information. Specializes in retrieving current weather conditions, forecasts, and alerts for various locations.
  - **Runtime Context (`WeatherAgentRuntimeContext`)**: Defined in [`src/mastra/agents/weather-agent.ts`](src/mastra/agents/weather-agent.ts:21-36). Includes `user-id`, `session-id`, `temperature-unit`, `default-location`, `extended-forecast`, `include-alerts`, and `timezone`.
  - **Dependencies**: `upstashMemory`, `PinoLogger`, `createGemini25Provider`, `weatherTool`, `chunkerTool`, `vectorQueryTool`, `graphRAGTool`, `createBraveSearchTool`, `createTavilySearchTool`, `stockPriceTool`, `historicalStockPriceTool`, `stockNewsTool`, `earningsCalendarTool`, `sportsOddsTool`, `historicalOddsTool`, `listSportsTool`, `listBookmakersTool`, `cryptoPriceTool`, `historicalCryptoPriceTool`, `cryptoMarketDataTool`, `listCryptoCoinsTool`.

- **Chance Agent (`chance-agent.ts`)**
  - **Description**: Agent for decision-making under uncertainty, balancing exploration and exploitation. It assesses probabilities, manages risk, and adapts strategies based on outcomes.
  - **Runtime Context (`ChanceAgentRuntimeContext`)**: Defined in [`src/mastra/agents/chance-agent.ts`](src/mastra/agents/chance-agent.ts:72-97). Includes `user-id`, `session-id`, `decision-type`, `risk-tolerance`, `exploration-exploitation-balance`, `outcome-feedback-mechanism`, `confidence-threshold`, `bias-awareness-enabled`, `domain-context`, `financial-market-focus`, `sports-league-preference`, and `crypto-asset-focus`.
  - **Key Schemas**:
    - `chanceAgentInputSchema` ([`src/mastra/agents/chance-agent.ts`](src/mastra/agents/chance-agent.ts:104-121)): Validates decision problems, options, and context.
    - `chanceAgentOutputSchema` ([`src/mastra/agents/chance-agent.ts`](src/mastra/agents/chance-agent.ts:129-136)): Validates chosen decisions, rationales, and outcomes.
    - `chanceAgentConfigSchema` ([`src/mastra/agents/chance-agent.ts`](src/mastra/agents/chance-agent.ts:143-163)): Validates agent configuration.
  - **Dependencies**: `upstashMemory`, `PinoLogger`, `createGemini25Provider`, `vectorQueryTool`, `hybridVectorSearchTool`, `createBraveSearchTool`, `createTavilySearchTool`, `webScraperTool`, `gitOperationsTool`, `diffbotAnalyzeUrlTool`, `diffbotExtractArticleFromUrlTool`, `diffbotEnhanceKnowledgeGraphTool`, `diffbotSearchKnowledgeGraphTool`, `diffbotEnhanceEntityTool`, `arxivSearch`, `redditGetSubredditPosts`, `hackerNewsGetBestStories`, `hackerNewsGetSearchUser`, `hackerNewsSearchItems`, `hackerNewsGetSearchTopStories`, `hackerNewsGetSearchItem`, `hackerNewsGetItem`, `hackerNewsGetTopStories`, `hackerNewsGetNewStories`, `graphRAGTool`, `graphRAGQueryTool`, `graphRAGUpsertTool`, `rerankTool`, `listDataDirTool`, `readDataFileTool`, `writeDataFileTool`, `deleteDataFileTool`, `mem0RememberTool`, `mem0MemorizeTool`, `stockPriceTool`, `weatherTool`, `stochasticAlgorithmTool`, `structuredArgumentationTool`, `sequentialThinkingTool`, `mentalModelTool`, `debuggingApproachTool`, `collaborativeReasoningTool`, `decisionFrameworkTool`, `metacognitiveMonitoringTool`, `visualReasoningTool`, `scientificMethodTool`, `historicalStockPriceTool`, `stockNewsTool`, `earningsCalendarTool`, `sportsOddsTool`, `historicalOddsTool`, `listSportsTool`, `listBookmakersTool`, `cryptoPriceTool`, `historicalCryptoPriceTool`, `cryptoMarketDataTool`, `listCryptoCoinsTool`, `chunkerTool`.

- **Mapping Agent (`mapping-agent.ts`)**
  - **Description**: Specializes in transforming data from one format or schema to another. It ensures data integrity, handles various data types, and provides detailed mapping reports.
  - **Runtime Context (`MappingAgentRuntimeContext`)**: Defined in [`src/mastra/agents/mapping-agent.ts`](src/mastra/agents/mapping-agent.ts:61-81). Includes `user-id`, `session-id`, `source-data-format`, `target-data-format`, `mapping-strategy`, `validation-level`, `error-handling-strategy`, `visualization-enabled`, and `domain-context`.
  - **Key Schemas**:
    - `mappingAgentInputSchema` ([`src/mastra/agents/mapping-agent.ts`](src/mastra/agents/mapping-agent.ts:88-104)): Validates source data, target schema, and mapping instructions.
    - `mappingAgentOutputSchema` ([`src/mastra/agents/mapping-agent.ts`](src/mastra/agents/mapping-agent.ts:112-124)): Validates mapped data, mapping report, and success status.
    - `mappingAgentConfigSchema` ([`src/mastra/agents/mapping-agent.ts`](src/mastra/agents/mapping-agent.ts:131-148)): Validates agent configuration.
  - **Dependencies**: `upstashMemory`, `PinoLogger`, `createGemini25Provider`, `vectorQueryTool`, `hybridVectorSearchTool`, `createBraveSearchTool`, `createTavilySearchTool`, `webScraperTool`, `gitOperationsTool`, `diffbotAnalyzeUrlTool`, `diffbotExtractArticleFromUrlTool`, `diffbotEnhanceKnowledgeGraphTool`, `diffbotSearchKnowledgeGraphTool`, `diffbotEnhanceEntityTool`, `arxivSearch`, `redditGetSubredditPosts`, `hackerNewsGetBestStories`, `hackerNewsGetSearchUser`, `hackerNewsSearchItems`, `hackerNewsGetSearchTopStories`, `hackerNewsGetSearchItem`, `hackerNewsGetItem`, `hackerNewsGetTopStories`, `hackerNewsGetNewStories`, `graphRAGTool`, `graphRAGQueryTool`, `graphRAGUpsertTool`, `rerankTool`, `listDataDirTool`, `readDataFileTool`, `writeDataFileTool`, `deleteDataFileTool`, `mem0RememberTool`, `mem0MemorizeTool`, `stockPriceTool`, `weatherTool`, `historicalStockPriceTool`, `stockNewsTool`, `earningsCalendarTool`, `sportsOddsTool`, `historicalOddsTool`, `listSportsTool`, `listBookmakersTool`, `cryptoPriceTool`, `historicalCryptoPriceTool`, `cryptoMarketDataTool`, `listCryptoCoinsTool`, `chunkerTool`.

- **Generation Agent (`generation-agent.ts`)**
  - **Description**: Specializes in creating diverse content (text, code, prompts, reports, summaries) based on prompts and context. It adapts generation style and output format to meet specific requirements.
  - **Runtime Context (`GenerationAgentRuntimeContext`)**: Defined in [`src/mastra/agents/generation-agent.ts`](src/mastra/agents/generation-agent.ts:75-96). Includes `user-id`, `session-id`, `content-type`, `generation-style`, `output-format`, `detail-level`, `fact-check-enabled`, `domain-context`, `target-audience`, and `keywords`.
  - **Key Schemas**:
    - `generationAgentInputSchema` ([`src/mastra/agents/generation-agent.ts`](src/mastra/agents/generation-agent.ts:103-117)): Validates prompts and generation parameters.
    - `generationAgentOutputSchema` ([`src/mastra/agents/generation-agent.ts`](src/mastra/agents/generation-agent.ts:125-132)): Validates generated content details.
    - `generationAgentConfigSchema` ([`src/mastra/agents/generation-agent.ts`](src/mastra/agents/generation-agent.ts:139-156)): Validates agent configuration.
  - **Dependencies**: `upstashMemory`, `PinoLogger`, `createGemini25Provider`, `vectorQueryTool`, `hybridVectorSearchTool`, `createBraveSearchTool`, `createTavilySearchTool`, `webScraperTool`, `gitOperationsTool`, `diffbotAnalyzeUrlTool`, `diffbotExtractArticleFromUrlTool`, `diffbotEnhanceKnowledgeGraphTool`, `diffbotSearchKnowledgeGraphTool`, `diffbotEnhanceEntityTool`, `arxivSearch`, `redditGetSubredditPosts`, `hackerNewsGetBestStories`, `hackerNewsGetSearchUser`, `hackerNewsSearchItems`, `hackerNewsGetSearchTopStories`, `hackerNewsGetSearchItem`, `hackerNewsGetItem`, `hackerNewsGetTopStories`, `hackerNewsGetNewStories`, `graphRAGTool`, `graphRAGQueryTool`, `graphRAGUpsertTool`, `rerankTool`, `listDataDirTool`, `readDataFileTool`, `writeDataFileTool`, `deleteDataFileTool`, `mem0RememberTool`, `mem0MemorizeTool`, `stockPriceTool`, `weatherTool`, `stochasticAlgorithmTool`, `structuredArgumentationTool`, `sequentialThinkingTool`, `mentalModelTool`, `debuggingApproachTool`, `collaborativeReasoningTool`, `decisionFrameworkTool`, `metacognitiveMonitoringTool`, `visualReasoningTool`, `scientificMethodTool`, `historicalStockPriceTool`, `stockNewsTool`, `earningsCalendarTool`, `sportsOddsTool`, `historicalOddsTool`, `listSportsTool`, `listBookmakersTool`, `cryptoPriceTool`, `historicalCryptoPriceTool`, `cryptoMarketDataTool`, `listCryptoCoinsTool`, `chunkerTool`, `createFreestyleTool`.

## Agent Registry and Management

The `src/mastra/agents/index.ts` file provides a centralized registry for all agents, enabling easy access and management:

- **`agentRegistry`** ([`src/mastra/agents/index.ts`](src/mastra/agents/index.ts:56-70)): An object mapping agent names to their instances.
- **`agentCategories`** ([`src/mastra/agents/index.ts`](src/mastra/agents/index.ts:77-85)): Defines categories for organized access (e.g., `core`, `development`, `data`, `creative`, `specialized`).
- **`getAgent(agentName)`** ([`src/mastra/agents/index.ts`](src/mastra/agents/index.ts:92-94)): Retrieves an agent instance by name.
- **`getAgentsByCategory(category)`** ([`src/mastra/agents/index.ts`](src/mastra/agents/index.ts:97-99)): Retrieves all agents within a specified category.
- **`getAllAgentNames()`** ([`src/mastra/agents/index.ts`](src/mastra/agents/index.ts:106-108)): Returns a list of all available agent names.
- **`hasAgent(agentName)`** ([`src/mastra/agents/index.ts`](src/mastra/agents/index.ts:115-117)): Checks if an agent exists in the registry.
- **`agentMetadata`** ([`src/mastra/agents/index.ts`](src/mastra/agents/index.ts:125-171)): Provides descriptions and tags for each agent, useful for documentation and dynamic agent selection.

## Integration with Mastra Core

Agents are built using the `@mastra/core/agent` framework, which provides a consistent structure for defining their `name`, `instructions`, `model`, `tools`, `memory`, and `evals`. This modular design allows for flexible agent development and integration into larger workflows and networks.
