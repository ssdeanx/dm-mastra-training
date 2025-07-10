import { executeTool } from 'freestyle-sandboxes/mastra';

/**
 * Creates a Freestyle tool instance for serverless code execution.
 * This tool can be integrated into Mastra agents to enable dynamic code execution.
 *
 * @param {object} [options] - Configuration options for the Freestyle tool.
 * @param {Record<string, string>} [options.nodeModules] - Optional dictionary of npm packages to make available to the sandbox.
 * @param {Record<string, string>} [options.envVars] - Optional dictionary of environment variables to make available to the sandbox.
 * @returns {any} A configured Freestyle executor tool ready for use by Mastra agents.
 * @throws {Error} If FREESTYLE_API_KEY is not set in environment variables.
 */
export function createFreestyleTool(p0: unknown, options?: {
  nodeModules?: Record<string, string>;
  envVars?: Record<string, string>;
}): ReturnType<typeof executeTool> { // Use precise return type instead of any
  const apiKey = process.env.FREESTYLE_API_KEY;

  if (!apiKey) {
    throw new Error("FREESTYLE_API_KEY is not set. Please add it to your .env file.");
  }

  return executeTool({
    apiKey,
    nodeModules: options?.nodeModules,
    envVars: options?.envVars,
  });
}