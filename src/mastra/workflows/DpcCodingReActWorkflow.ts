// file-loaderでLLMが読み込むファイルを指定する
import { Workflow, Step } from "@mastra/core/workflows";
import { z } from "zod";
import path from "path";
import fs from "fs/promises";
import { ReasoningAgent } from "../agents/ReasoningAgent";
import { LLMAgent } from "../agents/LLMAgent";
import { vectorSearchTool } from "../tools/vectorSearchTool";
import { fileLoaderTool } from "../tools/fileLoaderTool";
import { visionAgentTool } from "../tools/visionAgentTool";
import { logger } from '../../logger';
import { resolveFromRoot } from "../../utils/path";
import 'dotenv/config';

const planningMemory = new Map<string, any>();
const planningStateMap = new Map<string, any>();
const collectedResults: Record<string, any[]> = {};

let loopCount = 0;
const maxLoop = 5;

const toolSelectAndExecuteStep = new Step({
  id: "toolSelectAndExecuteStep",
  inputSchema: z.object({
    query: z.string(),
    runId: z.string().optional()
  }),
  outputSchema: z.object({
    toolName: z.string(),
    result: z.any(),
  }),
  execute: async ({ context }) => {
    console.log("+++++++++++++ToolSelectAndExecuteStep+++++++++++++", loopCount);
    const runId = context.getStepResult("trigger")?.runId || `run-${Date.now()}`;
    const filePath = resolveFromRoot("documents", "DPCPDPS傷病名コーディングテキスト.pdf");
    console.log("filePath",filePath)
    const question = `あなたは、DPC/PDPS制度に基づいて副傷病を抽出するAIワークフローの専門家です。
    副傷病を抽出するための手順を検索し、実行計画を立ててください。
    
    以下のような形式で、「副傷病を抽出するための手順」をJSON配列で出力してください。
    
    各ステップには、以下の情報を必ず含めてください：
    - "step"（ステップ番号。1から順番）
    - "description"（そのステップでやること）
    - "query"（LLMまたはツールに渡す指示内容）
    - "toolName"（使用すべきツールの名前。次から選ぶ）:

    使用可能なツール一覧：
    - "file-loader"：カルテファイルやPDFを読み取る
    - "vector-search"：QdrantなどのベクトルDBでキーワード検索する
    - "think"：LLMを用いて考える
    - "create-table"：LLMを用いて表形式に変換する
    このPDFは傷病名コーディングテキストです。この文書を読み込み、toolやLLMを用いた副傷病を抽出するためのステップバイステップの実行計画を日本語でJSON形式で出力してください。
    
    vector-searchで検索可能な情報：
    - DPCPDPS傷病名コーディングテキスト.pdf
    - MDC_codes_and_corresponding_names_are_defined.csv
    - 分類コード.csv
    - 定義副傷病名.csv

    file-loaderで読み込むことができるファイル：
    各月の患者データなど

    最終的な出力形式：
    - 患者番号、副傷病名、コード番号、根拠をCSVに変換してください。

    出力形式（例）:
    [
      { "step": 1, "description": "...", "query": "...", "toolName": "..." },
      ...
    ]`

    if (loopCount === 0) {
      console.log("planningDpdCoding")
      const result = await visionAgentTool.execute!({
        context: {
          imagePath: filePath,
          question: question,
        },
      });

      console.log("📋 planning result from o1:\n", result);

      const match = result.answer.match(/```json([\s\S]*?)```/);
      if (!match) throw new Error("🛑 visionAgentToolの出力からJSONが見つかりません");
      const steps = JSON.parse(match[1].trim());
      console.log("👣steps:\n", steps);

      // TODO：毎回PDFを読み込んでPlanningすると0.1$程度お金がかかること、毎回の出力結果が大差ないことから、初回のLLMに作成させて随時更新でも良さそう
      // const steps = [
      //   {
      //     step: 1,
      //     description: 'カルテファイルやPDFを読み込み、副傷病名の候補を抽出する。',
      //     query: 'DPC/PDPS傷病名コーディングテキスト.pdfを読み込み、副傷病名の候補を抽出してください。',
      //     toolName: 'file-loader'
      //   },
      //   {
      //     step: 2,
      //     description: '抽出した副傷病名をベクトルDBで検索し、関連情報を取得する。',
      //     query: '抽出した副傷病名を用いて、ベクトルDBで関連情報を検索してください。',
      //     toolName: 'vector-search'
      //   },
      //   {
      //     step: 3,
      //     description: '関連情報を基に副傷病名を精査し、最終的なリストを作成する。',
      //     query: '関連情報を基に、副傷病名を精査し、最終的なリストを作成してください。',
      //     toolName: 'think'
      //   },
      //   {
      //     step: 4,
      //     description: '最終的な副傷病名リストを確認し、必要に応じて修正を行う。',
      //     query: '副傷病名、コード番号、根拠を表形式（CSV）に変換してください。',
      //     toolName: 'create-table'
      //   }
      // ]

      planningMemory.set(runId, steps);
      planningStateMap.set(runId, { currentStepIndex: 0, failedSteps: [] });
    }
    const steps = planningMemory.get(runId);
    const state = planningStateMap.get(runId);
    const step = steps[state.currentStepIndex];

    console.log("step", step);
    console.log("state", state);

    let result: any;
    try {
      switch (step.toolName) {
        case "file-loader": {
          const projectRoot = process.env.PROJECT_ROOT
            ? path.resolve(process.cwd(), process.env.PROJECT_ROOT)
            : process.cwd();
          const directoryPath = path.resolve(projectRoot, "data");
          const files = await fs.readdir(directoryPath);
          const fileList = files.filter(f => /\.(csv|json|txt)$/i.test(f));
          const fileSelectPrompt = `
            以下は候補となるファイル一覧です：

            ${fileList.map(f => `- ${f}`).join('\n')}

            目的：${step.query}

            出力形式（JSON）:
            {"selectedFile": "<ファイル名>"}
            `;
          console.log("fileSelectPrompt", fileSelectPrompt);
          const fileSelectResult = await LLMAgent.generate(fileSelectPrompt);
          console.log("file-select result", fileSelectResult.text);
          const selectedFileName = JSON.parse(fileSelectResult.text.replace(/```json|```/g, "").trim()).selectedFile;
          const selectedFilePath = path.join("data", selectedFileName);
          result = await fileLoaderTool.execute!({ context: { fileName: selectedFilePath } });
          console.log("file-loader result", result);
          break;
        }
        case "vector-search": {
          const previousKarte = collectedResults[runId]
            ?.filter(r => r.toolName === "file-loader")
            ?.map(r => typeof r.result === "string" ? r.result : JSON.stringify(r.result))
            .join("\n\n");

          const extractQueries = await LLMAgent.generate(
            `以下のカルテ情報から、DPC/PDPS制度で定義されている傷病・副傷病に該当しそうなキーワード（症状・処置・検査など）を抽出してくださ\n\n${previousKarte}`
          );
          const queries = extractQueries.text
          .replace(/```(?:json)?|```/g, '')
          .split('\n')
          .map(q => q.trim())
          .filter(Boolean);

          console.log("Extracted queries:", queries);
      
          // キーワードごとに個別検索
          const searchResults: string[] = [];
          for (const query of queries) {
            const { results } = await vectorSearchTool.execute!({
              context: { indexName: 'dpcCoding', query, topK: 3 },
            });
            const texts = results
              .map(r => r.metadata?.text ?? '')
              .filter(Boolean);
            searchResults.push(...texts);
          }
        
          result = searchResults;
          console.log("vector-search result", result);
          break;
        }
        case "think": {
          const relevantChunks = collectedResults[runId]
            ?.map(r => typeof r.result === "string" ? r.result : JSON.stringify(r.result))
            .join("\n\n");
          
          const prompt = `以下の関連情報を基に、副傷病名を精査し、最終的なリストを作成してください。\n\n${relevantChunks}`;
          result = await ReasoningAgent.generate(prompt);
          console.log("think result", result);
          break;
        }
        case "create-table": {
          const relevantChunks = collectedResults[runId]
            ?.map(r => typeof r.result === "string" ? r.result : JSON.stringify(r.result))
            .join("\n\n");
          
          const prompt = `
          以下は副傷病名の候補リストとその根拠です。以下の形式でCSVを出力してください。
          - 患者番号（PatientID）
          - 副傷病名（DiseaseName）
          - ICD10コード（Code）
          - 根拠（Rationale）

          出力例:
          "患者番号","副傷病名","コード番号","根拠"
          "106931","高血圧","I10","血圧が140/90を超えている"
          ...

          対象情報:
          ${relevantChunks}

          出力はCSV形式（カンマ区切り、ヘッダー付き）でお願いします。
          `; 
          result = await LLMAgent.generate(prompt);
          console.log("create-table result", result);
          break;
        }
        default:
          throw new Error(`Unsupported tool: ${step.toolName}`);
      }

      state.currentStepIndex++;
    } catch (error: any) {
      logger.error(`🛑 Step ${step.step} failed:`, error);
      state.failedSteps.push(step.step);
    }

    planningStateMap.set(runId, state);

    if (!collectedResults[runId]) {
      collectedResults[runId] = [];
    }

    collectedResults[runId].push({
      step: step.step,
      toolName: step.toolName,
      query: step.query,
      result
    });

    return { toolName: step.toolName, result };
  },
});

