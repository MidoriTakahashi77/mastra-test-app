import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import fs from "fs";
import path from "path";
import 'dotenv/config';

export const visionAgentTool = createTool({
  id: "vision-agent",
  description: "Answer questions about an image or PDF file using o1. Accepts either a local file path or a public image URL.",
  inputSchema: z.object({
    imagePath: z
      .string()
      .optional()
      .describe("Path to a local image or PDF file. Supports: .png, .jpg, .jpeg, .pdf"),
    imageUrl: z
      .string()
      .url()
      .optional()
      .describe("A publicly accessible image URL."),
    question: z
      .string()
      .default("この画像には何が写っていますか？")
      .describe("Question about the image or PDF."),
  }).refine(
    (data) => data.imagePath || data.imageUrl,
    {
      message: "You must provide either 'imagePath' or 'imageUrl'",
      path: ["imagePath", "imageUrl"],
    }
  ),
  outputSchema: z.object({
    answer: z.string().describe("Answer based on visual content."),
  }),
  execute: async ({ context: { imagePath, imageUrl, question } }) => {
    const content: any[] = [{ type: "text", text: question }];

    if (imageUrl) {
      // URLからの画像処理
      content.push({
        type: "image",
        image: imageUrl,
      });
    } else if (imagePath) {
      const ext = path.extname(imagePath).toLowerCase();

      if (!fs.existsSync(imagePath)) {
        throw new Error(`File not found: ${imagePath}`);
      }

      if ([".png", ".jpg", ".jpeg"].includes(ext)) {
        content.push({
          type: "image",
          image: fs.readFileSync(imagePath),
          mimeType: `image/${ext.replace(".", "")}`,
          filename: path.basename(imagePath),
          providerOptions: {
            openai: { imageDetail: "auto" },
          },
        });
      } else if (ext === ".pdf") {
        content.push({
          type: "file",
          data: fs.readFileSync(imagePath),
          mimeType: "application/pdf",
          filename: path.basename(imagePath),
        });
      } else {
        throw new Error(`Unsupported file extension: ${ext}`);
      }
    }

    const result = await generateText({
      model: openai("gpt-4o"),
      messages: [
        {
          role: "user",
          content,
        },
      ],
    });

    return { answer: result.text };
  },
});
