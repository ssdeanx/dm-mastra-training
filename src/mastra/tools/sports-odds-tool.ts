import { createTool, ToolExecutionContext } from '@mastra/core/tools';
import { RuntimeContext } from '@mastra/core/di';
import { z } from 'zod';
import { PinoLogger } from '@mastra/loggers';

const logger = new PinoLogger({ name: 'SportsOddsTool', level: 'info' });

/**
 * Runtime context type for sports odds tool configuration
 */
export type SportsOddsRuntimeContext = {
  'user-id'?: string;
  'session-id'?: string;
  'debug'?: boolean;
};

const inputSchema = z.object({
  sport_key: z.string().describe('The sport key to fetch odds for (e.g., americanfootball_nfl)'),
  regions: z.string().optional().describe("Comma-separated list of regions to fetch odds from (e.g., 'us', 'uk', 'eu', 'au'). Defaults to 'us' if not provided."),
  markets: z.string().optional().describe("Comma-separated list of markets to fetch odds for (e.g., 'h2h', 'spreads', 'totals'). Defaults to 'h2h' if not provided."),
}).strict();

const bookmakerSchema = z.object({
  key: z.string(),
  title: z.string(),
  last_update: z.string(),
  markets: z.array(z.object({
    key: z.string(),
    last_update: z.string(),
    outcomes: z.array(z.object({
        name: z.string(),
        price: z.number(),
    })),
  })),
});

const oddsApiResponseSchema = z.array(z.object({
  id: z.string(),
  sport_key: z.string(),
  sport_title: z.string(),
  commence_time: z.string(),
  home_team: z.string(),
  away_team: z.string(),
  bookmakers: z.array(bookmakerSchema),
}));

const outputSchema = oddsApiResponseSchema;

const historicalOddsInputSchema = z.object({
  sport_key: z.string().describe('The sport key (e.g., americanfootball_nfl)'),
  event_id: z.string().describe('The ID of the specific event'),
  regions: z.string().optional().describe("Comma-separated list of regions (e.g., 'us', 'uk', 'eu', 'au'). Defaults to 'us' if not provided."),
  markets: z.string().optional().describe("Comma-separated list of markets (e.g., 'h2h', 'spreads', 'totals'). Defaults to 'h2h' if not provided."),
}).strict();

const historicalOddsOutputSchema = oddsApiResponseSchema.element;

export const sportsOddsTool = createTool({
  id: 'get-sports-odds',
  description: 'Fetches sports odds for a given sport key from The Odds API.',
  inputSchema,
  outputSchema,
  execute: async ({ input, runtimeContext }: ToolExecutionContext<typeof inputSchema> & {
    input: z.infer<typeof inputSchema>;
    runtimeContext?: RuntimeContext<SportsOddsRuntimeContext>;
  }): Promise<z.infer<typeof outputSchema>> => {
    const apiKey = process.env.THE_ODDS_API_KEY;
    const debug = runtimeContext?.get('debug') || false;

    if (!apiKey) {
      logger.error('THE_ODDS_API_KEY environment variable not set.');
      throw new Error('THE_ODDS_API_KEY is not set.');
    }

    if (debug) {
        logger.info('Sports odds tool executed with input', {
            sport_key: input.sport_key,
            regions: input.regions,
            markets: input.markets,
        });
    }

    const regions = input.regions || 'us';
    const markets = input.markets || 'h2h';

    const apiUrl = `https://api.the-odds-api.com/v4/sports/${input.sport_key}/odds?apiKey=${apiKey}&regions=${regions}&markets=${markets}`;

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`API error: ${response.status} - ${errorText}`);
        throw new Error(`Failed to fetch sports odds: ${response.statusText}`);
      }

      const data = await response.json();
      const validatedData = oddsApiResponseSchema.parse(data);

      return validatedData;
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error('Zod validation error:', error.issues);
        throw new Error('Failed to validate sports odds API response.');
      }
      logger.error('An unexpected error occurred:', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  },
});

