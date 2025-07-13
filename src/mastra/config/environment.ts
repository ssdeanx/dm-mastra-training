/**
 * Environment configuration for AI-Volt
 * Validates and exports environment variables
 */

import { z } from "zod";


// Define environment schema
const envSchema = z.object({
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  PORT: z.coerce.number().default(4111),
  LANGFUSE_TRACING: z.string().default("true").transform((val) => val === "true"),
  // Factory type for the application, defaulting to 'gemini'
  FACTORY: z.enum(["gemini", "default"]).default("gemini"),
  // OpenAI API Key (required for OpenAI models)
  OPENAI_API_KEY: z.string().optional(),
  // Google API Key for Generative AI (required for Google models)
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  // Upstash Redis configuration
  UPSTASH_REDIS_REST_URL: z.string().url('Invalid Upstash Redis URL').optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, 'Upstash Redis token required').optional(),

  // Upstash Vector configuration
  UPSTASH_VECTOR_REST_URL: z.url('Invalid Upstash Vector URL').optional(),
  UPSTASH_VECTOR_REST_TOKEN: z.string().min(1, 'Upstash Vector token required').optional(),

  // The Odds API configuration
  THE_ODDS_API_KEY: z.string().optional(),
  ALPHA_VANTAGE_API_KEY: z.string().optional(),
  // Diffbot configuration for web scraping
  DIFFBOT_API_KEY: z.string().optional(),
  // Nango secret key for managing OAuth connections
  NANGO_SECRET_KEY: z.string().optional(),
  // Nango URL for OAuth callback
  NANGO_URL: z.string().url().default("https://api.nango.dev/oauth/callback"),
  // Needle API key
  NEEDLE_API_KEY: z.string().optional(),
  // Needle URL
  NEEDLE_URL: z.url().default("https://api.needle.com/v1"),
  // Needle project ID
  NEEDLE_PROJECT_ID: z.string().optional(),

});

// Validate environment variables
const validateEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error("❌ Environment validation failed:");
    if (error instanceof z.ZodError) {
      error.issues.forEach((issue) => {
        console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
      });
    }
    process.exit(1);
  }
};

export const env = validateEnv();

export type Environment = z.infer<typeof envSchema>;
