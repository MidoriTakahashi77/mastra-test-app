// src/mastra/tools/playwrightTool.ts
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { PageVisitTool } from "./helper/playwright";

export const playwrightTool = createTool({
  id: "playwright",
  inputSchema: z.object({
    url: z.string().describe("The URL of the page to visit. Example: 'https://example.com'"),
  }),
  outputSchema: z.object({
    screenshotPath: z.string(),
  }),
  description: "Visit a URL and take a screenshot using a headless browser.",
  execute: async ({ context: { url } }) => {
    // PageVisitToolのインスタンスを作成
    const pageVisitTool = new PageVisitTool();

    // 指定されたURLを訪問
    await pageVisitTool.visitPage(url);

    // スクリーンショットのパスを返す
    return { screenshotPath: `screenshot-${new Date().toISOString().replace(/[:.]/g, '-')}.png` };
  },
});
