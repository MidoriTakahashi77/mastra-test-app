import { QdrantVector } from "@mastra/qdrant";
import { MastraVector } from "@mastra/core";
import 'dotenv/config';

// QdrantVector は MastraVector を継承しているが、private プロパティの影響で
// そのまま代入できない（型の互換性がないと判断される）。
//
// そのため、一度 unknown にキャストしてから MastraVector に再キャストし、
// 意図的に型チェックをバイパスしている。
// 
// ※ 実行時は問題ないが、型安全ではないので注意。
export const qdrantVector = new QdrantVector(
  "https://a1192bf2-141e-43a1-8f0f-efb388a217ef.us-east4-0.gcp.cloud.qdrant.io",
  process.env.QDRANT_API_KEY,
  true
)as unknown as MastraVector;
