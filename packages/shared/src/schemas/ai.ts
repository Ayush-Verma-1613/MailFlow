import { z } from 'zod';
import { AI_INTENTS } from '../constants';

/**
 * Structured output of the reply-analyzer AI call. The model is instructed to
 * return JSON matching this shape; we validate before trusting it.
 */
export const replyAnalysisSchema = z.object({
  intent: z.enum(AI_INTENTS),
  confidence: z.number().min(0).max(1),
  summary: z.string().max(2000),
  // Models often emit explicit `null` for unknown fields → accept null too.
  entities: z
    .object({
      company: z.string().nullish(),
      role: z.string().nullish(),
      phone: z.string().nullish(),
      meetingRequest: z.boolean().nullish(),
      objections: z.array(z.string()).nullish(),
    })
    .partial()
    .default({}),
  suggestedReply: z.string().max(8000),
});
export type ReplyAnalysis = z.infer<typeof replyAnalysisSchema>;

export const threadSummarySchema = z.object({
  summary: z.string().max(2000),
});
export type ThreadSummary = z.infer<typeof threadSummarySchema>;

/** Cost/latency metadata recorded for every AI call. */
export interface AiCallUsage {
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencyMs: number;
}
