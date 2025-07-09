import { createTool, ToolExecutionContext} from '@mastra/core/tools';
import { RuntimeContext } from '@mastra/core/di';

import { z } from 'zod';
import { PinoLogger } from '@mastra/loggers';

const logger = new PinoLogger({ name: 'WeatherTool', level: 'info' });

/**
 * Runtime context type for weather tool configuration
 */
export type WeatherRuntimeContext = {
  'temperature-scale': 'celsius' | 'fahrenheit';
  'user-id'?: string;
  'session-id'?: string;
  'language'?: string;
  'location-preference'?: string;
  'debug'?: boolean;
};

interface GeocodingResponse {
  results: {
    latitude: number;
    longitude: number;
    name: string;
  }[];
}

interface WeatherResponse {
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    precipitation: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
    weather_code: number;
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
  };
}

interface WeatherAlertsResponse {
  results: {
    headline: string;
    description: string;
    severity: string;
    effective: string;
    expires: string;
    uri: string;
  }[];
}

const inputSchema = z.object({
  location: z.string().describe('City name or coordinates'),
  forecast: z.boolean().optional().describe('Include 7-day forecast'),
}).strict();

const outputSchema = z.object({
  temperature: z.number(),
  feelsLike: z.number(),
  humidity: z.number(),
  precipitation: z.number(),
  windSpeed: z.number(),
  windGust: z.number(),
  conditions: z.string(),
  location: z.string(),
  temperatureScale: z.string(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  forecast: z.array(z.object({
    date: z.string(),
    maxTemp: z.number(),
    minTemp: z.number(),
    precipitation: z.number(),
    conditions: z.string(),
  })).optional(),
}).strict();

export const weatherTool = createTool({
  id: 'get-weather',
  description: 'Get current weather for a location with temperature scale preference',
  inputSchema,
  outputSchema,
  execute: async ({ input, runtimeContext }: ToolExecutionContext<typeof inputSchema> & {
    input: z.infer<typeof inputSchema>;
    runtimeContext?: RuntimeContext<WeatherRuntimeContext>;
  }): Promise<z.infer<typeof outputSchema>> => {
    const temperatureScale = runtimeContext?.get('temperature-scale') || 'celsius';
    const userId = runtimeContext?.get('user-id');
    const sessionId = runtimeContext?.get('session-id');
    const debug = runtimeContext?.get('debug') || false;

    if (debug) {
      logger.info('Weather tool executed with runtime context', {
        temperatureScale,
        userId,
        sessionId,
        location: input.location,
        forecast: input.forecast,
      });
    }

    const weatherData = await getWeather(input.location, input.forecast);

    const convertedData = temperatureScale === 'fahrenheit' ? {
      ...weatherData,
      temperature: (weatherData.temperature * 9 / 5) + 32,
      feelsLike: (weatherData.feelsLike * 9 / 5) + 32,
      forecast: weatherData.forecast?.map(f => ({
        ...f,
        maxTemp: (f.maxTemp * 9 / 5) + 32,
        minTemp: (f.minTemp * 9 / 5) + 32,
      })),
    } : weatherData;

    return outputSchema.parse({
      ...convertedData,
      temperatureScale,
      userId,
      sessionId,
    });
  },
});

/**
 * Runtime context instance for weather tool with defaults
 */
export const weatherRuntimeContext = new RuntimeContext<WeatherRuntimeContext>();
weatherRuntimeContext.set('temperature-scale', 'celsius');
weatherRuntimeContext.set('debug', false);

const getWeather = async (location: string, forecast?: boolean) => {
  const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`;
  const geocodingResponse = await fetch(geocodingUrl);
  const geocodingData = (await geocodingResponse.json()) as GeocodingResponse;

  if (!geocodingData.results?.[0]) {
    throw new Error(`Location '${location}' not found`);
  }

  const { latitude, longitude, name } = geocodingData.results[0];

  let weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,wind_speed_10m,wind_gusts_10m,weather_code`;
  if (forecast) {
    weatherUrl += '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum';
  }

  const response = await fetch(weatherUrl);
  const data = (await response.json()) as WeatherResponse;

  const result = {
    temperature: data.current.temperature_2m,
    feelsLike: data.current.apparent_temperature,
    humidity: data.current.relative_humidity_2m,
    precipitation: data.current.precipitation,
    windSpeed: data.current.wind_speed_10m,
    windGust: data.current.wind_gusts_10m,
    conditions: getWeatherCondition(data.current.weather_code),
    location: name,
    forecast: data.daily ? data.daily.time.map((t, i) => ({
      date: t,
      maxTemp: data.daily!.temperature_2m_max[i],
      minTemp: data.daily!.temperature_2m_min[i],
      precipitation: data.daily!.precipitation_sum[i],
      conditions: getWeatherCondition(data.daily!.weather_code[i]),
    })) : undefined,
  };

  return result;
};

const weatherAlertsInputSchema = z.object({
  location: z.string().describe('City name for weather alerts'),
  limit: z.number().int().min(1).optional().default(5).describe('Maximum number of alerts to return'),
}).strict();

const weatherAlertsOutputSchema = z.array(z.object({
  headline: z.string(),
  description: z.string(),
  severity: z.string(),
  effective: z.string(),
  expires: z.string(),
  uri: z.string(),
}).strict());

export const weatherAlertsTool = createTool({
  id: 'get-weather-alerts',
  description: 'Get weather alerts for a specific location',
  inputSchema: weatherAlertsInputSchema,
  outputSchema: weatherAlertsOutputSchema,
  execute: async ({ input }: ToolExecutionContext<typeof weatherAlertsInputSchema> & {
    input: z.infer<typeof weatherAlertsInputSchema>;
  }): Promise<z.infer<typeof weatherAlertsOutputSchema>> => {
    const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(input.location)}&count=1`;
    const geocodingResponse = await fetch(geocodingUrl);
    const geocodingData = (await geocodingResponse.json()) as GeocodingResponse;

    if (!geocodingData.results?.[0]) {
      throw new Error(`Location '${input.location}' not found`);
    }

    const { latitude, longitude } = geocodingData.results[0];

    const alertsUrl = `https://api.open-meteo.com/v1/weather-alerts?latitude=${latitude}&longitude=${longitude}`;
    const alertsResponse = await fetch(alertsUrl);
    const alertsData = (await alertsResponse.json()) as WeatherAlertsResponse;

    if (!alertsData.results || alertsData.results.length === 0) {
      return [];
    }

    const alerts = alertsData.results.slice(0, input.limit).map(alert => ({
      headline: alert.headline,
      description: alert.description,
      severity: alert.severity,
      effective: alert.effective,
      expires: alert.expires,
      uri: alert.uri,
    }));

    return weatherAlertsOutputSchema.parse(alerts);
  },
});

