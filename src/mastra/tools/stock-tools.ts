import { createTool, ToolExecutionContext } from "@mastra/core/tools";
import { RuntimeContext } from '@mastra/core/di';
import { z } from "zod";
import { generateId } from 'ai';
import { PinoLogger } from '@mastra/loggers';

const logger = new PinoLogger({ name: 'stockTools', level: 'info' });

/**
 * Runtime context type for stock tools configuration
 */
export type StockRuntimeContext = {
  'user-id'?: string;
  'session-id'?: string;
  'currency-preference'?: 'USD' | 'EUR' | 'GBP' | 'JPY';
  'data-source'?: string;
  'include-extended-hours'?: boolean;
  'debug'?: boolean;
};

// Enhanced Zod schemas with comprehensive validation
const stockInputSchema = z.object({
  symbol: z.string()
    .min(1, "Stock symbol cannot be empty")
    .max(10, "Stock symbol too long")
    .regex(/^[A-Z0-9.-]+$/, "Invalid stock symbol format")
    .transform(s => s.toUpperCase())
    .describe("The stock ticker symbol (e.g., AAPL, MSFT, GOOGL)"),
}).strict();

const stockOutputSchema = z.object({
  symbol: z.string().describe("Stock ticker symbol"),
  price: z.number().positive("Price must be positive").describe("Current stock price"),
  currency: z.string().default("USD").describe("Currency of the price"),
  timestamp: z.string().datetime().describe("Data timestamp in ISO format"),
  requestId: z.string().describe("Unique request identifier"),
  source: z.string().default("mastra-stock-data").describe("Data source"),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
}).strict();

// Historical Stock Price Tool Schemas
const historicalStockPriceInputSchema = z.object({
  symbol: z.string()
    .min(1, "Stock symbol cannot be empty")
    .max(10, "Stock symbol too long")
    .regex(/^[A-Z0-9.-]+$/, "Invalid stock symbol format")
    .transform(s => s.toUpperCase())
    .describe("The stock ticker symbol (e.g., AAPL, MSFT, GOOGL)"),
  startDate: z.string().datetime().describe("Start date for historical data in ISO format (e.g., '2023-01-01')"),
  endDate: z.string().datetime().optional().describe("End date for historical data in ISO format (defaults to today)"),
  interval: z.enum(['1min', '5min', '15min', '30min', '60min', 'daily', 'weekly', 'monthly'])
    .default('daily')
    .describe("Interval for historical data (e.g., 'daily', '60min')"),
}).strict();

const historicalStockPriceOutputSchema = z.array(z.object({
  date: z.string().datetime().describe("Date of the historical data point in ISO format"),
  open: z.number().describe("Opening price"),
  high: z.number().describe("Highest price"),
  low: z.number().describe("Lowest price"),
  close: z.number().describe("Closing price"),
  volume: z.number().int().describe("Trading volume"),
})).describe("Array of historical stock data points");

// API response schema for validation
// API response schema for Alpha Vantage
const stockApiResponseSchema = z.object({
  "Global Quote": z.object({
    "05. price": z.string(),
  }).optional(),
  "Note": z.string().optional(),
  "Error Message": z.string().optional(),
});

const AlphaVantageHistoricalDataPointSchema = z.object({
  "1. open": z.string(),
  "2. high": z.string(),
  "3. low": z.string(),
  "4. close": z.string(),
  "5. volume": z.string(),
});

const AlphaVantageHistoricalApiResponseSchema = z.object({
  "Meta Data": z.record(z.string()).optional(),
  "Time Series (Daily)": z.record(z.string(), AlphaVantageHistoricalDataPointSchema).optional(),
  "Weekly Time Series": z.record(z.string(), AlphaVantageHistoricalDataPointSchema).optional(),
  "Monthly Time Series": z.record(z.string(), AlphaVantageHistoricalDataPointSchema).optional(),
  "Time Series (1min)": z.record(z.string(), AlphaVantageHistoricalDataPointSchema).optional(),
  "Time Series (5min)": z.record(z.string(), AlphaVantageHistoricalDataPointSchema).optional(),
  "Time Series (15min)": z.record(z.string(), AlphaVantageHistoricalDataPointSchema).optional(),
  "Time Series (30min)": z.record(z.string(), AlphaVantageHistoricalDataPointSchema).optional(),
  "Time Series (60min)": z.record(z.string(), AlphaVantageHistoricalDataPointSchema).optional(),
  "Note": z.string().optional(),
  "Error Message": z.string().optional(),
});

