/**
 * Environment configuration for AI-Volt
 * Validates and exports environment variables
 */

import { z } from "zod";


// Define environment schema
const envSchema = z.object({
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  PORT: z.coerce.number().default(3141),
  LANGFUSE_TRACING: z.string().default("true").transform((val) => val === "true"),
  FACTORY: z.string().default("true").transform((val) => val === "true"),
  // OpenAI API Key (required for OpenAI models)
  OPENAI_API_KEY: z.string().optional(),
  // Google API Key for Generative AI (required for Google models)
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  // Upstash Redis configuration (optional for logging)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  // Upstash Vector configuration
  UPSTASH_VECTOR_REST_URL: z.string().url().optional(),
  UPSTASH_VECTOR_REST_TOKEN: z.string().optional(),
  // Upstash Vector 2 configuration (for 1536-dimension embeddings)
  UPSTASH_VECTOR_REST_URL2: z.string().url().optional(),
  UPSTASH_VECTOR_REST_TOKEN2: z.string().optional(),
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
  NEEDLE_URL: z.string().url().default("https://api.needle.com/v1"),
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
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join(".")}: ${err.message}`);
      });
    }
    process.exit(1);
  }
};

export const env = validateEnv();

export type Environment = z.infer<typeof envSchema>;
