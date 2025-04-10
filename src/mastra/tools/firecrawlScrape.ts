import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import FirecrawlApp from '@mendable/firecrawl-js';
import { logger } from '../logger';

const app = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY || '',
});

export const scrape = createTool({
  id: 'scrape',
  description:
    'Scrape web pages. Use this to get from a page when you have the url.',
  inputSchema: z.object({
    url: z.string().describe('URL to scrape'),
  }),
  outputSchema: z.object({
    data: z.any().optional(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { url } = context;
    try {
      const scrapeResult = await app.scrapeUrl(url);

      if (!scrapeResult.success) {
        return {
          error: `Failed to extract data: ${scrapeResult.error}`,
          success: false,
        };
      }

      logger.info(`🐈scrapeResult, ${scrapeResult}, ${url}`);

      return {
        data:
          scrapeResult.markdown ??
          'Could get the page content, try using search or extract',
        success: true,
      };
    } catch (error: any) {
      logger.info('Extraction error:', error);
      logger.info(error.message);
      logger.info(error.error);
      return {
        error: `Extraction failed: ${error.message}`,
        success: false,
      };
    }
  },
});
