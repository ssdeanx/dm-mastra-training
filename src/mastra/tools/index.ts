/**
 * @file Mastra Tools Barrel File Index
 * @version 2.0.1
 * @description This file exports all tools available in the Mastra system, organized by category.
 * @Copyright 2025 Deanmachines
 * @since 2025-07-09
 * @name Tools Index or Barrel File
 * @alias tools
 *
 * The tools are grouped into categories such as Data File Management, Web Search, Social Media & News,
 * Academic & Research, Code Analysis & Scraping, Diffbot Integration, Financial Data, Sports, Vector & RAG,
 * Weather, Cognitive Frameworks, Miscellaneous and Runtime Context Types.
 * Each category contains tools that provide specific functionalities, such as reading/writing data files,
 * performing web searches, interacting with social media platforms, retrieving academic papers, analyzing code,
 * and more.
 * This modular approach allows for easy extension and maintenance of the toolset,
 * enabling developers to add new tools or modify existing ones without affecting the overall structure.
 * @module Mastra Tools
 * @license MIT
 * @author Deanmachines
 * @see {@link https://github.com/ssdeanx/dm-mastra-training|GitHub Repository}
 * @see {@link https://mastra.ai|Mastra Documentation}
 * @see {@link https://mastra.ai/docs/tools|Mastra Tools Documentation}
 * @see {@link https://mastra.ai/docs/runtime-context|Mastra Runtime Context Documentation}
 */

/**
 * @category Data File Management
 * @description Tools to read, write, delete and list data files in the Mastra system.
 */
export {
  readDataFileTool,
  writeDataFileTool,
  deleteDataFileTool,
  listDataDirTool
} from './data-file-manager';

/**
 * @category Web Search
 * @description Tools to perform web-based searches via BraveSearch, Tavily and Wikidata.
 */
export { createBraveSearchTool } from './brave-search';
export { createTavilySearchTool } from './tavily';
export { wikidataTools } from './wikidata-client';

/**
 * @category Social Media & News
 * @description Clients and helpers for Reddit and Hacker News integrations.
 */
export { createRedditClient, redditGetSubredditPosts } from './reddit';
export {
  createHackerNewsClient,
  hackerNewsGetSearchItem,
  hackerNewsGetSearchUser,
  hackerNewsSearchItems,
  hackerNewsGetSearchTopStories,
  hackerNewsGetItem,
  hackerNewsGetTopStories,
  hackerNewsGetNewStories,
  hackerNewsGetBestStories
} from './hacker-news-client';

/**
 * @category Academic & Research
 * @description Tools for interacting with arXiv for paper search and retrieval.
 */
export { createArxivClient, arxivSearch } from './arxiv-client';

/**
 * @category Code Analysis & Scraping
 * @description Utilities for code search, web scraping and Git operations.
 */
export { codeSearchTool } from './code-search-tool';
export { webScraperTool } from './web-scraper-tool';
export { gitOperationsTool } from './git-operations-tool';

/**
 * @category Diffbot Integration
 * @description Tools for analyzing and extracting content via Diffbot APIs.
 */
export {
  diffbotAnalyzeUrlTool,
  diffbotExtractArticleFromUrlTool,
  diffbotEnhanceEntityTool,
  diffbotSearchKnowledgeGraphTool,
  diffbotEnhanceKnowledgeGraphTool,
  createDiffbotClient
} from './diffbot-client';

/**
 * @category Financial Data
 * @description Tools for retrieving crypto prices, market data and stock information.
 */
export {
  cryptoPriceTool,
  historicalCryptoPriceTool,
  cryptoMarketDataTool,
  listCryptoCoinsTool
} from './crypto-tool';
export { cryptoRuntimeContext } from './crypto-tool';
export {
  stockPriceTool,
  historicalStockPriceTool,
  stockNewsTool,
  earningsCalendarTool
} from './stock-tools';

/**
 * @category Sports
 * @description Tools to fetch sports odds, bookmakers list and historic odds data.
 */
export {
  sportsOddsTool,
  listSportsTool,
  listBookmakersTool,
  historicalOddsTool
} from './sports-odds-tool';

/**
 * @category Vector & RAG
 * @description Tools for vector-based retrieval, chunking and graph RAG workflows.
 */
export * from './vectorQueryTool';
export * from './chunker-tool';
export * from './graphRAG';

/**
 * @category Weather
 * @description Tools for current conditions, alerts, forecasts and historical weather data.
 */
export {
  weatherTool,
  weatherAlertsTool,
  hourlyWeatherForecastTool,
  weatherHistoryTool
} from './weather-tool';

