# Mastra Core Overview

This document provides an overview of the core `src/mastra/` directory, which serves as the main entry point and central configuration hub for the Mastra application.

## Directory Structure

The `src/mastra/` directory organizes the main components of the Mastra application:

```txt
src/mastra/
├── agents/
├── config/
├── index.ts
├── inngest/
├── networks/
├── processor-extra.ts
├── tools/
├── upstashMemory.ts
└── workflows/
```

## Core Components

### 1. Main Application Instance (`index.ts`)

The [`src/mastra/index.ts`](src/mastra/index.ts) file initializes and exports the main `Mastra` application instance. This instance is the central orchestrator, bringing together various components to form the complete AI system.

- **`mastra` instance**: Initialized at [`src/mastra/index.ts`](src/mastra/index.ts:11).
  - **Workflows**: Integrates defined workflows, such as `weatherWorkflow` and `researchAnalysisWorkflow`.
  - **vNext Networks**: Includes advanced network configurations like `dean-machines-vnext`.
  - **Networks**: Incorporates base networks like `baseNetwork` for agent coordination.
  - **Agents**: Registers all available agents via `agentRegistry`.
  - **Logger**: Configured with `PinoLogger` for structured logging based on environment settings.
  - **Telemetry**: Enabled for AI service, with `LangfuseExporter` for custom tracing and monitoring.
  - **Server Middleware**: Defines middleware functions for various agents (Weather, Master, Research) to log runtime context.
  - **Port**: Configured to run on a specified port from environment variables.

### 2. Agents (`agents/`)

The `agents/` subdirectory contains the definitions and implementations of all specialized AI agents within the Mastra ecosystem. These agents are designed to perform specific tasks, from data analysis to research and problem-solving.

- **Central Registry**: The [`src/mastra/agents/index.ts`](src/mastra/agents/index.ts) file acts as a barrel file, exporting all agents and their associated runtime context types.
- **Key Agents**: Includes `masterAgent`, `analyzerAgent`, `supervisorAgent`, `weatherAgent`, `researchAgent`, `dataAgent`, and `langGraphAgent`.
- **Documentation**: Detailed documentation for each agent can be found in [`docs/AGENTS_README.md`](docs/AGENTS_README.md).

### 3. Workflows (`workflows/`)

The `workflows/` subdirectory defines multi-step processes that orchestrate interactions between various agents and tools to achieve complex, high-level objectives.

- **Examples**: Includes `weatherWorkflow`, `researchAnalysisWorkflow`, `researchReportWorkflow`, `documentAnalysisWorkflow`, `agentPerformanceWorkflow`, `inngestMultiAgentWorkflow`, and `vNextWorkflow`.
- **Documentation**: Detailed documentation for each workflow can be found in [`docs/WORKFLOWS_README.md`](docs/WORKFLOWS_README.md).

### 4. Tools (`tools/`)

The `tools/` subdirectory contains implementations of various tools that extend the capabilities of Mastra agents. These tools allow agents to interact with external services, manage data, and perform specialized operations.

- **Central Export**: The [`src/mastra/tools/index.ts`](src/mastra/tools/index.ts) file exports all available tools.
- **Examples**: Includes tools for web search, data management, Git operations, weather information, financial data, and more.
- **Documentation**: Detailed documentation for each tool can be found in [`docs/TOOLS_README.md`](docs/TOOLS_README.md).

### 5. Networks (`networks/`)

The `networks/` subdirectory defines agent networks, which are responsible for coordinating multiple agents to solve complex problems.

- **Base Network**: The [`src/mastra/networks/base-network.ts`](src/mastra/networks/base-network.ts) file defines the `baseNetwork`, a comprehensive agent network that uses LLM-based dynamic routing to coordinate specialized agents.
- **Documentation**: Detailed documentation for networks can be found in [`docs/NETWORKS_README.md`](docs/NETWORKS_README.md).

### 6. Inngest (`inngest/`)

The `inngest/` subdirectory contains the Inngest client setup and functions for building robust, distributed, and fault-tolerant workflows, enabling event-driven orchestration.

- **Key Features**:
  - **`inngest` instance**: Initialized in [`src/mastra/inngest/index.ts`](src/mastra/inngest/index.ts) for event-driven functions.
  - **Middleware**: Includes `realtimeMiddleware` for real-time updates.
  - **Local Functions**: Configured for local development.
- **Documentation**: More details can be found in the Inngest setup section of the main `README.md` and related workflow files.

### 7. Processor Extra (`processor-extra.ts`)

The [`src/mastra/processor-extra.ts`](src/mastra/processor-extra.ts) file extends core memory processing capabilities, allowing for custom message processing and metadata handling within the memory system.

- **Key Features**:
  - `ExtendedMemoryProcessor`: Demonstrates how to extend the base `MemoryProcessor` to add custom logic, such as logging message metadata during processing.
  - Integrates with `PinoLogger` for detailed logging of processing steps.
- **Purpose**: Provides a flexible mechanism for adding custom, application-specific processing logic to memory operations without modifying core framework code.

### 8. Upstash Memory (`upstashMemory.ts`)

The [`src/mastra/upstashMemory.ts`](src/mastra/upstashMemory.ts) file provides the core memory management system for Mastra agents, leveraging Upstash Redis and Upstash Vector for distributed storage and semantic search.

- **Key Features**:
  - **UpstashStore**: Used for distributed Redis storage.
  - **UpstashVector**: Used for semantic search with cloud-based vectors.
  - **Memory Processors**: Includes `AttentionGuidedMemoryProcessor`, `ContextualRelevanceProcessor`, `WorkflowAwareMemoryProcessor`, and `BiasMitigationProcessor` for optimizing memory usage and context retention, and mitigating biases.
  - **Vector Operations**: Provides functions for creating, upserting, querying, updating, and deleting vector indexes and data.
  - **Environment Validation**: Ensures necessary Upstash environment variables are configured.
  - **LibSQL Integration**: The `vNextWorkflow` uses `LibSQLStore` and `LibSQLVector` for its memory, demonstrating an alternative persistent memory solution tailored for embedded databases.

## Overall Architecture

The `src/mastra/` directory represents a modular and extensible architecture for building intelligent AI applications. By separating agents, workflows, tools, and networks into distinct modules, the system promotes reusability, maintainability, and scalability. The central `Mastra` instance acts as the glue, integrating these components into a cohesive and powerful platform.
