import type { Job } from 'bullmq';
import { Contact, Message, Thread } from '@mailflow/db';
import { analyzeReply, type ThreadContext } from '@mailflow/ai';
import { enqueue, type AiAnalyzeJob } from '@mailflow/queue';
import { QUEUE_NAMES } from '@mailflow/shared';

import { logger } from '../logger';

function toText(m: { bodyText?: string; bodyHtml?: string; snippet?: string }): string {
  if (m.bodyText) return m.bodyText;
  if (m.bodyHtml) {
    return m.bodyHtml
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return m.snippet ?? '';
}

/**
 * Classify intent + draft a reply for an inbound message, persisting the result
 * on the Message and rolling the intent/summary up to its Thread.
 */
export async function processAiAnalyze(job: Job<AiAnalyzeJob>): Promise<void> {
  const { orgId, messageId } = job.data;
  const log = logger.child({ worker: 'ai-analyze', messageId });

  const message = await Message.findOne({ _id: messageId, orgId });
  if (!message) return;
  // Only inbound messages get analyzed.
  if (message.direction !== 'in') return;

  const thread = await Thread.findById(message.threadId);
  if (!thread) return;

  const recent = await Message.find({ orgId, threadId: message.threadId })
    .sort({ createdAt: 1 })
    .lean();
  const lastFive = recent.slice(-5);

  const contact = thread.contactId ? await Contact.findById(thread.contactId).lean() : null;
  const context: ThreadContext = {
    subject: thread.subject,
    contactName:
      [contact?.firstName, contact?.lastName].filter(Boolean).join(' ') || undefined,
    contactEmail: contact?.email ?? message.from,
    messages: lastFive.map((m) => ({ direction: m.direction, from: m.from, text: toText(m) })),
  };

  try {
    const { data, usage } = await analyzeReply(context);

    message.ai = {
      intent: data.intent,
      confidence: data.confidence,
      entities: data.entities,
      summary: data.summary,
      draftReply: data.suggestedReply,
      analyzedAt: new Date(),
    };
    await message.save();

    await Thread.updateOne(
      { _id: thread._id },
      { $set: { aiIntent: data.intent, aiSummary: data.summary } },
    );

    // Fire the reply_received event so the workflow engine can act on the
    // freshly-classified intent.
    await enqueue(QUEUE_NAMES.workflowRun, {
      orgId,
      event: 'reply_received',
      contextRef: { kind: 'Message', id: messageId },
    });

    log.info(
      { intent: data.intent, confidence: data.confidence, model: usage.model },
      'analyzed inbound message',
    );
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : String(error) }, 'analysis failed');
    throw error instanceof Error ? error : new Error('analysis failed');
  }
}
