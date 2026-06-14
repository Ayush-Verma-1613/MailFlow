import { AI_INTENTS } from '@mailflow/shared';

export interface ThreadContextMessage {
  direction: 'in' | 'out';
  from: string;
  text: string;
}

export interface ThreadContext {
  subject?: string;
  contactName?: string;
  contactEmail?: string;
  /** Newest-last; the analyzer focuses on the latest inbound message. */
  messages: ThreadContextMessage[];
}

const SYSTEM = `You are an expert sales-outreach assistant. You analyze the latest inbound reply in an email thread and respond with STRICT JSON only (no prose, no markdown fences).

Classify the prospect's intent as exactly one of:
${AI_INTENTS.join(', ')}

Return a JSON object with these fields:
- "intent": one of the values above
- "confidence": number 0..1
- "summary": one or two sentences summarizing the reply and thread state
- "entities": object that may include "company", "role", "phone", "meetingRequest" (boolean), "objections" (string[]); omit unknown keys
- "suggestedReply": a concise, friendly, professional reply the operator could send next (plain text, no signature)

Guidance: if intent is "unsubscribe" or "not_interested", the suggestedReply should be a brief, respectful acknowledgement. If "interested" or "question", move the conversation forward (answer, propose a next step/meeting).`;

export function buildReplyAnalyzerPrompt(ctx: ThreadContext): {
  system: string;
  user: string;
} {
  const transcript = ctx.messages
    .map((m) => `[${m.direction === 'in' ? 'PROSPECT' : 'US'} · ${m.from}]\n${m.text}`)
    .join('\n\n---\n\n');

  const user = `Thread subject: ${ctx.subject ?? '(none)'}
Prospect: ${ctx.contactName ?? 'unknown'} <${ctx.contactEmail ?? 'unknown'}>

Conversation (oldest to newest):

${transcript}

Analyze the most recent PROSPECT message and return the JSON object.`;

  return { system: SYSTEM, user };
}
