import { Inngest } from "inngest";
import { realtimeMiddleware } from "@inngest/realtime";

export const inngest = new Inngest({
  id: "mastra",
  baseUrl:"http://host.docker.internal:4111/api/inngest",
  // Optional: Enable CORS for the Inngest API
  isDev: true,
  // Optional: Enable local functions for development
  // This allows you to run functions locally without deploying them
  localfns: true,
  middleware: [realtimeMiddleware()],
});