const reasoningStep = new Step({
  id: "reasoningStep",
  inputSchema: z.object({
    toolResults: z.record(z.string(), z.any()),
  }),
  outputSchema: z.object({
    summary: z.string(),
    finalAnswer: z.string().optional(),
    shouldContinue: z.boolean(),
    nextTopic: z.string().optional(),
    nextTool: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const toolResults = context.inputData.toolResults;
    const runId = context.getStepResult("trigger")?.runId || "default";
    const relevantChunks = collectedResults[runId]
      ?.map(r => typeof r.result === 'string' ? r.result : JSON.stringify(r.result))
      .filter(Boolean) || [];
    const executionState = planningStateMap.get(runId);

    const prompt = `
    あなたは、DPC/PDPSコーディングに基づく副傷病抽出のAIワークフローを監督する専門エージェントです。
    
    以下は直前のツール実行結果です：
    ${JSON.stringify(toolResults, null, 2)}

    ## 関連ドキュメント
    ${relevantChunks}
    
    また、全体のワークフロー計画は以下です：
    ${JSON.stringify(planningMemory.get(runId), null, 2)}
    
    現在ステップは ${executionState.currentStepIndex} です。
    
    === あなたのタスク ===
    1. 上記の実行結果から、どのような情報が得られたかを要約してください（summary）。
    2. 得られた情報は目的達成に十分ですか？明確な知見（finalAnswer）に到達しましたか？
    3. まだ情報が不十分な場合、次にどのtoolでどんなqueryを使うべきかを提案してください。
    4. このループを継続すべきかどうかも判断してください。
    
    === 出力形式 ===（※コードブロックなしの純粋なJSON）
    
    {
      "summary": "〜",
      "finalAnswer": "〜",
      "shouldContinue": true,
      "nextTopic": "〜",
      "nextTool": "file-loader" or "vector-search"
    }
    `;    

    const result = await ReasoningAgent.generate(prompt);
    console.log(result.text.replace(/```json|```/g, "").trim());
    return JSON.parse(result.text.replace(/```json|```/g, "").trim());
  },
});

export const dpcCodingReActWorkflow = new Workflow({
  name: "dpcCodingReActWorkflow",
  triggerSchema: z.object({
    topic: z.string().describe("The topic to research deeply"),
    runId: z.string().optional(),
  }),
});

dpcCodingReActWorkflow
  .step(toolSelectAndExecuteStep, {
    variables: {
      query: { step: "trigger", path: "topic" },
      runId: { step: "trigger", path: "runId" },
    },
  })
  .then(reasoningStep, {
    variables: {
      toolResults: { step: toolSelectAndExecuteStep, path: "result" },
    },
  })
  .until(
    async ({ context }) => {
      loopCount++;
      const runId = context.getStepResult("trigger")?.runId || "default";
      const state = planningStateMap.get(runId);
      const steps = planningMemory.get(runId);

      const { shouldContinue } = context.getStepResult("reasoningStep");
      const hasFinished = state.currentStepIndex >= steps.length;

      console.log("Loop count:", loopCount, "Should continue:", shouldContinue, "Finished:", hasFinished);
      return !shouldContinue || loopCount >= maxLoop || hasFinished;
    },
    toolSelectAndExecuteStep
  )
  .commit();

export default dpcCodingReActWorkflow;