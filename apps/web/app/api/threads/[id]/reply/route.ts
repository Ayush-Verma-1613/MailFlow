import { z } from 'zod';
import { Message, Thread } from '@mailflow/db';
import { generateMessageId } from '@mailflow/email';

import { badRequest, notFound, ok, parseBody, serverError } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';
import { buildProvider, loadAccountWithSecrets } from '@/lib/email-account';

const replySchema = z.object({
  bodyHtml: z.string().min(1, 'Reply body is required'),
  bodyText: z.string().optional(),
});

/** Reply within a thread, sending from the thread's mailbox via the provider. */
export const POST = withOrg(
  async (req, ctx, routeCtx) => {
    const { id } = await routeCtx.params;
    if (!id) return notFound('Thread not found');

    const parsed = await parseBody(req, replySchema);
    if (!parsed.ok) return parsed.response;

    const thread = await Thread.findOne({ _id: id, orgId: ctx.orgId });
    if (!thread) return notFound('Thread not found');

    const account = await loadAccountWithSecrets(
      ctx.orgId,
      thread.emailAccountId.toString(),
    );
    if (!account) return badRequest('The thread mailbox is no longer connected');

    // Reply to the latest inbound message; fall back to the other participant.
    const lastInbound = await Message.findOne({
      orgId: ctx.orgId,
      threadId: id,
      direction: 'in',
    })
      .sort({ createdAt: -1 })
      .lean();

    const to =
      lastInbound?.from ??
      thread.participants.find((p) => p !== account.fromEmail) ??
      thread.participants[0];
    if (!to) return badRequest('No recipient to reply to');

    const subject = /^re:/i.test(thread.subject) ? thread.subject : `Re: ${thread.subject}`;
    const references = lastInbound
      ? [...lastInbound.references, lastInbound.messageId].filter(Boolean)
      : [];
    const messageId = generateMessageId(account.fromEmail);

    try {
      const provider = buildProvider(account);
      const result = await provider.send({
        to,
        from: { email: account.fromEmail, name: account.fromName },
        subject,
        html: parsed.data.bodyHtml,
        text: parsed.data.bodyText,
        messageId,
        inReplyTo: lastInbound?.messageId,
        references,
      });

      const sentAt = new Date();
      await Message.create({
        orgId: ctx.orgId,
        threadId: thread._id,
        emailAccountId: account._id,
        direction: 'out',
        messageId: result.messageId,
        inReplyTo: lastInbound?.messageId,
        references,
        from: account.fromEmail,
        to: [to],
        subject,
        bodyHtml: parsed.data.bodyHtml,
        bodyText: parsed.data.bodyText,
        sentAt,
      });

      thread.lastMessageAt = sentAt;
      thread.messageCount += 1;
      await thread.save();

      return ok({ sent: true, messageId: result.messageId });
    } catch (error) {
      console.error('[thread reply] error:', error);
      return serverError('Failed to send reply');
    }
  },
  { role: 'member' },
);