/**
 * @category Cognitive Frameworks
 * @description A suite of native tools for clear thought processes and stochastic algorithms.
 */
export {
  structuredArgumentationTool,
  sequentialThinkingTool,
  mentalModelTool,
  debuggingApproachTool,
  collaborativeReasoningTool,
  decisionFrameworkTool,
  metacognitiveMonitoringTool,
  scientificMethodTool,
  visualReasoningTool
} from './clear-thought-native-tools';
export { stochasticAlgorithmTool } from './stochastic-native-tools';

/**
 * @category Miscellaneous
 * @description Exports for Nango, Mem0, Rerank and other support tools.
 */
export * from './nango';
export * from './mem0-tool';
export * from './rerank-tool';

/**
 * @category Runtime Context Types
 * @description Type definitions for tool runtime contexts to enable strong typing.
 */
export type { ArxivRuntimeContext } from './arxiv-client';
export type { BraveSearchRuntimeContext } from './brave-search';
export type { ChunkerToolRuntimeContext } from './chunker-tool';
export type { GraphRAGRuntimeContext } from './graphRAG';
export type { Mem0RuntimeContext } from './mem0-tool';
export type { RerankRuntimeContext } from './rerank-tool';
export type { StockRuntimeContext } from './stock-tools';
export type { SportsOddsRuntimeContext } from './sports-odds-tool';
export type { VectorQueryRuntimeContext } from './vectorQueryTool';
export type { WeatherRuntimeContext } from './weather-tool';

// Import each group under a namespace for registry binding
import * as DataFileManager from './data-file-manager';
import * as BraveSearch from './brave-search';
import * as TavilySearch from './tavily';
import * as Wikidata from './wikidata-client';
import * as Reddit from './reddit';
import * as HackerNews from './hacker-news-client';
import * as Arxiv from './arxiv-client';
import * as CodeAnalysis from './code-search-tool';
import * as WebScraper from './web-scraper-tool';
import * as GitOps from './git-operations-tool';
import * as Diffbot from './diffbot-client';
import * as Crypto from './crypto-tool';
import * as Stock from './stock-tools';
import * as Sports from './sports-odds-tool';
import * as Vector from './vectorQueryTool';
import * as Chunker from './chunker-tool';
import * as GraphRAG from './graphRAG';
import * as Weather from './weather-tool';
import * as ClearThought from './clear-thought-native-tools';
import * as Stochastic from './stochastic-native-tools';
import * as Nango from './nango';
import * as Mem0 from './mem0-tool';
import * as Rerank from './rerank-tool';
// Importing all tools under a single namespace for easy access

/**
 * @constant toolsRegistry
 * @description A comprehensive registry mapping each Mastra tool's identifier to its implementation,
 *              enabling dynamic lookup and execution of tools within the Mastra ecosystem.
 * @type Record<string, unknown>
 * @category Tools Registry
 * @example
 * // Example usage:
 * const tool = toolsRegistry['readDataFileTool'];
 * if (tool) {
 *   tool.execute({ filePath: '/path/to/data.json' })
 *  .then(result => console.log(result))
 *  .catch(error => console.error('Error executing tool:', error));
 * }
 * @see {@link https://mastra.ai/docs/tools|Mastra Tools Documentation}
 * @see {@link https://mastra.ai/docs/runtime-context|Mastra Runtime Context Documentation}
 * @since 2025-07-09
 * @version 0.0.1
 * @author Deanmachines
 * @description A comprehensive registry mapping each Mastra tool's identifier to its implementation,
 * enabling dynamic lookup and execution of tools within the Mastra ecosystem.
 * This registry allows developers to easily access and utilize the various tools available in the Mastra system,
 * facilitating modular and extensible tool integration.
 * - Handles all tool exports in a single object for easy access
 * - Supports dynamic tool execution based on identifiers
 * - Simplifies the process of adding new tools to the registry
 * - Ensures consistent tool interfaces and usage patterns
 * - Why this matters:
 *   - Provides a centralized location for all tools
 *   - Enables dynamic tool execution based on identifiers
 *   - Simplifies the process of adding new tools to the registry
 *   - Ensures consistent tool interfaces and usage patterns
 *   - Facilitates modular and extensible tool integration
 *   - Allows developers to easily access and utilize the various tools available in the Mastra system
 *   - Enhances maintainability and scalability of the toolset
 */
