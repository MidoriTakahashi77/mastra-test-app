import path from "path";
import 'dotenv/config';

const projectRoot = process.env.PROJECT_ROOT
  ? path.resolve(process.cwd(), process.env.PROJECT_ROOT)
  : process.cwd();

export const resolveFromRoot = (...segments: string[]) =>
  path.resolve(projectRoot, ...segments);