interface HourlyWeatherResponse {
  hourly: {
    time: string[];
    temperature_2m: number[];
    apparent_temperature: number[];
    relative_humidity_2m: number[];
    precipitation: number[];
    wind_speed_10m: number[];
    weather_code: number[];
  };
}

const hourlyWeatherInputSchema = z.object({
  location: z.string().describe('City name or coordinates'),
  hours: z.number().int().min(1).max(168).optional().default(24).describe('Number of hours to forecast (max 168)'),
}).strict();

const hourlyWeatherOutputSchema = z.array(z.object({
  time: z.string(),
  temperature: z.number(),
  feelsLike: z.number(),
  humidity: z.number(),
  precipitation: z.number(),
  windSpeed: z.number(),
  conditions: z.string(),
}));

export const hourlyWeatherForecastTool = createTool({
  id: 'get-hourly-weather-forecast',
  description: 'Get hourly weather forecast for a location',
  inputSchema: hourlyWeatherInputSchema,
  outputSchema: hourlyWeatherOutputSchema,
  execute: async ({ input, runtimeContext }: ToolExecutionContext<typeof hourlyWeatherInputSchema> & {
    input: z.infer<typeof hourlyWeatherInputSchema>;
    runtimeContext?: RuntimeContext<WeatherRuntimeContext>;
  }): Promise<z.infer<typeof hourlyWeatherOutputSchema>> => {
    const temperatureScale = runtimeContext?.get('temperature-scale') || 'celsius';
    const debug = runtimeContext?.get('debug') || false;

    if (debug) {
      logger.info('Hourly weather forecast tool executed with runtime context', {
        temperatureScale,
        location: input.location,
        hours: input.hours,
      });
    }

    const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(input.location)}&count=1`;
    const geocodingResponse = await fetch(geocodingUrl);
    const geocodingData = (await geocodingResponse.json()) as GeocodingResponse;

    if (!geocodingData.results?.[0]) {
      throw new Error(`Location '${input.location}' not found`);
    }

    const { latitude, longitude } = geocodingData.results[0];

    const hourlyWeatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,wind_speed_10m,weather_code`;
    const response = await fetch(hourlyWeatherUrl);
    const data = (await response.json()) as HourlyWeatherResponse;

    const hourlyForecast = data.hourly.time.slice(0, input.hours).map((time, i) => {
      const temperature = temperatureScale === 'fahrenheit' ? (data.hourly.temperature_2m[i] * 9 / 5) + 32 : data.hourly.temperature_2m[i];
      const feelsLike = temperatureScale === 'fahrenheit' ? (data.hourly.apparent_temperature[i] * 9 / 5) + 32 : data.hourly.apparent_temperature[i];

      return {
        time: time,
        temperature: temperature,
        feelsLike: feelsLike,
        humidity: data.hourly.relative_humidity_2m[i],
        precipitation: data.hourly.precipitation[i],
        windSpeed: data.hourly.wind_speed_10m[i],
        conditions: getWeatherCondition(data.hourly.weather_code[i]),
      };
    });

    return hourlyWeatherOutputSchema.parse(hourlyForecast);
  },
});

