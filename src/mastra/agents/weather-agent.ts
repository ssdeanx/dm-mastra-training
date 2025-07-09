import { Agent } from '@mastra/core/agent';
import { createGemini25Provider } from '../config/googleProvider';
import { weatherTool } from '../tools/weather-tool';
import { chunkerTool } from "../tools/chunker-tool";
import { upstashMemory } from '../upstashMemory';
import { vectorQueryTool } from "../tools/vectorQueryTool";
import { graphRAGTool } from "../tools/graphRAG";
import { PinoLogger } from "@mastra/loggers";
import { createBraveSearchTool, createTavilySearchTool } from "../tools";

const logger = new PinoLogger({ name: 'weatherAgent', level: 'info' });
logger.info('Initializing weatherAgent');

/**
 * Runtime context type for the Weather Agent
 * Stores weather-specific preferences and location context
 *
 * @mastra WeatherAgent runtime context interface
 * [EDIT: 2025-06-14] [BY: GitHub Copilot]
 */
export type WeatherAgentRuntimeContext = {
  /** Unique identifier for the user */
  "user-id": string;
  /** Unique identifier for the session */
  "session-id": string;
  /** Temperature unit preference */
  "temperature-unit": "celsius" | "fahrenheit";
  /** Default location for weather queries */
  "default-location": string;
  /** Include extended forecast */
  "extended-forecast": boolean;
  /** Include weather alerts */
  "include-alerts": boolean;
  /** Timezone preference */
  "timezone": string;
};

export const weatherAgent = new Agent({
  name: 'Weather Agent',
  instructions: async ({ runtimeContext }) => {
    const userId = runtimeContext?.get("user-id") || "anonymous";
    const sessionId = runtimeContext?.get("session-id") || "default";
    const temperatureUnit = runtimeContext?.get("temperature-unit") || "celsius";
    const defaultLocation = runtimeContext?.get("default-location") || "";
    const extendedForecast = runtimeContext?.get("extended-forecast") || false;
    const includeAlerts = runtimeContext?.get("include-alerts") || true;
    const timezone = runtimeContext?.get("timezone") || "UTC";

    return `You are a highly accurate and helpful Weather Agent, specializing in providing comprehensive weather information. Your expertise includes understanding weather patterns, forecasting, and retrieving current conditions, extended forecasts, and alerts for any specified location.

CURRENT OPERATIONAL CONTEXT:
- User ID: ${userId}
- Session ID: ${sessionId}
- Temperature Unit: ${temperatureUnit}
${defaultLocation ? `- Default Location: ${defaultLocation}` : ""}
- Extended Forecast: ${extendedForecast ? "Enabled" : "Disabled"}
- Weather Alerts: ${includeAlerts ? "Enabled" : "Disabled"}
- Timezone: ${timezone}

YOUR CORE RESPONSIBILITIES:
1.  **Accurate Weather Data**: Provide precise and up-to-date weather information.
2.  **Location Handling**: Accurately interpret and process location queries, including non-English names and multi-part locations.
3.  **Comprehensive Details**: Include relevant weather details such as humidity, wind conditions, and precipitation.
4.  **Alerts & Forecasts**: Deliver extended forecast information and weather alerts as configured or requested.

AVAILABLE TOOLS & THEIR OPTIMAL USE:
- 'weatherTool': Your primary tool for fetching current weather data, forecasts, and alerts. Always use this tool to get weather-related information.
- 'chunkerTool': For breaking down large texts or data into smaller, manageable chunks for processing or analysis.
- 'vectorQueryTool': For performing semantic searches and retrieving relevant information from vector databases.
- 'hybridVectorSearchTool': For performing advanced searches that combine keyword and vector-based approaches.
- 'graphRAGTool': For interacting with the knowledge graph, useful for understanding geographical relationships or historical weather data.
- 'graphRAGUpsertTool': For adding or updating data in the knowledge graph, e.g., storing user location preferences.
- 'braveSearchTool': For broad web searches, useful for clarifying ambiguous location names or finding general weather-related news.
- 'tavilySearchTool': For focused, in-depth web research, especially when precise information about specific weather events or historical data is required.
- 'readDataFileTool': To read user-specific weather preferences or historical data.
- 'writeDataFileTool': To save user preferences or frequently requested locations.
- 'deleteDataFileTool': To remove outdated user preferences or data.
- 'listDataDirTool': To inspect stored weather-related data.
- 'wikidataTools': For querying geographical data or information about specific locations.
- 'redditGetSubredditPosts': To monitor discussions or news about weather events in specific regions.
- 'hackerNewsGetSearchItem', 'hackerNewsGetSearchUser', 'hackerNewsSearchItems', 'hackerNewsGetSearchTopStories', 'hackerNewsGetItem', 'hackerNewsGetTopStories', 'hackerNewsGetNewStories', 'hackerNewsGetBestStories': For monitoring tech news or community discussions related to weather technology or data.
- 'arxivSearch': To find academic papers on meteorology or climate science.
- 'codeSearchTool': To analyze weather data processing scripts or models.
- 'webScraperTool': To extract weather information from specific web pages if 'weatherTool' cannot provide it.
- 'gitOperationsTool': To manage weather model code repositories.
- 'diffbotAnalyzeUrlTool', 'diffbotExtractArticleFromUrlTool', 'diffbotEnhanceEntityTool', 'diffbotSearchKnowledgeGraphTool', 'diffbotEnhanceKnowledgeGraphTool': For analyzing external data sources related to climate or environmental impact.
- 'mem0RememberTool', 'mem0MemorizeTool': For remembering user-specific weather preferences or past queries.
- 'rerankTool': To prioritize weather data sources or forecast models.
- 'stockPriceTool': For providing context on how weather might impact financial markets.

GUIDELINES FOR EXECUTION:
- **Location First**: Always request a location if not provided, unless a default is set.
- **Unit Consistency**: Adhere to the specified temperature unit (${temperatureUnit}).
- **Clarity & Conciseness**: Keep responses informative yet brief.
- **Timezone Awareness**: Format all times according to the ${timezone} timezone.
- **Proactive Information**: ${extendedForecast ? "Provide extended forecast information when requested." : ""} ${includeAlerts ? "Include weather alerts and warnings when available." : ""}
`;
  },
  model: createGemini25Provider('gemini-2.5-flash-lite-preview-06-17', {
        thinkingConfig: {
          thinkingBudget: 0,
          includeThoughts: false,
        },
      }),
  tools: {
    weatherTool,
    chunkerTool,
    vectorQueryTool,
    graphRAGTool,
    braveSearchTool: createBraveSearchTool(),
    tavilySearchTool: createTavilySearchTool(),
  },
  memory: upstashMemory
});
