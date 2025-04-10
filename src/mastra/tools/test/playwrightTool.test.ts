// npm test playwrightTool.test.ts
import { playwrightTool } from "../playwrightTool";

test("should visit a page and take a screenshot", async () => {
  const url = "https://example.com";

  const result = await playwrightTool.execute!({
    context: { url }
  });

  expect(result.screenshotPath).toMatch(/screenshot-/);
  console.log("✅ Screenshot saved at:", result.screenshotPath);
});
