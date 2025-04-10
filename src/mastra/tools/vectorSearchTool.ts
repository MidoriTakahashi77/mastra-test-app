// src/tools/search.ts
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { qdrantVector } from "../vectors/qdrant";

export const vectorSearchTool = createTool({
  id: "vector-search",
  description: "クエリをベクトルに変換してQdrantで類似文書を検索します",
  inputSchema: z.object({
    indexName: z.string().describe("検索対象のインデックス名"),
    query: z.string().describe("検索したいキーワードや文"),
    topK: z.number().default(5).describe("上位何件の結果を取得するか"),
    source: z.string().optional().describe("データソースの名前"),
  }),
  outputSchema: z.object({
    results: z.array(z.any()),
  }),
  execute: async ({ context }) => {
    const { indexName, query, topK } = context;

    const { embedding } = await embed({
      value: query,
      model: openai.embedding("text-embedding-3-small"),
    });

    const results = await qdrantVector.query({
      indexName: indexName,
      queryVector: embedding,
      topK,
    });

    return {
      results,
    };
  },
});
