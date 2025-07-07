import { FirecrawlIntegration } from '@mastra/firecrawl'; // This is the confirmed correct import
import { z } from 'zod';
import { createTool } from '@mastra/core';

const firecrawl = new FirecrawlIntegration({
  config: {
    API_KEY: process.env.FIRECRAWL_API_KEY as string,
  },
});

const firecrawlCrawlInputSchema = z.object({
  url: z.string().url().describe('The URL to crawl.'),
  pageOptions: z.object({
    onlyMainContent: z.boolean().optional().describe('Whether to extract only the main content of the page.'),
    includeHtml: z.boolean().optional().describe('Whether to include the raw HTML content.'),
    includeMarkdown: z.boolean().optional().describe('Whether to include the markdown content.'),
    includeText: z.boolean().optional().describe('Whether to include the plain text content.'),
  }).optional().describe('Options for page extraction.'),
  crawlOptions: z.object({
    maxPagesToCrawl: z.number().int().positive().optional().describe('Maximum number of pages to crawl.'),
    maxDepth: z.number().int().nonnegative().optional().describe('Maximum depth for crawling.'),
    returnOnlyUrls: z.boolean().optional().describe('Whether to return only URLs instead of content.'),
    followSpamLinks: z.boolean().optional().describe('Whether to follow spam links.'),
    limitOptions: z.object({
      maxTokens: z.number().int().positive().optional().describe('Maximum tokens to extract per page.'),
      maxCharacters: z.number().int().positive().optional().describe('Maximum characters to extract per page.'),
    }).optional().describe('Limit options for crawling.'),
  }).optional().describe('Options for crawling behavior.'),
});

const firecrawlCrawlOutputSchema = z.object({
  success: z.boolean(),
  data: z.unknown(), // Changed from z.any()
});

export const firecrawlCrawlTool = createTool({
  id: 'firecrawl_crawl',
  description: 'Crawl a website and extract all its content.',
  inputSchema: firecrawlCrawlInputSchema,
  outputSchema: firecrawlCrawlOutputSchema,
  execute: async ({ context }) => {
    try {
      const { crawlUrls } = firecrawl.getStaticTools();
      const result = await crawlUrls.execute!({ url: context.url, pageOptions: context.pageOptions, crawlOptions: context.crawlOptions });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, data: (error as Error).message };
    }
  },
});

const firecrawlExtractInputSchema = z.object({
  url: z.string().url().describe('The URL to extract content from.'),
  pageOptions: z.object({
    onlyMainContent: z.boolean().optional().describe('Whether to extract only the main content of the page.'),
    includeHtml: z.boolean().optional().describe('Whether to include the raw HTML content.'),
    includeMarkdown: z.boolean().optional().describe('Whether to include the markdown content.'),
    includeText: z.boolean().optional().describe('Whether to include the plain text content.'),
  }).optional().describe('Options for page extraction.'),
});

const firecrawlExtractOutputSchema = z.object({
  success: z.boolean(),
  data: z.unknown(), // Changed from z.any()
});

export const firecrawlExtractTool = createTool({
  id: 'firecrawl_extract',
  description: 'Extract content from a single URL.',
  inputSchema: firecrawlExtractInputSchema,
  outputSchema: firecrawlExtractOutputSchema,
  execute: async ({ context }) => {
    try {
      const { scrapeAndExtractFromUrl } = firecrawl.getStaticTools();
      const result = await scrapeAndExtractFromUrl.execute!({ url: context.url, pageOptions: context.pageOptions });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, data: (error as Error).message };
    }
  },
});


const firecrawlGetCrawlStatusInputSchema = z.object({
  crawlId: z.string().describe('The ID of the crawl to get the status for.'),
});

const firecrawlGetCrawlStatusOutputSchema = z.object({
  success: z.boolean(),
  data: z.unknown(),
});

export const firecrawlGetCrawlStatusTool = createTool({
  id: 'firecrawl_get_crawl_status',
  description: 'Get the status of a specific crawl.',
  inputSchema: firecrawlGetCrawlStatusInputSchema,
  outputSchema: firecrawlGetCrawlStatusOutputSchema,
  execute: async ({ context }) => {
    try {
      const { getCrawlStatus } = firecrawl.getStaticTools();
      const result = await getCrawlStatus.execute!({ crawlId: context.crawlId });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, data: (error as Error).message };
    }
  },
});

const firecrawlCancelCrawlInputSchema = z.object({
  crawlId: z.string().describe('The ID of the crawl to cancel.'),
});

const firecrawlCancelCrawlOutputSchema = z.object({
  success: z.boolean(),
  data: z.unknown(),
});

export const firecrawlCancelCrawlTool = createTool({
  id: 'firecrawl_cancel_crawl',
  description: 'Cancel a specific crawl.',
  inputSchema: firecrawlCancelCrawlInputSchema,
  outputSchema: firecrawlCancelCrawlOutputSchema,
  execute: async ({ context }) => {
    try {
      const { cancelCrawl } = firecrawl.getStaticTools();
      const result = await cancelCrawl.execute!({ crawlId: context.crawlId });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, data: (error as Error).message };
    }
  },
});

const firecrawlMapUrlsInputSchema = z.object({
  url: z.string().url().describe('The URL to map.'),
  maxDepth: z.number().int().nonnegative().optional().describe('Maximum depth for mapping.'),
});

const firecrawlMapUrlsOutputSchema = z.object({
  success: z.boolean(),
  data: z.unknown(),
});

export const firecrawlMapUrlsTool = createTool({
  id: 'firecrawl_map_urls',
  description: 'Map URLs from a given starting URL.',
  inputSchema: firecrawlMapUrlsInputSchema,
  outputSchema: firecrawlMapUrlsOutputSchema,
  execute: async ({ context }) => {
    try {
      const { mapUrls } = firecrawl.getStaticTools();
      const result = await mapUrls.execute!({ url: context.url, maxDepth: context.maxDepth });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, data: (error as Error).message };
    }
  },
});