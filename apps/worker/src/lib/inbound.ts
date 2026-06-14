/**
 * Inbound reconciliation engine. Source-agnostic: given a parsed email, it
 * dedupes, attaches it to the right Thread (by RFC822 reference chain, then by
 * a campaign send, otherwise a new thread), links the contact, persists the
 * Message, and records a reply against the campaign when applicable.
 */
import { Campaign, CampaignRecipient, Contact, Message, Thread, mongoose } from '@mailflow/db';
import { generateMessageId, type BounceReport, type ParsedEmail } from '@mailflow/email';

/**
 * Apply an asynchronous (DSN) bounce: suppress each failed contact so we never
 * re-mail a dead address, and flip any still-`sent` campaign recipients for that
 * contact to `bounced` (recording the event + bumping the campaign's bounced
 * stat). Idempotent — re-processing the same DSN flips nothing a second time, so
 * stats don't double-count. Returns how many contacts were suppressed.
 */
export async function applyBounce(orgId: string, report: BounceReport): Promise<number> {
  let suppressed = 0;
  for (const email of report.recipients) {
    const contact = await Contact.findOne({ orgId, email }).select('_id status');
    if (!contact) continue;

    if (contact.status !== 'bounced') {
      await Contact.updateOne({ _id: contact._id }, { $set: { status: 'bounced' } });
      suppressed++;
    }

    // Flip outstanding sends for this contact; the status guard makes the $inc
    // fire only for recipients actually transitioned (so re-runs are no-ops).
    const recips = await CampaignRecipient.find({
      orgId,
      contactId: contact._id,
      status: 'sent',
    }).select('_id campaignId');

    for (const r of recips) {
      const res = await CampaignRecipient.updateOne(
        { _id: r._id, status: 'sent' },
        {
          $set: { status: 'bounced' },
          $push: {
            events: { type: 'bounce', at: new Date(), meta: { dsn: true, status: report.status } },
          },
        },
      );
      if (res.modifiedCount > 0) {
        await Campaign.updateOne({ _id: r.campaignId }, { $inc: { 'stats.bounced': 1 } });
      }
    }
  }
  return suppressed;
}

export interface IngestParams {
  orgId: string;
  accountId: string;
  parsed: ParsedEmail;
}

export interface IngestResult {
  deduped: boolean;
  messageDbId?: string;
  threadId?: string;
  linkedCampaignId?: string;
  isReply: boolean;
}

export async function ingestParsedMessage(params: IngestParams): Promise<IngestResult> {
  const { orgId, accountId } = params;
  const parsed = params.parsed;
  const orgObjId = new mongoose.Types.ObjectId(orgId);
  const accountObjId = new mongoose.Types.ObjectId(accountId);

  // Ensure a stable Message-ID (some messages omit one).
  const messageId = parsed.messageId ?? generateMessageId(parsed.from ?? 'inbound.local');

  // 1. Dedupe.
  const existing = await Message.findOne({ messageId }).select('_id').lean();
  if (existing) {
    return { deduped: true, isReply: false, messageDbId: existing._id.toString() };
  }

  const refIds = [parsed.inReplyTo, ...parsed.references].filter((x): x is string => Boolean(x));

  // 2a. Thread via the reference chain → an existing stored Message.
  let thread = null;
  if (refIds.length > 0) {
    const refMsg = await Message.findOne({ orgId, messageId: { $in: refIds } })
      .select('threadId')
      .lean();
    if (refMsg) thread = await Thread.findById(refMsg.threadId);
  }

  // 2b. Otherwise, match an outbound campaign send by its Message-ID.
  let recipient = null;
  if (!thread && refIds.length > 0) {
    recipient = await CampaignRecipient.findOne({ orgId, messageId: { $in: refIds } });
  }

  // 3. Link the contact by sender address.
  const contact = parsed.from
    ? await Contact.findOne({ orgId, email: parsed.from }).select('_id').lean()
    : null;

  const when = parsed.date ?? new Date();

  // 4. Create the thread if none was found.
  if (!thread) {
    thread = await Thread.create({
      orgId: orgObjId,
      emailAccountId: accountObjId,
      subject: parsed.subject || '(no subject)',
      participants: [parsed.from].filter(Boolean) as string[],
      campaignId: recipient?.campaignId,
      contactId: recipient?.contactId ?? contact?._id,
      lastMessageAt: when,
      messageCount: 0,
      status: 'open',
    });
  }

  // 5. Persist the inbound message.
  const msg = await Message.create({
    orgId: orgObjId,
    threadId: thread._id,
    emailAccountId: accountObjId,
    direction: 'in',
    messageId,
    inReplyTo: parsed.inReplyTo,
    references: parsed.references,
    from: parsed.from ?? 'unknown',
    to: parsed.to,
    cc: parsed.cc,
    subject: parsed.subject,
    snippet: parsed.snippet,
    bodyHtml: parsed.html,
    bodyText: parsed.text,
    receivedAt: when,
  });

  // 6. Update thread aggregates.
  await Thread.updateOne(
    { _id: thread._id },
    {
      $set: { lastMessageAt: when, status: 'open' },
      $inc: { messageCount: 1 },
      ...(parsed.from ? { $addToSet: { participants: parsed.from } } : {}),
    },
  );

  // 7. Record a reply against the originating campaign (first reply only).
  // Match precedence:
  //   a) exact recipient via the reference chain (Message-ID),
  //   b) an existing campaign thread,
  //   c) ANY recent campaign send to this contact — resilient to providers
  //      (e.g. Gmail) that rewrite the Message-ID so the chain doesn't match.
  let linkRecipient =
    recipient ??
    (thread.campaignId && thread.contactId
      ? await CampaignRecipient.findOne({
          campaignId: thread.campaignId,
          contactId: thread.contactId,
        })
      : null);

  if (!linkRecipient && contact?._id) {
    linkRecipient = await CampaignRecipient.findOne({
      orgId,
      contactId: contact._id,
      status: { $in: ['sent', 'bounced'] },
    }).sort({ sentAt: -1 });
  }

  let isReply = false;
  let linkedCampaignId: string | undefined;
  if (linkRecipient) {
    isReply = true;
    linkedCampaignId = linkRecipient.campaignId.toString();
    // Surface the thread under its campaign even when the reply opened a fresh
    // thread (because the Message-ID chain didn't match).
    if (!thread.campaignId) {
      await Thread.updateOne(
        { _id: thread._id },
        {
          $set: {
            campaignId: linkRecipient.campaignId,
            contactId: linkRecipient.contactId,
          },
        },
      );
    }
    const firstReply = !linkRecipient.events.some((e) => e.type === 'reply');
    linkRecipient.events.push({ type: 'reply', at: when });
    await linkRecipient.save();
    if (firstReply) {
      await Campaign.updateOne({ _id: linkRecipient.campaignId }, { $inc: { 'stats.replied': 1 } });
    }
  }

  return {
    deduped: false,
    messageDbId: msg._id.toString(),
    threadId: thread._id.toString(),
    linkedCampaignId,
    isReply,
  };
}