// Stock News Tool Schemas
const stockNewsInputSchema = z.object({
  tickers: z.string()
    .min(1, "Tickers cannot be empty")
    .regex(/^[A-Z0-9.,\s]+$/, "Invalid ticker format")
    .transform(s => s.toUpperCase())
    .describe("Comma-separated stock ticker symbols (e.g., 'AAPL,MSFT')"),
  limit: z.number().int().positive("Limit must be a positive integer").optional().default(10)
    .describe("Optional: maximum number of news articles to return (default: 10)"),
}).strict();

const stockNewsOutputSchema = z.array(z.object({
  title: z.string().describe("Title of the news article"),
  url: z.string().url().describe("URL of the news article"),
  source: z.string().describe("Source of the news article"),
  summary: z.string().describe("Summary of the news article"),
  publishedDate: z.string().datetime().describe("Publication date of the news article in ISO format"),
})).describe("Array of stock news articles");

// Alpha Vantage News Sentiment API response schema
const AlphaVantageNewsSentimentArticleSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  source: z.string(),
  summary: z.string(),
  time_published: z.string(), // e.g., "20230709T120000"
});

const AlphaVantageNewsSentimentApiResponseSchema = z.object({
  feed: z.array(AlphaVantageNewsSentimentArticleSchema),
  "Note": z.string().optional(),
  "Error Message": z.string().optional(),
});

// Earnings Calendar Tool Schemas
const earningsCalendarInputSchema = z.object({
  date: z.string().datetime({ offset: true }).optional().describe("Optional: ISO date string (e.g., '2024-07-09'). Defaults to today. If not provided, returns next 12 months of earnings."),
}).strict();

const earningsCalendarOutputSchema = z.array(z.object({
  symbol: z.string().describe("Stock ticker symbol"),
  name: z.string().describe("Company name"),
  reportDate: z.string().datetime().describe("Report date of the earnings event in ISO format"),
  fiscalDateEnding: z.string().datetime().describe("Fiscal date ending for the earnings report in ISO format"),
  estimate: z.number().optional().describe("Optional: Earnings per share estimate"),
  currency: z.string().optional().describe("Optional: Currency of the estimate"),
})).describe("Array of earnings calendar events");

// Alpha Vantage Earnings Calendar API response schema
const AlphaVantageEarningsCalendarEventSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  reportDate: z.string(), // YYYY-MM-DD
  fiscalDateEnding: z.string(), // YYYY-MM-DD
  estimate: z.string().optional(), // Can be "None" or a number string
  currency: z.string().optional(),
});

const AlphaVantageEarningsCalendarApiResponseSchema = z.object({
  annualEarnings: z.array(z.any()).optional(), // Not directly used for calendar, but present in response
  quarterlyEarnings: z.array(z.any()).optional(), // Not directly used for calendar, but present in response
  data: z.array(AlphaVantageEarningsCalendarEventSchema).optional(),
  "Note": z.string().optional(),
  "Error Message": z.string().optional(),
});

// Company Overview Tool Schemas
const companyOverviewInputSchema = z.object({
  symbol: z.string()
    .min(1, "Stock symbol cannot be empty")
    .max(10, "Stock symbol too long")
    .regex(/^[A-Z0-9.-]+$/, "Invalid stock symbol format")
    .transform(s => s.toUpperCase())
    .describe("The stock ticker symbol (e.g., AAPL, MSFT, GOOGL)"),
}).strict();

