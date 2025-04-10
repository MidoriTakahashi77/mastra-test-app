// GAIA用の出力形式
import { Workflow, Step } from "@mastra/core/workflows";
import { z } from "zod";
import { tavilySearchTool } from "../../tools/tavilySearch";
import { ReasoningAgent } from "../../agents/ReasoningAgent";
import { LLMAgent } from "../../agents/LLMAgent";
import { logger } from "../../../logger";

const loopStep = new Step({
  id: "loopStep",
  inputSchema: z.object({
    nextQuery: z.string(),
  }),
  outputSchema: z.object({
    summary: z.string(),
    shouldContinue: z.boolean(),
    nextTopic: z.string().optional(),
  }),
  execute: async ({ context }) => {
    logger.info("++++++++++++Executing loopStep...++++++++++++++++++");
    const prevReasoning = context.getStepResult<{ nextTopic?: string }>('loopStep');
    const query = prevReasoning?.nextTopic || context.getStepResult('trigger').topic;
    const reducedQuery = query.slice(0, 400);
    logger.info(`🔍 [queryReducer] Reduced Query: ${reducedQuery}`);

    // Search & Extract
    const searchResult = await tavilySearchTool.execute?.({ context: { query: reducedQuery } });
    if (!searchResult) throw new Error("Search failed");

    logger.info(`🔎 [loopStep] Searching Result: ${JSON.stringify(searchResult)}`);

    // reasoning
    const extractJson = JSON.stringify(searchResult);
    const reasoningPrompt = `
      You are an AI researcher executing a fact-finding mission.

      Analyze the following extracted web data about the topic: "${query}"

      Your goals:
      1. Determine the **final answer** to the query, if the data is sufficient.
      2. If the answer is **clearly found**, include it in the finalAnswer field and set shouldContinue to false.
      3. If the answer is **not found or unclear**, set shouldContinue to true and suggest a nextTopic or urlToSearch for further investigation.

      Respond in the following **JSON format only**, without code blocks or commentary:

      {
        "summary": "Concise summary of what was found",
        "finalAnswer": "Explicit final answer if available, otherwise empty string",
        "shouldContinue": true or false,
        "nextTopic": "optional next topic or empty string",
        "urlToSearch": "optional URL to focus search or empty string"
      }

      Extracted Data (JSON):
      ${extractJson}
    `;
    const response = await ReasoningAgent.generate(reasoningPrompt);

    const cleanedText = response.text
      .replace(/```json\s*/i, '')  // ```json を除去
      .replace(/```/, '')          // 終端の ``` を除去

    const parsed = JSON.parse(cleanedText);

    logger.info(`🍺 [loopStep] Summary: ${parsed.summary}, nextTopic: ${parsed.nextTopic}, finalAnswer: ${parsed.finalAnswer}, continue: ${parsed.shouldContinue}`);

    return {
      summary: parsed.summary,
      shouldContinue: parsed.shouldContinue,
      nextTopic: parsed.nextTopic,
    };
  },
});

const finalReport = new Step({
  id: "finalReport",
  inputSchema: z.object({}),
  outputSchema: z.object({ report: z.string() }),
  execute: async ({ context }) => {
    const loopStepResult = context.getStepResult('loopStep');
    const query = context.getStepResult('trigger').topic;

    const prompt = `
      以下はAIエージェントの実行ログです。この内容に基づき、${JSON.stringify(query)}に対する単語や数字など明確な回答のみ答えてください。
      例: Final answer: "17"

      === ログ内容 ===
      ${JSON.stringify(loopStepResult)}

      === 回答 ===
      "Final answer: <your answer here>".

      回答が不明な場合は、どのようなツールがあれば解決できるかを考えて以下のように回答してください。
      例: "Final answer: <your answer here>. <ツール名>があれば<理由>のため、この問題を解決できるかもしれません。"
    `;
    console.log("Prompt for final report:", prompt);

    const response = await LLMAgent.generate(prompt);
    logger.info(`📝 [finalReport] Report: ${response.text}`);
    return { report: response.text };
  },
});

export const deepReserchWorkflowForGaia = new Workflow({
  name: "deepReserchWorkflowForGaia",
  triggerSchema: z.object({
    topic: z.string().describe("The topic to research deeply"),
  }),
});

let loopCount = 0;
const maxLoop = 5;

deepReserchWorkflowForGaia
  .step(loopStep, {
    variables: {
      nextQuery: { step: "trigger", path: "topic" },
    },
  })
  .until(
    async ({ context }) => {
      loopCount++;
      const reasoning = context.getStepResult(loopStep);
      logger.info(`🌀 Loop ${loopCount}, shouldContinue: ${reasoning?.shouldContinue}`);
      return !reasoning?.shouldContinue || loopCount >= maxLoop;
    },
    loopStep
  )
  .then(finalReport)
  .commit();

export default deepReserchWorkflowForGaia;
