import { Memory } from "@mastra/memory";
import { PostgresStore, PgVector } from "@mastra/pg";
 
// PostgreSQL connection details
const host = "localhost";
const port = 5432;
const user = "postgres";
const database = "postgres";
const password = "postgres";
const connectionString = `postgresql://${user}:${password}@${host}:${port}`;
 
// Initialize memory with PostgreSQL storage and vector search
export const pgmemory = new Memory({
  storage: new PostgresStore({
    host,
    port,
    user,
    database,
    password,
  }),
  vector: new PgVector({ connectionString }),
  options: {
    lastMessages: 10,
    semanticRecall: {
      topK: 3,
      messageRange: 2,
    },
  },
});
 
