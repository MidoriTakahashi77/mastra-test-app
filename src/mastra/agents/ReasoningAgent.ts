import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { REASONING_SYSTEM_INSTRUCTIONS } from '../../lib/prompts/instructions';

export const ReasoningAgent = new Agent({
  name: "Reasoning Agent",
  model: openai("gpt-4o"),
  instructions: REASONING_SYSTEM_INSTRUCTIONS
});
