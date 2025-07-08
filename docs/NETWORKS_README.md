# Mastra Networks Overview

This document provides an overview of the agent networks available within the `src/mastra/networks/` directory. Agent networks are responsible for coordinating multiple agents to solve complex problems, often employing intelligent routing and collaboration strategies.

## Directory Structure

The `src/mastra/networks/` directory currently contains the `base-network.ts` file.

```txt
src/mastra/networks/
└── base-network.ts
```

## Network Examples

### 1. Base Network (`base-network.ts`)

- **ID**: `baseNetwork` (as exported in `src/mastra/index.ts`)
- **Description**: A comprehensive agent network designed for the Dean Machines RSC platform. It coordinates multiple specialized agents (currently listed as 17+ in the code comments, though fewer are explicitly imported) using LLM-based dynamic routing to determine which agent(s) to call based on task requirements.
- **Runtime Context (`BaseNetworkRuntimeContext`)**: Defined in [`src/mastra/networks/base-network.ts`](src/mastra/networks/base-network.ts:46-59). This context provides dynamic configuration for network execution behavior and agent selection, including:
  - `user-id`, `session-id`
  - `task-complexity`: (`simple`, `moderate`, `complex`, `advanced`, `enterprise`)
  - `execution-mode`: (`single-agent`, `multi-agent`, `collaborative`, `autonomous`, `hybrid`, `intelligent`)
  - `priority-level`: (`low`, `normal`, `high`, `urgent`, `critical`)
  - `domain-context`
  - `preferred-agents`, `max-agents`
  - `routing-strategy`: (`auto`, `manual`, `hybrid`, `intelligent`)
  - `debug-mode`, `trace-execution`
  - `response-format`: (`detailed`, `concise`, `technical`, `business`)
- **Instructions**: The network's instructions ([`src/mastra/networks/base-network.ts`](src/mastra/networks/base-network.ts:80-155)) detail its role as a coordinator, its access to specialized agents, and intelligent routing guidelines based on task complexity, execution modes, domain-specific routing, user preferences, priority handling, and response formats.
- **Model**: Uses `gemini-2.5-flash-lite-preview-06-17` for its underlying LLM, configured with a thinking budget and text response modalities.
- **Agents Included**:
  - Core coordination agents: `masterAgent`, `langGraphAgent`, `supervisorAgent`.
  - Development agents: `researchAgent`, `weatherAgent`, `analyzerAgent`.
- **Key Functions**:
  - **`executeDeanMachinesTask(messages, options)`** ([`src/mastra/networks/base-network.ts`](src/mastra/networks/base-network.ts:200-244)): Executes a task through the `baseNetwork`, handling logging and error management.
  - **`getNetworkAgents()`** ([`src/mastra/networks/base-network.ts`](src/mastra/networks/base-network.ts:259-267)): Provides information about the agents available within this network.
- **Key Functionality**: The `baseNetwork` acts as an intelligent router and orchestrator, dynamically selecting and coordinating the most appropriate agents to handle incoming tasks based on a rich set of contextual parameters. It is designed for flexible and scalable problem-solving across various domains.

## Integration with Mastra Core

Agent networks are built using the `@mastra/core/network` framework, specifically the `AgentNetwork` class. This framework allows for the definition of network-level instructions, the integration of various agents and workflows, and the use of a shared memory system. Networks are crucial for enabling complex, multi-agent collaborations and for abstracting the underlying agent orchestration logic from higher-level applications.
