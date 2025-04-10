import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { PLANNING_SYSTEM_INSTRUCTIONS } from "../../lib/prompts/instructions";
 
export const PlanningAgent = new Agent({
  name: "Planning Agent",
  instructions: PLANNING_SYSTEM_INSTRUCTIONS,
  model: openai("gpt-4o"),
});
