import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Terminate Tool
 * @description タスク完了時、または続行不可能な時に対話を終了させるためのツール
 */
export const terminate = createTool({
  id: "terminate",
  description: "Terminate the interaction when finished or unable to continue.",
  inputSchema: z.object({
    status: z.enum(["success", "failure"]).describe("The finish status of the interaction."),
  }),
  outputSchema: z.object({
    message: z.string(),
  }),
  execute: async ({ context }) => {
    const { status } = context;
    return {
      message: `The interaction has been completed with status: ${status}`,
    };
  },
});
