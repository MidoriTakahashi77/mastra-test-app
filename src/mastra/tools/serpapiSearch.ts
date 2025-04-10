import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { getJson } from "serpapi";
import 'dotenv/config';

// SerpAPIの検索機能を実行する関数
const serpapiSearch = async (query: string) => {
  const serpapiKey = process.env.SREPAPI_KEY;
  
  if (!serpapiKey) {
    throw new Error("Missing SerpAPI key.");
  }

  const params: any = {
    engine: "google",
    api_key: serpapiKey,
    q: query,
    location: "Japan",
  };

 try { 
    const response = await getJson(params);
    const links = response.organic_results?.map((result: any) => ({
      link: result.link,
    })) || [];
    return links; 
  } catch (error) {
    console.error("Error fetching data from SerpAPI:", error);
    throw new Error("Failed to fetch data from SerpAPI.");
  }
}

export const serpApiSearchTool = createTool({
  id: "serpapi-search",
  inputSchema: z.object({
    query: z.string()
  }),
  outputSchema: z.object({
    content: z.array(
      z.object({
        link: z.string(),
      })
    ),
  }),
  description: "Performs a Google search using SerpAPI and returns the results.",
  execute: async ({ context: { query } }) => {
    try {
      const content = await serpapiSearch(query);

      return { content: content };

    } catch (error: any) {
      console.error("Search error:", error);
      return { content: `Search failed: ${error.message}` };
    }
  },
});
