import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { tavily, TavilySearchOptions } from "@tavily/core"
import 'dotenv/config';

// Tavily検索ツールの作成
export const tavilyExtractTool = createTool({
  id: 'tavily-extract',
  description: 'Extract full text and optional images from specified web pages using the Tavily Extract API.',
  inputSchema: z.object({
    urls: z
      .array(z.string())
      .min(1)
      .describe("List of URLs to extract content from. Example: ['https://en.wikipedia.org/wiki/Artificial_intelligence']"),
    include_images: z
      .boolean()
      .optional()
      .describe("Whether to include images in the response. Defaults to false."),
    extract_depth: z
      .enum(["basic", "advanced"])
      .default("basic")
      .describe("Extraction depth. 'basic' is fast and lightweight, 'advanced' is more thorough but slower."),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        url: z.string(),
        rawContent: z.string().nullable().optional(),
        images: z.array(z.string()).optional(),
      })
    ),
    failedResults: z
      .array(
        z.object({
          url: z.string(),
          error: z.string(),
        })
      )
      .optional(),
    responseTime: z.number().optional(),
  }),  
  execute: async ({ context: { urls, include_images = false, extract_depth = "basic" }  }) => {
    const tavilyClient =  tavily({ apiKey: process.env.TAVILY_API_KEY });

    const tavilySearchOptions: TavilySearchOptions = {
      searchDepth: "basic",
    }

    try {
      const response = await tavilyClient.extract(urls, tavilySearchOptions);
      console.log('🌙Tavily Extract Response:', response);
      return response;
    } catch (error) {
      console.error('Tavily Search Error:', error);
      throw new Error('Error during Tavily search');
    }
  },
});
