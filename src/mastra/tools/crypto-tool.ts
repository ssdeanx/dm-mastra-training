import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// Define the input schema for the cryptoPriceTool
const CryptoPriceToolInputSchema = z.object({
  ids: z.string().describe('Comma-separated cryptocurrency IDs (e.g., "bitcoin,ethereum")'),
  vs_currencies: z.string().describe('Comma-separated vs currencies (e.g., "usd,eur")'),
});

// Define the Zod schema for the CoinGecko API response
// Example response: { "bitcoin": { "usd": 30000, "eur": 25000 }, "ethereum": { "usd": 2000, "eur": 1800 } }
const CoinGeckoApiResponseSchema = z.record(
  z.string(), // Coin ID
  z.record(
    z.string(), // Currency
    z.number() // Price
  )
);

// Define the output schema for the cryptoPriceTool
const CryptoPriceToolOutputSchema = z.record(
  z.string(), // Coin ID
  z.record(
    z.string(), // Currency
    z.number() // Price
  )
);

export const cryptoPriceTool = createTool({
  id: 'cryptoPriceTool',
  description: 'Fetches current cryptocurrency prices from CoinGecko.',
  inputSchema: CryptoPriceToolInputSchema,
  outputSchema: CryptoPriceToolOutputSchema,
  execute: async ({ context: input }) => {
    const { ids, vs_currencies } = input;
    try {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${vs_currencies}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Validate the API response using the Zod schema
      const validatedData = CoinGeckoApiResponseSchema.parse(data);

      // Transform the validated data to match the output schema (which is the same in this case)
      const output: z.infer<typeof CryptoPriceToolOutputSchema> = validatedData;

      return output;
    } catch (error) {
      console.error('Error fetching cryptocurrency prices:', error);
      throw new Error(`Failed to fetch cryptocurrency prices: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

// Define the input schema for the historicalCryptoPriceTool
const HistoricalCryptoPriceToolInputSchema = z.object({
  id: z.string().describe('Coin ID (e.g., "bitcoin")'),
  vs_currency: z.string().describe('Vs currency (e.g., "usd")'),
  days: z.number().describe('Number of days historical data (e.g., 30)'),
});

// Define the output schema for the historicalCryptoPriceTool
const HistoricalCryptoPriceToolOutputSchema = z.array(
  z.object({
    timestamp: z.number().describe('Unix timestamp'),
    price: z.number().describe('Price'),
  })
);

export const historicalCryptoPriceTool = createTool({
  id: 'historicalCryptoPriceTool',
  description: 'Fetches historical cryptocurrency prices from CoinGecko.',
  inputSchema: HistoricalCryptoPriceToolInputSchema,
  outputSchema: HistoricalCryptoPriceToolOutputSchema,
  execute: async ({ context: input }) => {
    const { id, vs_currency, days } = input;
    try {
      const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=${vs_currency}&days=${days}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.statusText}`);
      }

      const data = await response.json();

      // CoinGecko returns data in the format: { prices: [[timestamp, price], ...] }
      const pricesData = z.object({
        prices: z.array(z.array(z.number())),
      }).parse(data).prices;

      const output = pricesData.map(([timestamp, price]) => ({
        timestamp,
        price,
      }));

      return output;
    } catch (error) {
      console.error('Error fetching historical cryptocurrency prices:', error);
      throw new Error(`Failed to fetch historical cryptocurrency prices: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

// Define the input schema for the cryptoMarketDataTool
const CryptoMarketDataToolInputSchema = z.object({
  vs_currency: z.string().describe('Vs currency (e.g., "usd")'),
  ids: z.string().optional().describe('Comma-separated coin IDs (e.g., "bitcoin,ethereum")'),
  order: z.enum([
    'market_cap_desc',
    'gecko_desc',
    'gecko_asc',
    'market_cap_asc',
    'volume_asc',
    'volume_desc',
    'id_asc',
    'id_desc',
  ]).default('market_cap_desc').optional().describe('Order to sort results by'),
  per_page: z.number().int().min(1).max(250).default(100).optional().describe('Number of results per page (1-250)'),
  page: z.number().int().min(1).default(1).optional().describe('Page number for pagination'),
});

// Define the output schema for the cryptoMarketDataTool
const CryptoMarketDataToolOutputSchema = z.array(
  z.object({
    id: z.string().describe('Coin ID'),
    symbol: z.string().describe('Coin symbol'),
    name: z.string().describe('Coin name'),
    image: z.string().url().describe('URL to coin image'),
    current_price: z.number().describe('Current price in vs_currency'),
    market_cap: z.number().describe('Market capitalization in vs_currency'),
    total_volume: z.number().describe('Total 24h trading volume in vs_currency'),
    price_change_percentage_24h: z.number().describe('24-hour price change percentage'),
  })
);

export const cryptoMarketDataTool = createTool({
  id: 'cryptoMarketDataTool',
  description: 'Fetches cryptocurrency market data from CoinGecko.',
  inputSchema: CryptoMarketDataToolInputSchema,
  outputSchema: CryptoMarketDataToolOutputSchema,
  execute: async ({ context: input }) => {
    const { vs_currency, ids, order, per_page, page } = input;
    try {
      const params = new URLSearchParams({
        vs_currency,
        ...(ids && { ids }),
        ...(order && { order }),
        ...(per_page && { per_page: per_page.toString() }),
        ...(page && { page: page.toString() }),
        sparkline: 'false',
      });

      const url = `https://api.coingecko.com/api/v3/coins/markets?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Validate the API response using the Zod schema
      const validatedData = CryptoMarketDataToolOutputSchema.parse(data);

      return validatedData;
    } catch (error) {
      console.error('Error fetching cryptocurrency market data:', error);
      throw new Error(`Failed to fetch cryptocurrency market data: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

// Define the output schema for the listCryptoCoinsTool
const ListCryptoCoinsToolOutputSchema = z.array(
  z.object({
    id: z.string().describe('CoinGecko ID'),
    symbol: z.string().describe('Coin symbol'),
    name: z.string().describe('Coin name'),
  })
);

export const listCryptoCoinsTool = createTool({
  id: 'listCryptoCoinsTool',
  description: 'Lists all supported cryptocurrency coins from CoinGecko.',
  inputSchema: z.object({}).strict(),
  outputSchema: ListCryptoCoinsToolOutputSchema,
  execute: async () => {
    try {
      const url = `https://api.coingecko.com/api/v3/coins/list`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Validate the API response using the Zod schema
      const validatedData = ListCryptoCoinsToolOutputSchema.parse(data);

      return validatedData;
    } catch (error) {
      console.error('Error fetching cryptocurrency list:', error);
      throw new Error(`Failed to fetch cryptocurrency list: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

export const cryptoRuntimeContext = {
  tools: {
    cryptoPriceTool,
    historicalCryptoPriceTool,
    cryptoMarketDataTool,
    listCryptoCoinsTool,
  },
};