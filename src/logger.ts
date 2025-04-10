import { createLogger } from '@mastra/core/logger';
import { FileTransport } from '@mastra/loggers/file';
import fs from "fs";
import path from "path";

const logDir = "logs";

// 日時をファイル名に（例: 2025-03-27_09-30-00.log）
const now = new Date();
const timestamp = now.toISOString().replace(/[:.]/g, "-");
const logFileName = `${timestamp}.log`;
const logFilePath = path.join(logDir, logFileName);

// ディレクトリがなければ作成
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

if (!fs.existsSync(logFilePath)) {
  fs.writeFileSync(logFilePath, ""); // 空ファイルを作るだけでOK
}

export const logger = createLogger({
  name: 'Mastra',
  transports: {
    file: new FileTransport({ path: logFilePath }),
  },
  level: 'info',
});

export const currentLogFilePath = logFilePath;