const companyOverviewOutputSchema = z.object({
  Symbol: z.string().describe("Stock ticker symbol"),
  AssetType: z.string().describe("Type of asset"),
  Name: z.string().describe("Company name"),
  Description: z.string().describe("Company description"),
  Exchange: z.string().describe("Exchange where the company is listed"),
  Currency: z.string().describe("Currency of the stock"),
  Country: z.string().describe("Country of operation"),
  Sector: z.string().describe("Sector the company belongs to"),
  Industry: z.string().describe("Industry the company belongs to"),
  MarketCapitalization: z.string().describe("Market capitalization"),
  PERatio: z.string().describe("Price-to-Earnings Ratio"),
  DividendYield: z.string().describe("Dividend Yield"),
}).strict();

// Alpha Vantage Company Overview API response schema
const AlphaVantageCompanyOverviewApiResponseSchema = z.object({
  Symbol: z.string(),
  AssetType: z.string(),
  Name: z.string(),
  Description: z.string(),
  Exchange: z.string(),
  Currency: z.string(),
  Country: z.string(),
  Sector: z.string(),
  Industry: z.string(),
  MarketCapitalization: z.string(),
  PERatio: z.string(),
  DividendYield: z.string(),
  "Note": z.string().optional(),
  "Error Message": z.string().optional(),
}).passthrough(); // Use passthrough to allow extra fields not explicitly defined


// Helper function to get Alpha Vantage API key
const getAlphaVantageApiKey = () => {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    throw new Error("ALPHA_VANTAGE_API_KEY is not set in the environment variables.");
  }
  return apiKey;
};

// Enhanced helper function with validation and error handling for Alpha Vantage
const getStockPrice = async (symbol: string) => {
  const apiKey = getAlphaVantageApiKey();

  const response = await fetch(
    `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`,
  );

  if (!response.ok) {
    throw new Error(`Alpha Vantage API error: ${response.status} - ${response.statusText}`);
  }

  const data = await response.json();
  const validatedData = stockApiResponseSchema.parse(data);

  if (validatedData.Note) {
    throw new Error(`Alpha Vantage API Note: ${validatedData.Note}`);
  }

  if (!validatedData["Global Quote"]) {
    throw new Error("Invalid response structure from Alpha Vantage API.");
  }

  const priceValue = validatedData["Global Quote"]["05. price"];
  return parseFloat(priceValue);
};

