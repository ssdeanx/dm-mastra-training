import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { PinoLogger } from "@mastra/loggers";
import * as fs from "fs/promises";
import * as path from "path";

const logger = new PinoLogger({ name: 'CodeSearchTool', level: 'info' });

// Input Schema
const codeSearchInputSchema = z.object({
  regexPattern: z.string().describe("The regex pattern to search for."),
  filePathPattern: z.string().optional().describe("Glob pattern to filter files (e.g., '*.ts', 'src/**/*.ts')."),
  directory: z.string().optional().describe("Directory to search within (defaults to project root)."),
  includeContent: z.boolean().default(true).describe("Whether to include the full content of matching lines.")
}).strict();

// Output Schema
const codeSearchOutputSchema = z.object({
  results: z.array(z.object({
    filePath: z.string().describe("Path to the file where a match was found."),
    lineNumber: z.number().int().positive().describe("Line number of the match."),
    matchedText: z.string().describe("The text that matched the regex pattern."),
    contextLine: z.string().optional().describe("The full line of content where the match occurred (if includeContent is true).")
  })).describe("Array of matching code snippets."),
  totalMatches: z.number().int().min(0).describe("Total number of matches found across all files."),
  filesScanned: z.number().int().min(0).describe("Total number of files scanned.")
}).strict();

export const codeSearchTool = createTool({
  id: "code-search",
  description: "Performs regex-based searches across project files, returning matching code snippets.",
  inputSchema: codeSearchInputSchema,
  outputSchema: codeSearchOutputSchema,
  execute: async ({ context }) => {
    logger.info('Starting code search', { 
      regexPattern: context.regexPattern,
      filePathPattern: context.filePathPattern,
      directory: context.directory,
    });

    const results: z.infer<typeof codeSearchOutputSchema>['results'] = [];
    let filesScanned = 0;
    const searchDirectory = context.directory || process.cwd(); // Default to current working directory

    try {
      const regex = new RegExp(context.regexPattern, 'g');

      async function* walk(dir: string): AsyncGenerator<string> {
        for await (const dirent of await fs.opendir(dir)) {
          const entry = path.join(dir, dirent.name);
          if (dirent.isDirectory()) {
            yield* walk(entry);
          } else if (dirent.isFile()) {
            yield entry;
          }
        }
      }

      for await (const filePath of walk(searchDirectory)) {
        filesScanned++;
        if (context.filePathPattern && !filePath.match(new RegExp(context.filePathPattern))) {
          continue;
        }

        const fileContent = await fs.readFile(filePath, 'utf-8');
        const lines = fileContent.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const index = i;
          let match;
          while ((match = regex.exec(line)) !== null) {
            results.push({
              filePath: path.relative(process.cwd(), filePath),
              lineNumber: index + 1,
              matchedText: match[0],
              contextLine: context.includeContent ? line : undefined,
            });
          }
        }
      }

      logger.info('Code search completed', {
        totalMatches: results.length,
        filesScanned: filesScanned,
      });

      return codeSearchOutputSchema.parse({
        results,
        totalMatches: results.length,
        filesScanned,
      });
    } catch (error) {
      logger.error('Code search failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new Error(`Code search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});
