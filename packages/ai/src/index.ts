/**
 * @mailflow/ai — OpenRouter-backed AI for the inbound pipeline.
 * Server-only (uses the OPENROUTER_API_KEY).
 */
export { getAiClient, chatJson, type ChatResult } from './client';
export { analyzeReply } from './analyze';
export {
  buildReplyAnalyzerPrompt,
  type ThreadContext,
  type ThreadContextMessage,
} from './prompts/reply-analyzer';
