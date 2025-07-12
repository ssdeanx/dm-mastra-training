
# Gemini Context

This document provides Gemini with a comprehensive overview of the Mastra Training Framework project, ensuring it can offer informed and contextually relevant assistance.

## 1. Project Overview

The Mastra Training Framework is a sophisticated, modular, and scalable system for building and orchestrating intelligent, autonomous multi-agent AI systems. It is designed to tackle complex problems by distributing tasks to specialized agents, each equipped with a granular suite of tools. The framework supports adaptive workflows, seamless integration with external APIs and databases, and fully autonomous processes.

**Core Principles:**

*   **Modularity:** Complex problems are broken down into manageable, interchangeable components (Agents, Tools, Workflows).
*   **Scalability:** The architecture is designed to grow from proof-of-concept to enterprise-grade deployments.
*   **Specialization:** Agents are designed with specific roles and equipped with the precise tools needed for their tasks, promoting efficiency and expertise.
*   **Orchestration:** A multi-layered system of Networks and Supervisor agents routes tasks, coordinates actions, and ensures quality.
*   **Adaptability:** The system is dynamic, capable of self-optimization, and leverages advanced memory systems for continuous learning.

## 2. System Architecture

The framework is built on a multi-agent architecture orchestrated by one or more Agent Networks. This design allows for both simple, direct agent invocations and complex, multi-step, multi-agent workflows.

### 2.1. Agent Network (`base-network.ts`, `vnext-workflow.ts`)

The `AgentNetwork` is the central nervous system. It receives a task and, using an LLM-based routing mechanism, determines the most appropriate agent or sequence of agents to fulfill the request. The network considers task complexity, domain, and user-defined runtime context to make intelligent routing decisions.

*   **`baseNetwork`**: The primary network that coordinates the main set of specialized agents.
*   **`vNextNetwork`**: A next-generation network implementation that introduces more advanced features, including the use of `LibSQL` for memory, demonstrating the framework's evolving capabilities.

### 2.2. Agents (`src/mastra/agents/`)

Each agent is a specialized worker with a clear role, defined instructions, and a curated set of tools. Key agents include:

*   **`MasterAgent`**: The primary problem-solver and debugging assistant. It has a broad toolset and acts as a generalist and coordinator.
*   **`SupervisorAgent`**: The quality assurance and orchestration specialist. It plans workflows, delegates tasks to other agents, and reviews their outputs for quality and accuracy.
*   **`AnalyzerAgent`**: A data analysis expert. It processes complex datasets, identifies patterns, and generates structured insights.
*   **`ResearchAgent`**: Specializes in information retrieval, using a wide array of search and scraping tools to gather and synthesize information.
*   **`DataAgent`**: Securely manages file operations within the `./data/` directory, handling reading, writing, and listing of data files.
*   **`GenerationAgent`**: A content creation specialist, capable of generating text, code, and other creative outputs.
*   **`LangGraphAgent`**: Manages complex, stateful workflows using graph-based reasoning.
*   **`ChanceAgent`**: A specialist in decision-making under uncertainty, using stochastic tools and risk assessment.
*   **`MappingAgent`**: Transforms data from one schema or format to another.

### 2.3. Workflows (`src/mastra/workflows/`)

Workflows are pre-defined, multi-step processes that chain together agents and tools to accomplish complex tasks. This allows for the automation of repeatable, sophisticated operations.

*   **`research-analysis-workflow.ts`**: A comprehensive workflow that uses the `ResearchAgent` to gather data, the `AnalyzerAgent` to interpret it, and the `SupervisorAgent` to plan and review the process.
*   **`inngest-multi-agent-workflow.ts`**: Demonstrates the integration of Inngest for event-driven, durable, and potentially long-running workflows that orchestrate multiple agents.
*   **`agent-performance-workflow.ts`**: A meta-workflow designed to monitor, analyze, and recommend optimizations for other agents.

## 3. Data and Memory Pipeline (RAG)

The framework features a robust Retrieval-Augmented Generation (RAG) pipeline for ingesting, storing, and retrieving information.

### 3.1. Ingestion (`chunker-tool.ts`)

*   The `chunkerTool` is the entry point for data ingestion. It can process various document formats (Markdown, HTML, JSON, etc.), split them into manageable chunks using different strategies (recursive, semantic), and extract metadata.

### 3.2. Embedding and Storage (`googleProvider.ts`, `upstashMemory.ts`)

*   **Embedding**: The `createGeminiEmbeddingModel` function in `googleProvider.ts` is used to create vector embeddings for the text chunks. The system primarily uses `text-embedding-004`.
*   **Storage**: The `upstashMemory` module utilizes Upstash Redis for key-value storage and Upstash Vector for efficient vector storage and retrieval. The `vNextNetwork` demonstrates the ability to swap this backend for `LibSQL`.

### 3.3. Retrieval (`vectorQueryTool.ts`, `graphRAG.ts`)

The system supports multiple retrieval strategies:

*   **Vector Search**: The `vectorQueryTool` and `hybridVectorSearchTool` provide powerful semantic and metadata-filtered search capabilities directly against the Upstash vector store.
*   **Graph RAG**: The `graphRAGTool` and `graphRAGQueryTool` enable a more advanced retrieval method where relationships between data chunks are modeled as a graph, allowing for the discovery of deeper, more contextual insights.

### 3.4. Memory Processing (`upstashMemory.ts`)

To ensure the context provided to the LLMs is relevant and efficient, the `upstashMemory` instance is equipped with a series of advanced processors:

*   **`AttentionGuidedMemoryProcessor`**: Scores and prunes messages based on semantic importance.
*   **`ContextualRelevanceProcessor`**: Maintains topic continuity.
*   **`WorkflowAwareMemoryProcessor`**: Adjusts context based on the current stage of a workflow.
*   **`BiasMitigationProcessor`**: Identifies and mitigates potential biases in the data.

## 4. Core Technologies & Configuration

*   **Runtime**: Node.js with TypeScript.
*   **AI Provider**: Google Gemini, specifically the `gemini-2.5` series, configured in `googleProvider.ts`.
*   **Memory**: Upstash (Redis/Vector) is the primary memory store, with `LibSQL` used in the `vNext` network. `Mem0` is also available as a tool.
*   **Workflows**: Inngest for event-driven workflows, and native Mastra workflows.
*   **Search & Data APIs**: A rich toolset including Brave Search, Tavily, Diffbot, Arxiv, Hacker News, Reddit, and more.
*   **Environment**: Configuration is managed via `.env` files, validated by `zod` in `environment.ts`. Key variables include API keys for `GOOGLE_GENERATIVE_AI_API_KEY`, `UPSTASH_*`, `FIRECRAWL_API_KEY`, `DIFFBOT_API_KEY`, etc.

## 5. Commands

*   `npm run dev`: Starts the development server with hot-reloading.
*   `npm run build`: Compiles the project.
*   `npm run start`: Runs the compiled project.
*   `npx ts-node src/mastra/workflows/your-workflow.ts`: Executes a specific workflow directly.
