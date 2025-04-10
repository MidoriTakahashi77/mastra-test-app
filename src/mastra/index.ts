
import { Mastra } from '@mastra/core';
import { LLMAgent } from './agents/LLMAgent';
import { PlanningAgent } from './agents/PlanningAgent';
import { ReasoningAgent } from './agents/ReasoningAgent';
import { dpcCodingReActWorkflow } from './workflows/DpcCodingReActWorkflow';
import { deepReserchWorkflow } from './workflows/DeepReserchWorkflows/DeepReserchWorkflow';
import { logger } from '../logger';
import { qdrantVector } from './vectors/qdrant';
import 'dotenv/config';

export const mastra = new Mastra({
  agents: { LLMAgent, PlanningAgent, ReasoningAgent },
  workflows: { dpcCodingReActWorkflow, deepReserchWorkflow },
  vectors: { qdrantVector },
  logger
})