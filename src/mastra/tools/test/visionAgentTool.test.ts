// src/mastra/tools/test/imageQaTool.test.ts
import { visionAgentTool } from "../visionAgentTool";

test("Vision Agent Tool - Local Image", async () => {
  const result = await visionAgentTool.execute!({
    context: {
      imagePath: "src/mastra/tools/test/data/screenshot-2025-04-07T03-05-59-802Z.png",
      question: "最も大きな文章は何と書いてありますか？",
    },
  });

  expect(result.answer).toMatch(/example/i)
});

test("Vision Agent Tool - Remote Image", async () => {
  const result = await visionAgentTool.execute!({
    context: {
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/b/bf/Wikipedia-logo-test.png",
      question: "最も大きな文章は何と書いてありますか？",
    },
  });

  expect(result.answer).toMatch(/WIKIPEDIA/i)
});

test("Vision Agent Tool - PDF", async () => {
  const result = await visionAgentTool.execute!({
    context: {
      imagePath: "src/mastra/tools/test/data/sample.pdf",
      question: "最も大きな文章は何と書いてありますか？",
    },
  });

  expect(result.answer).toMatch(/example/i)
});