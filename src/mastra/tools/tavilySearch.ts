import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { tavily, TavilySearchOptions } from "@tavily/core"
import 'dotenv/config';

// Tavily検索ツールの作成
export const tavilySearchTool = createTool({
  id: 'tavily-search',
  description: 'Search the public web to find relevant information or answers to the user\'s query.',
  inputSchema: z.object({
    query: z.string().describe("The search query to be sent to the Tavily engine (e.g., 'climate change policies 2023')"),
  }),
  execute: async ({ context: { query } }) => {
    const tavilyClient =  tavily({ apiKey: process.env.TAVILY_API_KEY });

    const tavilySearchOptions: TavilySearchOptions = {
      searchDepth: "basic",
    }

    try {
      const response = await tavilyClient.search(query, tavilySearchOptions);
      return response;
    } catch (error) {
      console.error('Tavily Search Error:', error);
      throw new Error('Error during Tavily search');
    }
  },
});
