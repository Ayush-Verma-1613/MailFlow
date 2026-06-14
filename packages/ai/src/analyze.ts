import { replyAnalysisSchema, type ReplyAnalysis } from '@mailflow/shared';

import { chatJson, type ChatResult } from './client';
import { buildReplyAnalyzerPrompt, type ThreadContext } from './prompts/reply-analyzer';

/**
 * Classify intent + draft a suggested reply for the latest inbound message in a
 * thread. Uses the reply-draft model route (Sonnet primary, GPT-4o fallback).
 */
export async function analyzeReply(
  context: ThreadContext,
): Promise<ChatResult<ReplyAnalysis>> {
  const { system, user } = buildReplyAnalyzerPrompt(context);
  return chatJson('reply_draft', system, user, replyAnalysisSchema);
}
