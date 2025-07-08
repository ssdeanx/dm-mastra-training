import { Inngest } from "inngest";
import { realtimeMiddleware } from "@inngest/realtime";

export const inngest = new Inngest({
  id: "mastra",
  baseUrl:"http://localhost:8288",
  isDev: true,
  middleware: [realtimeMiddleware()],
});