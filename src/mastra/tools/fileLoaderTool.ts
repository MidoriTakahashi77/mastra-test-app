import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { parse } from "csv-parse/sync";
import 'dotenv/config';

// __dirname 相当を取得
const projectRoot = process.env.PROJECT_ROOT
  ? path.resolve(process.cwd(), process.env.PROJECT_ROOT)
  : process.cwd();

export const fileLoaderTool = createTool({
  id: "file-loader",
  description: "ファイル名を指定して内容を読み込むツール（CSV/JSON/TXT対応）",
  inputSchema: z.object({
    fileName: z.string(),
  }),
  outputSchema: z.object({
    text: z.string(),
  }),
  execute: async ({ context }) => {
    const { fileName } = context;
    const filePath = path.resolve(projectRoot, fileName);
    const ext = path.extname(fileName).toLowerCase();

    const contentBuffer = await fs.readFile(filePath);
    const content = contentBuffer.toString("utf-8");

    if (ext === ".csv" || ext === ".tsv") {
      const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ext === ".tsv" ? "\t" : ",",
      });
      const text = records
        .map((row: Record<string, string>, idx: number) => `# Row ${idx + 1}\n` + Object.entries(row).map(([k, v]) => `- ${k}: ${v}`).join("\n"))
        .join("\n\n");
      return { text };
    }

    if (ext === ".json") {
      const json = JSON.parse(content);
      const text = JSON.stringify(json, null, 2);
      return { text };
    }

    // 通常のテキスト（.txt など）
    return { text: content };
  },
});
