# Mastra Tools Overview

This document provides an overview of the tools available within the `src/mastra/tools/` directory. These tools are designed to extend the capabilities of Mastra agents, allowing them to interact with external services, manage data, and perform specialized operations.

## Directory Structure

The `src/mastra/tools/` directory contains individual tool implementations, each typically residing in its own file. Some tools may be grouped into subdirectories based on their functionality (e.g., `agentic/`).

```txt
src/mastra/tools/
├── agentic/
│   ├── google-docs-client.ts
│   ├── paginate.ts
│   ├── utils.ts
│   └── wikidata-client.ts
├── brave-search.ts
├── chunker-tool.ts
├── code-search-tool.ts
├── data-file-manager.ts
├── diffbot-client.ts
├── firecrawl-tools.ts
├── git-operations-tool.ts
├── graphRAG.ts
├── index.ts
├── mem0-tool.ts
├── rerank-tool.ts
├── stock-tools.ts
├── tavily.ts
├── vectorQueryTool.ts
├── weather-tool.ts
└── web-scraper-tool.ts
```

## Tool Categories and Examples

The tools can be broadly categorized by their primary function:

### 1. Search and Information Retrieval

These tools enable agents to search the web and retrieve information from various sources.

- **Brave Search Tool (`brave-search.ts`)**: Performs web searches using the Brave Search API.
  - **ID**: `brave-search`
  - **Description**: Fetches search results based on a given query.
- **Tavily Search Tool (`tavily.ts`)**: Performs web searches using the Tavily API.
  - **ID**: `tavily-search`
  - **Description**: Provides relevant search results for a given query.
- **Code Search Tool (`code-search-tool.ts`)**: Performs regex-based searches across project files.
  - **ID**: `code-search`
  - **Description**: Locates code snippets matching specific patterns within the codebase.
- **Web Scraper Tool (`web-scraper-tool.ts`)**: Extracts structured data from web pages.
  - **ID**: `web-scraper`
  - **Description**: Scrapes content from URLs using CSS selectors.

### 2. Data Management and Processing

These tools handle data manipulation, storage, and retrieval, often integrating with external services.

- **Chunker Tool (`chunker-tool.ts`)**: Advanced document chunking tool.
  - **ID**: `comprehensive_chunker`
  - **Description**: Breaks down large documents into smaller, manageable chunks for processing and indexing.
- **Data File Manager Tools (`data-file-manager.ts`)**: Provides secure file and directory operations within the `data/` folder.
  - **IDs**: `read-data-file`, `write-data-file`, `delete-data-file`, `list-data-directory`
  - **Description**: Allows agents to read, write, delete, and list files, ensuring controlled access to local data.
- **Mem0 Tools (`mem0-tool.ts`)**: Integrates with the Mem0 memory service for saving and retrieving agent memories.
  - **IDs**: `Mem0-remember`, `Mem0-memorize`
  - **Description**: Enables agents to store and recall information across sessions.
- **Vector Query Tools (`vectorQueryTool.ts`)**: Facilitates semantic search and hybrid filtering in vector stores.
  - **IDs**: `vector_query`, `hybrid_vector_query`
  - **Description**: Queries vector databases for similar content based on embeddings and metadata.

### 3. External Service Integrations

These tools connect Mastra agents to various external APIs and services.

- **Diffbot Client Tools (`diffbot-client.ts`)**: Integrates with Diffbot for web scraping and knowledge graph operations.
  - **IDs**: `diffbot-analyze-url`, `diffbot-extract-article-from-url`, `diffbot-enhance-entity`, `diffbot-search-knowledge-graph`, `diffbot-enhance-knowledge-graph`
  - **Description**: Provides capabilities for extracting structured data from web pages and interacting with Diffbot's Knowledge Graph.
- **Firecrawl Tools (`firecrawl-tools.ts`)**: Integrates with Firecrawl for web crawling and content extraction.
  - **IDs**: `firecrawl_crawl`, `firecrawl_extract`, `firecrawl_get_crawl_status`, `firecrawl_cancel_crawl`, `firecrawl_map_urls`
  - **Description**: Enables comprehensive website crawling and content extraction.
- **Stock Tools (`stock-tools.ts`)**: Fetches real-time stock prices and thread information.
  - **IDs**: `getStockPrice`, `getThreadInfo`
  - **Description**: Provides financial data and context about the current conversation thread.
- **Weather Tool (`weather-tool.ts`)**: Retrieves current weather conditions for a given location.
  - **ID**: `get-weather`
  - **Description**: Offers weather forecasts and conditions, with support for temperature scale preferences.
- **Wikidata Tools (`agentic/wikidata-client.ts`)**: Interacts with the Wikidata knowledge base.
  - **ID**: `wikidata-search`
  - **Description**: Allows agents to query and retrieve structured data from Wikidata.

### 4. Development and System Operations

These tools assist with code management and system-level tasks.

- **Git Operations Tool (`git-operations-tool.ts`)**: Performs Git operations on local repositories or interacts with the GitHub API.
  - **ID**: `git-operations`
  - **Description**: Enables agents to manage code, create pull requests, and track issues.

### 5. Graph-based RAG

- **GraphRAG Tools (`graphRAG.ts`)**: Implements GraphRAG for complex document relationships and patterns.
  - **IDs**: `graph_rag_upsert`, `graph_rag_query`
  - **Description**: Facilitates the upserting of documents into a graph-based RAG system and querying it for relevant information.
- **Rerank Tool (`rerank-tool.ts`)**: Reranks search results based on relevance.
  - **ID**: `rerank`
  - **Description**: Improves the quality of retrieved information by reordering results using advanced scoring.

## How Tools are Integrated

All tools are exposed through the `src/mastra/tools/index.ts` barrel file, making them easily importable and accessible to Mastra agents. Agents are configured with a specific set of tools, which they can then invoke based on their instructions and the user's query. The `createTool` function from `@mastra/core/tools` is used to define each tool, ensuring a consistent interface for input, output, and execution logic.

This modular approach allows for easy expansion of agent capabilities by simply adding new tools or enhancing existing ones.
