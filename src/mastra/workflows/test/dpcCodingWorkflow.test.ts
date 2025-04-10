// 実行テスト用　TODO：内容のテストも実施する
import { dpcCodingReActWorkflow } from "../../workflows/DpcCodingReActWorkflow";
import fs from "fs";

describe("dpcCodingReActWorkflow ユーザー入力テスト", () => {
  jest.setTimeout(120_000);

  const testQuery = "@dpcCoding, 12月の副傷病患者リストを作成してください";
  const expectedKeywords = ["副傷病", "リスト"]; // 最低限期待されるワードで評価

  test("ユーザー入力から副傷病推論ワークフローを実行し、レポートを取得できること", async () => {
    const { runId, start } = dpcCodingReActWorkflow.createRun();
    console.log(`🧪 Workflow Run ID: ${runId}`);

    const result = await start({
      triggerData: {
        topic: testQuery,
        runId,
      },
    });

    let report = "";
    const finalReportResult = result?.results?.generateSuggestions;
    if (finalReportResult && finalReportResult.status === "success") {
      report = finalReportResult.output.report;
    } else {
      report = "[Error] generateSuggestions step did not succeed";
    }

    const normalize = (s: any) =>
      typeof s === "string" ? s.toLowerCase().replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/gi, "") : "";

    const passed = expectedKeywords.every(keyword =>
      normalize(report).includes(normalize(keyword))
    );

    const log = `
      [${passed ? "✅ PASS" : "❌ FAIL"}] dpcCodingReActWorkflow
      Query: ${testQuery}
      Expected Keywords: ${expectedKeywords.join(", ")}
      Got: ${report}
      -------------------------------------------------
    `;

    console.log(log);
    await fs.promises.appendFile("dpcCodingWorkflowTestResults.txt", log);

    expect(passed).toBe(true);
  });
});