// Create an enhanced tool to get stock prices
export const stockPriceTool = createTool({
  id: "getStockPrice",
  description: "Fetches the current stock price for a given ticker symbol with comprehensive validation",
  inputSchema: stockInputSchema,
  outputSchema: stockOutputSchema,
  execute: async ({ input, runtimeContext }: ToolExecutionContext<typeof stockInputSchema> & {
    input: z.infer<typeof stockInputSchema>;
    runtimeContext?: RuntimeContext<StockRuntimeContext>;
  }): Promise<z.infer<typeof stockOutputSchema>> => {
    const requestId = generateId();
    
    // Get runtime context values
    const userId = (runtimeContext?.get('user-id') as string | undefined) ?? 'anonymous';
    const sessionId = (runtimeContext?.get('session-id') as string | undefined) ?? 'default';
    const currencyPreference = (runtimeContext?.get('currency-preference') as 'USD' | 'EUR' | 'GBP' | 'JPY' | undefined) ?? 'USD';
    const dataSource = (runtimeContext?.get('data-source') as string | undefined) ?? 'mastra-stock-data';
    const debug = (runtimeContext?.get('debug') as boolean | undefined) ?? false;
    
    if (debug) {
      logger.info(`[${requestId}] Stock price request started`, {
        symbol: input.symbol,
        userId,
        sessionId,
        currencyPreference
      });
    }
    
    try {
      const price = await getStockPrice(input.symbol);
      
      const result = stockOutputSchema.parse({
        symbol: input.symbol,
        price: price,
        currency: currencyPreference,
        timestamp: new Date().toISOString(),
        requestId,
        source: dataSource,
        userId,
        sessionId
      });
      
      if (debug) {
        logger.info(`[${requestId}] Stock price request completed successfully`, {
          symbol: result.symbol,
          price: result.price,
          userId,
          sessionId
        });
      }
      
      return result;
    } catch (error) {
      logger.error(`[${requestId}] Stock price request failed`, {
        symbol: input.symbol,
        userId,
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  },
});

export const historicalStockPriceTool = createTool({
  id: "historicalStockPrice",
  description: "Fetches historical stock prices for a given ticker symbol, date range, and interval.",
  inputSchema: historicalStockPriceInputSchema,
  outputSchema: historicalStockPriceOutputSchema,
  execute: async ({ input, runtimeContext }: ToolExecutionContext<typeof historicalStockPriceInputSchema> & {
    input: z.infer<typeof historicalStockPriceInputSchema>;
    runtimeContext?: RuntimeContext<StockRuntimeContext>;
  }): Promise<z.infer<typeof historicalStockPriceOutputSchema>> => {
    const requestId = generateId();
    const apiKey = getAlphaVantageApiKey();
    const debug = (runtimeContext?.get('debug') as boolean | undefined) ?? false;

    if (debug) {
      logger.info(`[${requestId}] Historical stock price request started`, {
        symbol: input.symbol,
        startDate: input.startDate,
        endDate: input.endDate,
        interval: input.interval,
      });
    }

    try {
      let functionName: string;
      let url: string;

      switch (input.interval) {
        case 'daily':
          functionName = 'TIME_SERIES_DAILY';
          url = `https://www.alphavantage.co/query?function=${functionName}&symbol=${input.symbol}&apikey=${apiKey}`;
          break;
        case 'weekly':
          functionName = 'TIME_SERIES_WEEKLY';
          url = `https://www.alphavantage.co/query?function=${functionName}&symbol=${input.symbol}&apikey=${apiKey}`;
          break;
        case 'monthly':
          functionName = 'TIME_SERIES_MONTHLY';
          url = `https://www.alphavantage.co/query?function=${functionName}&symbol=${input.symbol}&apikey=${apiKey}`;
          break;
        case '1min':
        case '5min':
        case '15min':
        case '30min':
        case '60min':
          functionName = 'TIME_SERIES_INTRADAY';
          url = `https://www.alphavantage.co/query?function=${functionName}&symbol=${input.symbol}&interval=${input.interval.replace('min', 'min')}&apikey=${apiKey}`;
          break;
        default:
          throw new Error(`Unsupported interval: ${input.interval}`);
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status} - ${response.statusText}`);
      }
      const data = await response.json();
      const validatedData = AlphaVantageHistoricalApiResponseSchema.parse(data);

      if (validatedData.Note) {
        throw new Error(`Alpha Vantage API Note: ${validatedData.Note}`);
      }
      if (validatedData["Error Message"]) {
        throw new Error(`Alpha Vantage API Error: ${validatedData["Error Message"]}`);
      }

      let timeSeries: Record<string, z.infer<typeof AlphaVantageHistoricalDataPointSchema>> | undefined;
      if (input.interval === '1min') {
        timeSeries = validatedData["Time Series (1min)"];
      } else if (input.interval === '5min') {
        timeSeries = validatedData["Time Series (5min)"];
      } else if (input.interval === '15min') {
        timeSeries = validatedData["Time Series (15min)"];
      } else if (input.interval === '30min') {
        timeSeries = validatedData["Time Series (30min)"];
      } else if (input.interval === '60min') {
        timeSeries = validatedData["Time Series (60min)"];
      } else if (input.interval === 'daily') {
        timeSeries = validatedData["Time Series (Daily)"];
      } else if (input.interval === 'weekly') {
        timeSeries = validatedData["Weekly Time Series"];
      } else if (input.interval === 'monthly') {
        timeSeries = validatedData["Monthly Time Series"];
      }

      if (!timeSeries) {
        throw new Error("No time series data found in Alpha Vantage API response.");
      }

      const historicalData: z.infer<typeof historicalStockPriceOutputSchema> = [];
      const startDate = new Date(input.startDate);
      const endDate = input.endDate ? new Date(input.endDate) : new Date();

      for (const dateStr in timeSeries) {
        const dataPoint = timeSeries[dateStr];
        const currentDate = new Date(dateStr);

        if (currentDate >= startDate && currentDate <= endDate) {
          historicalData.push({
            date: currentDate.toISOString(),
            open: parseFloat(dataPoint["1. open"]),
            high: parseFloat(dataPoint["2. high"]),
            low: parseFloat(dataPoint["3. low"]),
            close: parseFloat(dataPoint["4. close"]),
            volume: parseInt(dataPoint["5. volume"]),
          });
        }
      }
      
      historicalData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const result = historicalStockPriceOutputSchema.parse(historicalData);

      if (debug) {
        logger.info(`[${requestId}] Historical stock price request completed successfully`, {
          symbol: input.symbol,
          dataPoints: result.length,
        });
      }
      return result;
    } catch (error) {
      logger.error(`[${requestId}] Historical stock price request failed`, {
        symbol: input.symbol,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  },
});

export const stockNewsTool = createTool({
  id: "stockNews",
  description: "Fetches recent news articles for given stock ticker symbols.",
  inputSchema: stockNewsInputSchema,
  outputSchema: stockNewsOutputSchema,
  execute: async ({ input, runtimeContext }: ToolExecutionContext<typeof stockNewsInputSchema> & {
    input: z.infer<typeof stockNewsInputSchema>;
    runtimeContext?: RuntimeContext<StockRuntimeContext>;
  }): Promise<z.infer<typeof stockNewsOutputSchema>> => {
    const requestId = generateId();
    const apiKey = getAlphaVantageApiKey();
    const debug = (runtimeContext?.get('debug') as boolean | undefined) ?? false;

    if (debug) {
      logger.info(`[${requestId}] Stock news request started`, {
        tickers: input.tickers,
        limit: input.limit,
      });
    }

    try {
      const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${input.tickers}&apikey=${apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      const validatedData = AlphaVantageNewsSentimentApiResponseSchema.parse(data);

      if (validatedData.Note) {
        throw new Error(`Alpha Vantage API Note: ${validatedData.Note}`);
      }
      if (validatedData["Error Message"]) {
        throw new Error(`Alpha Vantage API Error: ${validatedData["Error Message"]}`);
      }

      const newsArticles: z.infer<typeof stockNewsOutputSchema> = validatedData.feed
        .slice(0, input.limit)
        .map(article => ({
          title: article.title,
          url: article.url,
          source: article.source,
          summary: article.summary,
          publishedDate: new Date(
            `${article.time_published.substring(0, 4)}-` +
            `${article.time_published.substring(4, 6)}-` +
            `${article.time_published.substring(6, 8)}T` +
            `${article.time_published.substring(9, 15)}00Z` // Alpha Vantage time is HHMMSS, need to add '00Z' for valid ISO
          ).toISOString(),
        }));

      const result = stockNewsOutputSchema.parse(newsArticles);

      if (debug) {
        logger.info(`[${requestId}] Stock news request completed successfully`, {
          tickers: input.tickers,
          articlesCount: result.length,
        });
      }
      return result;
    } catch (error) {
      logger.error(`[${requestId}] Stock news request failed`, {
        tickers: input.tickers,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  },
});

export const earningsCalendarTool = createTool({
  id: "earningsCalendar",
  description: "Fetches upcoming earnings calendar events for companies.",
  inputSchema: earningsCalendarInputSchema,
  outputSchema: earningsCalendarOutputSchema,
  execute: async ({ input, runtimeContext }: ToolExecutionContext<typeof earningsCalendarInputSchema> & {
    input: z.infer<typeof earningsCalendarInputSchema>;
    runtimeContext?: RuntimeContext<StockRuntimeContext>;
  }): Promise<z.infer<typeof earningsCalendarOutputSchema>> => {
    const requestId = generateId();
    const apiKey = getAlphaVantageApiKey();
    const debug = (runtimeContext?.get('debug') as boolean | undefined) ?? false;

    if (debug) {
      logger.info(`[${requestId}] Earnings calendar request started`, {
        date: input.date,
      });
    }

    try {
      let url = `https://www.alphavantage.co/query?function=EARNINGS_CALENDAR&apikey=${apiKey}`;
      if (input.date) {
        const dateObj = new Date(input.date);
        const formattedDate = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
        url += `&date=${formattedDate}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      const validatedData = AlphaVantageEarningsCalendarApiResponseSchema.parse(data);

      if (validatedData.Note) {
        throw new Error(`Alpha Vantage API Note: ${validatedData.Note}`);
      }
      if (validatedData["Error Message"]) {
        throw new Error(`Alpha Vantage API Error: ${validatedData["Error Message"]}`);
      }

      const earningsEvents: z.infer<typeof earningsCalendarOutputSchema> = [];
      if (validatedData.data) {
        for (const event of validatedData.data) {
          earningsEvents.push({
            symbol: event.symbol,
            name: event.name,
            reportDate: new Date(event.reportDate).toISOString(),
            fiscalDateEnding: new Date(event.fiscalDateEnding).toISOString(),
            estimate: event.estimate && event.estimate !== "None" ? parseFloat(event.estimate) : undefined,
            currency: event.currency || undefined,
          });
        }
      }

      const result = earningsCalendarOutputSchema.parse(earningsEvents);

      if (debug) {
        logger.info(`[${requestId}] Earnings calendar request completed successfully`, {
          date: input.date,
          eventsCount: result.length,
        });
      }
      return result;
    } catch (error) {
      logger.error(`[${requestId}] Earnings calendar request failed`, {
        date: input.date,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  },
});

export const companyOverviewTool = createTool({
  id: "companyOverview",
  description: "Fetches a comprehensive overview of a company based on its stock ticker symbol.",
  inputSchema: companyOverviewInputSchema,
  outputSchema: companyOverviewOutputSchema,
  execute: async ({ input, runtimeContext }: ToolExecutionContext<typeof companyOverviewInputSchema> & {
    input: z.infer<typeof companyOverviewInputSchema>;
    runtimeContext?: RuntimeContext<StockRuntimeContext>;
  }): Promise<z.infer<typeof companyOverviewOutputSchema>> => {
    const requestId = generateId();
    const apiKey = getAlphaVantageApiKey();
    const debug = (runtimeContext?.get('debug') as boolean | undefined) ?? false;

    if (debug) {
      logger.info(`[${requestId}] Company overview request started`, {
        symbol: input.symbol,
      });
    }

    try {
      const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${input.symbol}&apikey=${apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      const validatedData = AlphaVantageCompanyOverviewApiResponseSchema.parse(data);

      if (validatedData.Note) {
        throw new Error(`Alpha Vantage API Note: ${validatedData.Note}`);
      }
      if (validatedData["Error Message"]) {
        throw new Error(`Alpha Vantage API Error: ${validatedData["Error Message"]}`);
      }

      const result = companyOverviewOutputSchema.parse(validatedData);

      if (debug) {
        logger.info(`[${requestId}] Company overview request completed successfully`, {
          symbol: input.symbol,
          companyName: result.Name,
        });
      }
      return result;
    } catch (error) {
      logger.error(`[${requestId}] Company overview request failed`, {
        symbol: input.symbol,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  },
});

/**
 * Runtime context instance for stock tools with defaults
 */
export const stockRuntimeContext = new RuntimeContext<StockRuntimeContext>();
stockRuntimeContext.set('currency-preference', 'USD');
stockRuntimeContext.set('data-source', 'alpha-vantage');
stockRuntimeContext.set('include-extended-hours', false);
stockRuntimeContext.set('debug', false);