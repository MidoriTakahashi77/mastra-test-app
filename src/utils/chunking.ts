// 拡張子に応じて、適切な Mastra Document のチャンク戦略と抽出設定を返す。
import { MDocument } from "@mastra/rag";
type ChunkOptions = Parameters<MDocument['chunk']>[0];

export function getChunkOptionsForExtension(ext: string): ChunkOptions {
  switch (ext.toLowerCase()) {
    case '.md':
    case '.markdown':
      return {
        strategy: 'markdown',
        headers: [['#', 'title'], ['##', 'section']],
      };

    case '.ts':
    case '.js':
    case '.py':
    case '.java':
    case '.cpp':
      return {
        strategy: 'token',
        modelName: 'gpt-4',
        encodingName: 'cl100k_base',
        size: 800,
        overlap: 50,
      };

    case '.json':
      return {
        strategy: 'json',
        maxSize: 1000,
        convertLists: true,
      };

    case '.csv':
      return {
        strategy: 'character',
        size: 1000,
        overlap: 50,
        separator: '\n',
      };

    case '.pdf':
    case '.txt':
    default:
      return {
        strategy: 'recursive',
        size: 1000,
        overlap: 50,
      };
  }
}
