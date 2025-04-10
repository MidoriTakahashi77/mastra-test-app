import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import FirecrawlApp from '@mendable/firecrawl-js';
import { logger } from '../logger';

const app = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY || '',
});

export const search = createTool({
  id: "search",
  description:
    "Search for web pages. Normally you should call the extract tool after this one to get a spceific data point if search doesn't the exact data you need.",
  inputSchema: z.object({
    query: z
      .string()
      .describe('Search query to find relevant web pages'),
    maxResults: z
      .number()
      .optional()
      .default(10)
      .describe('Maximum number of results to return (default 10)'),
  }),
  outputSchema: z.object({
    data: z.array(z.object({
      url: z.string(),
      title: z.string(),
      description: z.string(),
      favicon: z.string(),
    })).optional(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { query, maxResults } = context;
    // Replace with actual search implementation
    const searchResult = await app.search(query);

    if (!searchResult.success) {
      return {
        error: `Search failed: ${searchResult.error}`,
        success: false,
      };
    }

    // Add favicon URLs to search results
    const data: { url: string; title: string; description: string; favicon: string }[] = searchResult.data.map((result: any) => {
      const urlObj = new URL(result.url);
      const favicon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
      return {
        url: result.url,
        title: result.title || '',
        description: result.description || '',
        favicon,
      };
    });

    logger.info(`🔍[search] Search results:`, data);

    return {
      data,
      success: true,
    };
  },
});