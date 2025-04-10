import fs from 'fs'
import path from 'path'
import pdfParse from "pdf-parse"
import { parse } from 'csv-parse/sync';
import { MDocument } from "@mastra/rag";
import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { mastra } from "./mastra";
import { getChunkOptionsForExtension } from './utils/chunking';
import 'dotenv/config';

/**
 * 入力されたファイルパスに基づき、ファイルの種類ごとにテキストを抽出する関数。
 * - PDF: テキスト抽出（pdf-parse）
 * - CSV: 各行をスペース結合してまとめる
 *
 * @param filePath ファイルのパス（.pdf または .csv）
 * @returns テキスト文字列
 */
async function extractTextFromFile(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  const buffer = fs.readFileSync(filePath);

  switch (ext) {
    case ".pdf":
      const data = await pdfParse(buffer);
      return { text: data.text, ext };
    case ".csv":
      const csvContent = buffer.toString('utf-8');
      const records: any[] = parse(csvContent, { columns: true });
      const text = records.map(record  => Object.values(record).join(' ')).join('\n\n');
      return { text, ext };
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

/**
 * 与えられたテキストをチャンク分割し、埋め込みを生成してQdrantにアップロードする関数。
 *
 * @param rawText 入力テキスト（PDFやCSVから抽出されたもの）
 * @param indexName Qdrant上のインデックス名（保存先のコレクション）
 */
async function uploadTextToQdrant(rawText: string, ext: string, indexName: string, filename: string) {
  const doc = new MDocument({
    docs: [{ text: rawText }],
    type: 'plain',
  });

  const chunkOptions = getChunkOptionsForExtension(ext);
  const chunks = await doc.chunk(chunkOptions)

  const { embeddings } = await embedMany({
    model: openai.embedding('text-embedding-3-small'),
    values: chunks.map(chunk => chunk.text),
  });

  const vectorStore = mastra.getVector('qdrantVector');

  const indexes = await vectorStore.listIndexes();
  if (!indexes.includes(indexName)) {
    await vectorStore.createIndex({
      indexName: indexName,
      dimension: 1536,
    });
  } else {
    console.log(`✅ Index '${indexName}' already exists. Skipping creation.`);
  }

  await vectorStore.upsert({
    indexName: indexName,
    vectors: embeddings,
    metadata: chunks.map(chunk => ({
      text: chunk.text,
      source: filename,
    })),
  });

  console.log(`✅ ${embeddings.length} 件のチャンクを Qdrant にアップロード完了`);
}

// ========================== CLI実行部 ==========================

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: npm run embed -- sample.pdf index-name');
  process.exit(1);
}

const [filename, indexName] = args;
// ./documents ディレクトリ内のファイルを対象とする
const resolvedPath = path.resolve('documents', filename);
console.log('📄 読み込みファイル:', resolvedPath);

extractTextFromFile(resolvedPath)
  .then(({ text, ext }) => uploadTextToQdrant(text, ext, indexName, filename))
  .catch(err => {
    console.error('❌ エラー:', err);
    process.exit(1);
  });