export const historicalOddsTool = createTool({
  id: 'get-historical-odds',
  description: 'Fetches historical sports odds for a specific event from The Odds API.',
  inputSchema: historicalOddsInputSchema,
  outputSchema: historicalOddsOutputSchema,
  execute: async ({ input, runtimeContext }: ToolExecutionContext<typeof historicalOddsInputSchema> & {
    input: z.infer<typeof historicalOddsInputSchema>;
    runtimeContext?: RuntimeContext<SportsOddsRuntimeContext>;
  }): Promise<z.infer<typeof historicalOddsOutputSchema>> => {
    const apiKey = process.env.THE_ODDS_API_KEY;
    const debug = runtimeContext?.get('debug') || false;

    if (!apiKey) {
      logger.error('THE_ODDS_API_KEY environment variable not set.');
      throw new Error('THE_ODDS_API_KEY is not set.');
    }

    if (debug) {
        logger.info('Historical odds tool executed with input', {
            sport_key: input.sport_key,
            event_id: input.event_id,
            regions: input.regions,
            markets: input.markets,
        });
    }

    const regions = input.regions || 'us';
    const markets = input.markets || 'h2h';

    const apiUrl = `https://api.the-odds-api.com/v4/sports/${input.sport_key}/events/${input.event_id}/odds?apiKey=${apiKey}&regions=${regions}&markets=${markets}`;

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`API error: ${response.status} - ${errorText}`);
        throw new Error(`Failed to fetch historical sports odds: ${response.statusText}`);
      }

      const data = await response.json();
      // The historical odds endpoint returns a single event object, not an array.
      const validatedData = historicalOddsOutputSchema.parse(data);

      return validatedData;
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error('Zod validation error:', error.issues);
        throw new Error('Failed to validate historical odds API response.');
      }
      logger.error('An unexpected error occurred:', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  },
});

const listSportsOutputSchema = z.array(z.object({
  key: z.string().describe('The sport key to be used in other tools'),
  group: z.string().describe('e.g., American Football, Soccer'),
  title: z.string().describe('e.g., NFL, EPL'),
  active: z.boolean().describe('Whether the sport is currently active'),
}).strict());

export const listSportsTool = createTool({
  id: 'list-sports',
  description: 'Lists all available sports from The Odds API.',
  inputSchema: z.object({}).strict(),
  outputSchema: listSportsOutputSchema,
  execute: async ({ runtimeContext }) => {
    const apiKey = process.env.THE_ODDS_API_KEY;
    const debug = (runtimeContext as RuntimeContext<SportsOddsRuntimeContext>)?.get('debug') || false;

    if (!apiKey) {
      logger.error('THE_ODDS_API_KEY environment variable not set.');
      throw new Error('THE_ODDS_API_KEY is not set.');
    }

    if (debug) {
      logger.info('List sports tool executed.');
    }

    const apiUrl = `https://api.the-odds-api.com/v4/sports?apiKey=${apiKey}`;

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`API error: ${response.status} - ${errorText}`);
        throw new Error(`Failed to fetch sports list: ${response.statusText}`);
      }

      const data = await response.json();
      const validatedData = listSportsOutputSchema.parse(data);

      return validatedData;
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error('Zod validation error:', error.issues);
        throw new Error('Failed to validate sports list API response.');
      }
      logger.error('An unexpected error occurred:', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  },
});

const listBookmakersOutputSchema = z.array(z.object({
  key: z.string().describe('The bookmaker_key to be used in other tools'),
  title: z.string().describe('The display name of the bookmaker'),
  last_update: z.string().describe('ISO date string of the last update'),
}).strict());

export const listBookmakersTool = createTool({
  id: 'list-bookmakers',
  description: 'Lists all available bookmakers from The Odds API.',
  inputSchema: z.object({}).strict(),
  outputSchema: listBookmakersOutputSchema,
  execute: async ({ runtimeContext }) => {
    const apiKey = process.env.THE_ODDS_API_KEY;
    const debug = (runtimeContext as RuntimeContext<SportsOddsRuntimeContext>)?.get('debug') || false;

    if (!apiKey) {
      logger.error('THE_ODDS_API_KEY environment variable not set.');
      throw new Error('THE_ODDS_API_KEY is not set.');
    }

    if (debug) {
      logger.info('List bookmakers tool executed.');
    }

    const apiUrl = `https://api.the-odds-api.com/v4/bookmakers?apiKey=${apiKey}`;

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`API error: ${response.status} - ${errorText}`);
        throw new Error(`Failed to fetch bookmakers list: ${response.statusText}`);
      }

      const data = await response.json();
      const validatedData = listBookmakersOutputSchema.parse(data);

      return validatedData;
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error('Zod validation error:', error.issues);
        throw new Error('Failed to validate bookmakers list API response.');
      }
      logger.error('An unexpected error occurred:', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  },
});

/**
 * Runtime context instance for sports odds tool with defaults
 */
export const sportsOddsRuntimeContext = new RuntimeContext<SportsOddsRuntimeContext>();
sportsOddsRuntimeContext.set('debug', false);