interface HistoricalWeatherResponse {
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    wind_speed_10m_max: number[];
  };
}

const weatherHistoryInputSchema = z.object({
  location: z.string().describe('City name or coordinates'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').describe('Start date for historical data (ISO date string, e.g., 2023-01-01)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional().describe('End date for historical data (ISO date string, defaults to today)'),
}).strict();

const weatherHistoryOutputSchema = z.array(z.object({
  date: z.string(),
  maxTemp: z.number(),
  minTemp: z.number(),
  precipitation: z.number(),
  windSpeed: z.number(),
  conditions: z.string(),
}));

export const weatherHistoryTool = createTool({
  id: 'get-weather-history',
  description: 'Get historical weather data for a location within a specified date range',
  inputSchema: weatherHistoryInputSchema,
  outputSchema: weatherHistoryOutputSchema,
  execute: async ({ input }: ToolExecutionContext<typeof weatherHistoryInputSchema> & {
    input: z.infer<typeof weatherHistoryInputSchema>;
  }): Promise<z.infer<typeof weatherHistoryOutputSchema>> => {
    const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(input.location)}&count=1`;
    const geocodingResponse = await fetch(geocodingUrl);
    const geocodingData = (await geocodingResponse.json()) as GeocodingResponse;

    if (!geocodingData.results?.[0]) {
      throw new Error(`Location '${input.location}' not found`);
    }

    const { latitude, longitude } = geocodingData.results[0];

    const startDate = new Date(input.startDate);
    const endDate = input.endDate ? new Date(input.endDate) : new Date();
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const historicalWeatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&past_days=${diffDays}&start_date=${input.startDate}&end_date=${input.endDate || new Date().toISOString().split('T')[0]}`;
    const response = await fetch(historicalWeatherUrl);
    const data = (await response.json()) as HistoricalWeatherResponse;

    if (!data.daily) {
      return [];
    }

    const historicalData = data.daily.time.map((time, i) => ({
      date: time,
      maxTemp: data.daily.temperature_2m_max[i],
      minTemp: data.daily.temperature_2m_min[i],
      precipitation: data.daily.precipitation_sum[i],
      windSpeed: data.daily.wind_speed_10m_max[i],
      conditions: getWeatherCondition(data.daily.weather_code[i]),
    }));

    return weatherHistoryOutputSchema.parse(historicalData);
  },
});

function getWeatherCondition(code: number): string {
  const conditions: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };
  return conditions[code] || 'Unknown';
}


