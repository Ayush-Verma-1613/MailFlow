/**
 * OpenRouter client (OpenAI-compatible) + a JSON helper that routes per task,
 * falls back to a secondary model on failure, and validates the result with a
 * Zod schema. Every call returns usage metadata for cost/latency tracking.
 */
import OpenAI from 'openai';
import type { ZodTypeAny, z } from 'zod';
import { AI_MODEL_ROUTING, type AiCallUsage, type AiTask } from '@mailflow/shared';
import { env } from '@mailflow/shared/env';

let client: OpenAI | null = null;

export function getAiClient(): OpenAI {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }
  client ??= new OpenAI({
    apiKey: env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': env.APP_URL,
      'X-Title': 'MailFlow',
    },
  });
  return client;
}

export interface ChatResult<T> {
  data: T;
  usage: AiCallUsage;
}

/** Strip ```json … ``` fences some models wrap JSON in. */
function stripFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

/**
 * Call the model(s) for `task`, parse + validate JSON output against `schema`.
 * Tries the primary model, then the fallback, before throwing.
 */
export async function chatJson<S extends ZodTypeAny>(
  task: AiTask,
  system: string,
  user: string,
  schema: S,
): Promise<ChatResult<z.infer<S>>> {
  const route = AI_MODEL_ROUTING[task];
  const models = [route.primary, ...(route.fallback ? [route.fallback] : [])];

  let lastError: unknown;
  for (const model of models) {
    const start = Date.now();
    try {
      const res = await getAiClient().chat.completions.create({
        model,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      });

      const content = res.choices[0]?.message?.content ?? '';
      const parsed = JSON.parse(stripFences(content)) as unknown;
      const data = schema.parse(parsed) as z.infer<S>;

      const usage: AiCallUsage = {
        model,
        tokensIn: res.usage?.prompt_tokens ?? 0,
        tokensOut: res.usage?.completion_tokens ?? 0,
        costUsd: 0,
        latencyMs: Date.now() - start,
      };
      return { data, usage };
    } catch (error) {
      lastError = error;
      // Try the next model in the route.
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`AI call failed for task "${task}"`);
}