const toolsRegistry: Record<string, unknown> = {
  // Data File Management
  readDataFileTool: DataFileManager.readDataFileTool,
  writeDataFileTool: DataFileManager.writeDataFileTool,
  deleteDataFileTool: DataFileManager.deleteDataFileTool,
  listDataDirTool: DataFileManager.listDataDirTool,
  // Web Search
  createBraveSearchTool: BraveSearch.createBraveSearchTool,
  createTavilySearchTool: TavilySearch.createTavilySearchTool,
  wikidataTools: Wikidata.wikidataTools,
  // Social Media & News
  createRedditClient: Reddit.createRedditClient,
  redditGetSubredditPosts: Reddit.redditGetSubredditPosts,
  createHackerNewsClient: HackerNews.createHackerNewsClient,
  hackerNewsGetSearchItem: HackerNews.hackerNewsGetSearchItem,
  hackerNewsGetSearchUser: HackerNews.hackerNewsGetSearchUser,
  hackerNewsSearchItems: HackerNews.hackerNewsSearchItems,
  hackerNewsGetSearchTopStories: HackerNews.hackerNewsGetSearchTopStories,
  hackerNewsGetItem: HackerNews.hackerNewsGetItem,
  hackerNewsGetTopStories: HackerNews.hackerNewsGetTopStories,
  hackerNewsGetNewStories: HackerNews.hackerNewsGetNewStories,
  hackerNewsGetBestStories: HackerNews.hackerNewsGetBestStories,
  // Academic & Research
  createArxivClient: Arxiv.createArxivClient,
  arxivSearch: Arxiv.arxivSearch,
  // Code Analysis & Scraping
  codeSearchTool: CodeAnalysis.codeSearchTool,
  webScraperTool: WebScraper.webScraperTool,
  gitOperationsTool: GitOps.gitOperationsTool,
  // Diffbot Integration
  diffbotAnalyzeUrlTool: Diffbot.diffbotAnalyzeUrlTool,
  diffbotExtractArticleFromUrlTool: Diffbot.diffbotExtractArticleFromUrlTool,
  diffbotEnhanceEntityTool: Diffbot.diffbotEnhanceEntityTool,
  diffbotSearchKnowledgeGraphTool: Diffbot.diffbotSearchKnowledgeGraphTool,
  diffbotEnhanceKnowledgeGraphTool: Diffbot.diffbotEnhanceKnowledgeGraphTool,
  createDiffbotClient: Diffbot.createDiffbotClient,
  // Financial Data
  cryptoPriceTool: Crypto.cryptoPriceTool,
  historicalCryptoPriceTool: Crypto.historicalCryptoPriceTool,
  cryptoMarketDataTool: Crypto.cryptoMarketDataTool,
  listCryptoCoinsTool: Crypto.listCryptoCoinsTool,
  cryptoRuntimeContext: Crypto.cryptoRuntimeContext,
  stockPriceTool: Stock.stockPriceTool,
  historicalStockPriceTool: Stock.historicalStockPriceTool,
  stockNewsTool: Stock.stockNewsTool,
  earningsCalendarTool: Stock.earningsCalendarTool,
  // Sports
  sportsOddsTool: Sports.sportsOddsTool,
  listSportsTool: Sports.listSportsTool,
  listBookmakersTool: Sports.listBookmakersTool,
  historicalOddsTool: Sports.historicalOddsTool,
  // Vector & RAG
  ...Vector,
  ...Chunker,
  ...GraphRAG,
  // Weather
  weatherTool: Weather.weatherTool,
  weatherAlertsTool: Weather.weatherAlertsTool,
  hourlyWeatherForecastTool: Weather.hourlyWeatherForecastTool,
  weatherHistoryTool: Weather.weatherHistoryTool,
  // Cognitive Frameworks
  structuredArgumentationTool: ClearThought.structuredArgumentationTool,
  sequentialThinkingTool: ClearThought.sequentialThinkingTool,
  mentalModelTool: ClearThought.mentalModelTool,
  debuggingApproachTool: ClearThought.debuggingApproachTool,
  collaborativeReasoningTool: ClearThought.collaborativeReasoningTool,
  decisionFrameworkTool: ClearThought.decisionFrameworkTool,
  metacognitiveMonitoringTool: ClearThought.metacognitiveMonitoringTool,
  scientificMethodTool: ClearThought.scientificMethodTool,
  visualReasoningTool: ClearThought.visualReasoningTool,
  stochasticAlgorithmTool: Stochastic.stochasticAlgorithmTool,
  // Miscellaneous
  ...Nango,
  ...Mem0,
  ...Rerank
};

export default toolsRegistry;
