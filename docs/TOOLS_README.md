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
├── arxiv-client.ts
├── brave-search.ts
├── chunker-tool.ts
├── clear-thought-native-tools.ts
├── code-search-tool.ts
├── crypto-tool.ts
├── data-file-manager.ts
├── diffbot-client.ts
├── firecrawl-tools.ts
├── freestyle-executor.ts
├── git-operations-tool.ts
├── graphRAG.ts
├── hacker-news-client.ts
├── index.ts
├── mem0-tool.ts
├── nango.ts
├── reddit.ts
├── rerank-tool.ts
├── sports-odds-tool.ts
├── stochastic-native-tools.ts
├── stock-tools.ts
├── tavily.ts
├── vectorQueryTool.ts
├── weather-tool.ts
├── web-scraper-tool.ts
└── wikidata-client.ts
```

## Tool Categories and Examples

The tools can be broadly categorized by their primary function:

### 1. Data File Management

These tools provide secure file and directory operations within the `data/` folder.

- **Data File Manager Tools (`data-file-manager.ts`)**:
  - **IDs**: `read-data-file`, `write-data-file`, `delete-data-file`, `list-data-directory`
  - **Description**: Allows agents to read, write, delete, and list files, ensuring controlled access to local data.

### 2. Web Search & Information Retrieval

These tools enable agents to search the web and retrieve information from various sources.

- **Brave Search Tool (`brave-search.ts`)**: Performs web searches using the Brave Search API.
  - **ID**: `brave-search`
  - **Description**: Fetches search results based on a given query.
- **Tavily Search Tool (`tavily.ts`)**: Performs web searches using the Tavily API.
  - **ID**: `tavily-search`
  - **Description**: Provides relevant search results for a given query.
- **Wikidata Tools (`wikidata-client.ts`)**: Interacts with the Wikidata knowledge base.
  - **IDs**: `wikidata-get-entity-by-id`, `wikidata-get-entities-by-ids`
  - **Description**: Allows agents to query and retrieve structured data from Wikidata.
- **Firecrawl Tools (`firecrawl-tools.ts`)**: Integrates with Firecrawl for web crawling and content extraction.
  - **IDs**: `firecrawl_crawl`, `firecrawl_extract`, `firecrawl_get_crawl_status`, `firecrawl_cancel_crawl`, `firecrawl_map_urls`
  - **Description**: Enables comprehensive website crawling and content extraction.
- **Web Scraper Tool (`web-scraper-tool.ts`)**: Extracts structured data from web pages.
  - **ID**: `web-scraper`
  - **Description**: Scrapes content from URLs using CSS selectors.
- **Arxiv Client Tools (`arxiv-client.ts`)**: Searches for research articles published on arXiv.
  - **ID**: `arxiv-search`
  - **Description**: Fetches academic papers and preprints.
- **Hacker News Client Tools (`hacker-news-client.ts`)**: Fetches data from Hacker News.
  - **IDs**: `hacker-news-get-search-item`, `hacker-news-get-search-user`, `hacker-news-search-items`, `hacker-news-get-search-top-stories`, `hacker-news-get-item`, `hacker-news-get-top-stories`, `hacker-news-get-new-stories`, `hacker-news-get-best-stories`
  - **Description**: Provides access to Hacker News stories, comments, and user data.
- **Reddit Client Tools (`reddit.ts`)**: Fetches posts from Reddit subreddits.
  - **ID**: `reddit-get-subreddit-posts`
  - **Description**: Retrieves posts from specified subreddits.

### 3. Code Analysis & Development Operations

These tools assist with code management, analysis, and system-level tasks.

- **Code Search Tool (`code-search-tool.ts`)**: Performs regex-based searches across project files.
  - **ID**: `code-search`
  - **Description**: Locates code snippets matching specific patterns within the codebase.
- **Git Operations Tool (`git-operations-tool.ts`)**: Performs Git operations on local repositories or interacts with the GitHub API.
  - **ID**: `git-operations`
  - **Description**: Enables agents to manage code, create pull requests, and track issues.
- **Freestyle Executor Tool (`freestyle-executor.ts`)**: Provides a serverless code execution environment.
  - **ID**: `freestyle-executor`
  - **Description**: Allows agents to execute arbitrary code snippets in a sandboxed environment.

### 4. Financial & Sports Data

These tools provide access to real-time and historical financial and sports information.

- **Crypto Tools (`crypto-tool.ts`)**: Fetches cryptocurrency prices and market data.
  - **IDs**: `cryptoPriceTool`, `historicalCryptoPriceTool`, `cryptoMarketDataTool`, `listCryptoCoinsTool`
  - **Description**: Provides current and historical cryptocurrency data.
- **Stock Tools (`stock-tools.ts`)**: Fetches real-time stock prices, historical data, news, and earnings calendar.
  - **IDs**: `getStockPrice`, `historicalStockPrice`, `stockNews`, `earningsCalendar`, `companyOverview`
  - **Description**: Provides comprehensive stock market data.
- **Sports Odds Tools (`sports-odds-tool.ts`)**: Fetches sports odds and event information.
  - **IDs**: `get-sports-odds`, `get-historical-odds`, `list-sports`, `list-bookmakers`
  - **Description**: Provides access to sports betting odds and related data.

### 5. Memory & Vector Operations

These tools handle data manipulation, storage, and retrieval, often integrating with external services.

- **Chunker Tool (`chunker-tool.ts`)**: Advanced document chunking tool.
  - **ID**: `comprehensive_chunker`
  - **Description**: Breaks down large documents into smaller, manageable chunks for processing and indexing.
- **Mem0 Tools (`mem0-tool.ts`)**: Integrates with the Mem0 memory service for saving and retrieving agent memories.
  - **IDs**: `Mem0-remember`, `Mem0-memorize`
  - **Description**: Enables agents to store and recall information across sessions.
- **Vector Query Tools (`vectorQueryTool.ts`)**: Facilitates semantic search and hybrid filtering in vector stores.
  - **IDs**: `vector_query`, `hybrid_vector_query`
  - **Description**: Queries vector databases for similar content based on embeddings and metadata.
- **GraphRAG Tools (`graphRAG.ts`)**: Implements GraphRAG for complex document relationships and patterns.
  - **IDs**: `graph_rag_upsert`, `graph_rag_query`
  - **Description**: Facilitates the upserting of documents into a graph-based RAG system and querying it for relevant information.
- **Rerank Tool (`rerank-tool.ts`)**: Reranks search results based on relevance.
  - **ID**: `rerank`
  - **Description**: Improves the quality of retrieved information by reordering results using advanced scoring.

### 6. Cognitive Frameworks

Native tools for clear thought processes and stochastic algorithms, enhancing agent reasoning.

- **Clear Thought Native Tools (`clear-thought-native-tools.ts`)**: Provides structured thinking frameworks.
  - **IDs**: `sequential-thinking-native`, `mental-model-native`, `debugging-approach-native`, `collaborative-reasoning-native`, `decision-framework-native`, `metacognitive-monitoring-native`, `scientific-method-native`, `structured-argumentation-native`, `visual-reasoning-native`
  - **Description**: Offers tools for various cognitive processes like sequential thinking, mental models, debugging, collaborative reasoning, and scientific method application.
- **Stochastic Native Tools (`stochastic-native-tools.ts`)**: Applies stochastic algorithms for decision-making under uncertainty.
  - **ID**: `stochastic-algorithm-native`
  - **Description**: Implements algorithms like MDP, MCTS, Bandit, Bayesian, and HMM for complex decision problems.

### 7. Miscellaneous Tools

General utilities and integrations.

- **Nango Tools (`nango.ts`)**: Provides utilities for Nango integration, handling OAuth connections.
  - **IDs**: `getNango`, `validateNangoConnectionOAuthScopes`
  - **Description**: Manages secure third-party service integrations.
- **Weather Tool (`weather-tool.ts`)**: Retrieves current weather conditions, alerts, and forecasts.
  - **IDs**: `get-weather`, `get-weather-alerts`, `get-hourly-weather-forecast`, `get-weather-history`
  - **Description**: Offers comprehensive weather information.

## How Tools are Integrated

All tools are exposed through the [`src/mastra/tools/index.ts`](src/mastra/tools/index.ts) barrel file, making them easily importable and accessible to Mastra agents. Agents are configured with a specific set of tools, which they can then invoke based on their instructions and the user's query. The `createTool` function from `@mastra/core/tools` is used to define each tool, ensuring a consistent interface for input, output, and execution logic.

This modular approach allows for easy expansion of agent capabilities by simply adding new tools or enhancing existing ones.
