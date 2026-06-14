import { Message, Thread } from '@mailflow/db';

import { notFound, ok } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';

/** A thread with its messages (oldest first) for the reading pane. */
export const GET = withOrg(async (_req, ctx, routeCtx) => {
  const { id } = await routeCtx.params;
  if (!id) return notFound('Thread not found');

  const thread = await Thread.findOne({ _id: id, orgId: ctx.orgId }).lean();
  if (!thread) return notFound('Thread not found');

  const messages = await Message.find({ orgId: ctx.orgId, threadId: id })
    .sort({ createdAt: 1 })
    .lean();

  return ok({
    thread: {
      id: thread._id.toString(),
      subject: thread.subject,
      participants: thread.participants ?? [],
      status: thread.status,
      aiIntent: thread.aiIntent,
      aiSummary: thread.aiSummary,
      accountId: thread.emailAccountId.toString(),
      contactId: thread.contactId?.toString(),
      campaignId: thread.campaignId?.toString(),
    },
    messages: messages.map((m) => ({
      id: m._id.toString(),
      direction: m.direction,
      from: m.from,
      to: m.to,
      subject: m.subject,
      bodyHtml: m.bodyHtml,
      bodyText: m.bodyText,
      snippet: m.snippet,
      at: (m.receivedAt ?? m.sentAt ?? m.createdAt).toISOString(),
      ai: m.ai
        ? {
            intent: m.ai.intent,
            confidence: m.ai.confidence,
            summary: m.ai.summary,
            draftReply: m.ai.draftReply,
          }
        : undefined,
    })),
  });
});
