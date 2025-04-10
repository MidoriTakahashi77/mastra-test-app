import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

export const LLMAgent = new Agent({
  name: "LLMAgent",
  model: openai("gpt-4o"),
  instructions: `
  You are a high-performance general-purpose language model.
  Please follow the given prompt faithfully, understand the intent of the instructions accurately, and produce clear and concise outputs.
  `,
});
