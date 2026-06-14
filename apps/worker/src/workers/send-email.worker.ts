import type { Job } from 'bullmq';
import {
  Campaign,
  CampaignRecipient,
  Contact,
  EmailAccount,
  Message,
  Org,
  Template,
  Thread,
} from '@mailflow/db';
import { EmailSendError, generateMessageId } from '@mailflow/email';
import { consumeSendToken, enqueue, type SendEmailJob } from '@mailflow/queue';
import { DEFAULT_JOB_OPTS, QUEUE_NAMES, renderMergeTags } from '@mailflow/shared';

import { logger } from '../logger';
import { buildProvider } from '../lib/provider';
import { pickSender } from '../lib/sender-rotation';
import {
  buildPlainText,
  effectiveDailyCap,
  unsubscribeHeaders,
  unsubscribeUrl,
} from '../lib/sending';
import { applyTracking } from '../lib/tracking';

const MAX_ATTEMPTS = DEFAULT_JOB_OPTS.attempts;
/** A recipient stuck in `sending` longer than this is a crashed attempt, re-claimable. */
const STALE_SENDING_MS = 5 * 60_000;

/** Reschedule this recipient for a later attempt without consuming a retry. */
async function reschedule(job: SendEmailJob, delayMs: number): Promise<void> {
  await enqueue(QUEUE_NAMES.sendEmail, job, {
    jobId: `send-${job.recipientId}-${Date.now()}`,
    delay: delayMs,
  });
}

export async function processSendEmail(job: Job<SendEmailJob>): Promise<void> {
  const { orgId, campaignId, recipientId } = job.data;
  const log = logger.child({ worker: 'send-email', recipientId });

  let recipient = await CampaignRecipient.findOne({ _id: recipientId, orgId });
  if (!recipient || recipient.status === 'sent') return; // idempotent

  const campaign = await Campaign.findOne({ _id: campaignId, orgId });
  if (!campaign) return;
  if (campaign.status === 'paused') {
    log.info('campaign paused — leaving recipient queued');
    return;
  }

  const contact = await Contact.findOne({ _id: recipient.contactId, orgId });
  if (!contact) return void (await markFailed(recipient, 'contact missing'));
  if (contact.status !== 'active') {
    return void (await markFailed(recipient, `contact ${contact.status}`));
  }

  const template = await Template.findOne({ _id: campaign.templateId, orgId });
  if (!template) return void (await markFailed(recipient, 'template missing'));

  // Load the sender pool with secrets so the chosen account can send.
  const accounts = await EmailAccount.find({
    _id: { $in: campaign.senderPoolIds },
    orgId,
  }).select('+auth.accessToken +auth.refreshToken +auth.pass +auth.apiKey +auth.dkimPrivateKey');

  const account = await pickSender(accounts, campaign.rotation, campaignId);
  if (!account) {
    log.warn('no eligible sender — rescheduling in 10m');
    await reschedule(job.data, 10 * 60_000);
    return;
  }

  // Enforce per-account caps before doing any work. New mailboxes ramp up via
  // `warmupDay` so we don't blast a cold domain at full volume on day one.
  const dailyCap = effectiveDailyCap({
    dailyCap: account.limits.dailyCap,
    warmupDay: account.limits.warmupDay,
    createdAt: account.createdAt,
  });
  const rl = await consumeSendToken(account.id, {
    hourlyCap: account.limits.hourlyCap,
    dailyCap,
  });
  if (!rl.allowed) {
    log.info({ reason: rl.reason }, 'rate limited — rescheduling');
    await reschedule(job.data, rl.retryAfterMs ?? 60_000);
    return;
  }

  // Exactly-once claim: atomically flip queued → sending so two concurrent jobs
  // for the same recipient (e.g. a re-fanout racing a rescheduled retry) can
  // never both send. A `sending` recipient older than STALE_SENDING_MS is a
  // crashed attempt and may be re-claimed — preserving stalled-job recovery.
  const claimed = await CampaignRecipient.findOneAndUpdate(
    {
      _id: recipientId,
      orgId,
      $or: [
        { status: 'queued' },
        { status: 'sending', updatedAt: { $lt: new Date(Date.now() - STALE_SENDING_MS) } },
      ],
    },
    { $set: { status: 'sending', emailAccountId: account._id }, $inc: { attempts: 1 } },
    { new: true },
  );
  if (!claimed) {
    log.info('recipient already in-flight or sent — skipping (exactly-once guard)');
    return;
  }
  recipient = claimed;

  // Personalize.
  const cf =
    contact.customFields instanceof Map
      ? Object.fromEntries(contact.customFields)
      : ((contact.customFields as Record<string, string> | undefined) ?? {});
  const data: Record<string, unknown> = {
    firstName: contact.firstName ?? '',
    lastName: contact.lastName ?? '',
    email: contact.email,
    ...cf,
  };

  const org = await Org.findById(orgId).select('settings').lean();
  const subject = renderMergeTags(template.subject, data);
  const renderedBody = renderMergeTags(template.bodyHtml, data);
  const html = applyTracking(renderedBody, {
    recipientId,
    unsubscribeToken: contact.unsubscribeToken,
    unsubscribeFooter: org?.settings?.unsubscribeFooter,
  });
  const unsubUrl = unsubscribeUrl(contact.unsubscribeToken);
  const text = buildPlainText(renderedBody, unsubUrl);

  const messageId = generateMessageId(account.fromEmail);

  try {
    const provider = buildProvider(account);
    const result = await provider.send({
      to: contact.email,
      from: { email: account.fromEmail, name: account.fromName },
      subject,
      html,
      text,
      messageId,
      // RFC 8058 one-click unsubscribe — required by Gmail/Yahoo for bulk mail.
      headers: unsubscribeHeaders(unsubUrl),
    });

    const sentAt = new Date();

    // Commit the durable "sent" marker FIRST. The `status === 'sent'` guard at
    // the top of this handler makes any re-processing (e.g. BullMQ stalled-job
    // recovery after a crash) a no-op, so we can't double-send past this line.
    recipient.status = 'sent';
    recipient.sentAt = sentAt;
    recipient.messageId = result.messageId;
    await recipient.save();

    // Best-effort: open a thread + persist the outbound message (so replies
    // reconcile and the unified inbox shows the conversation) and bump stats.
    // A failure here must NOT re-send — the recipient is already 'sent' — so we
    // log instead of throwing back to BullMQ.
    try {
      const thread = await Thread.create({
        orgId,
        emailAccountId: account._id,
        subject,
        participants: [account.fromEmail, contact.email],
        campaignId,
        contactId: contact._id,
        lastMessageAt: sentAt,
        messageCount: 1,
        status: 'open',
      });
      await Message.create({
        orgId,
        threadId: thread._id,
        emailAccountId: account._id,
        direction: 'out',
        messageId: result.messageId,
        from: account.fromEmail,
        to: [contact.email],
        subject,
        bodyHtml: html,
        references: [],
        sentAt,
      });
      recipient.threadId = thread._id;
      await recipient.save();
      await Promise.all([
        Campaign.updateOne({ _id: campaignId }, { $inc: { 'stats.sent': 1 } }),
        EmailAccount.updateOne(
          { _id: account._id },
          { $inc: { 'health.sentToday': 1 }, $set: { 'health.lastSentAt': sentAt } },
        ),
      ]);
    } catch (postErr) {
      log.error(
        { err: postErr instanceof Error ? postErr.message : postErr },
        'sent but failed to persist thread/message/stats',
      );
    }
    log.info({ to: contact.email, account: account.fromEmail }, 'sent');
  } catch (error) {
    const sendErr = error instanceof EmailSendError ? error : undefined;
    const retryable = sendErr ? sendErr.options.retryable : true;
    const kind = sendErr?.options.kind;
    const message = error instanceof Error ? error.message : 'send failed';
    recipient.lastError = message;

    if (retryable && job.attemptsMade < MAX_ATTEMPTS - 1) {
      recipient.status = 'queued';
      await recipient.save();
      throw error instanceof Error ? error : new Error(message); // BullMQ backoff retry
    }

    if (kind === 'recipient') {
      // Hard bounce: suppress the contact so we never re-mail a dead address.
      // The mailbox itself is fine, so leave its health alone.
      recipient.status = 'bounced';
      recipient.events.push({ type: 'bounce', at: new Date(), meta: { reason: message } });
      await recipient.save();
      await Promise.all([
        Contact.updateOne({ _id: contact._id, orgId }, { $set: { status: 'bounced' } }),
        Campaign.updateOne({ _id: campaignId }, { $inc: { 'stats.bounced': 1 } }),
        EmailAccount.updateOne({ _id: account._id }, { $inc: { 'health.bouncesToday': 1 } }),
      ]);
      log.warn({ to: contact.email }, 'hard bounce — contact suppressed');
      return;
    }

    await markFailed(recipient, message);
    // Only an auth/credential failure means the *account* is broken; a one-off
    // transient failure that exhausted retries shouldn't disable the mailbox.
    if (kind === 'auth') {
      await EmailAccount.updateOne(
        { _id: account._id },
        { $set: { 'health.status': 'error', 'health.lastError': message } },
      );
    }
    log.error({ err: message, kind }, 'send permanently failed');
  }
}

async function markFailed(
  recipient: { status: string; lastError?: string; save: () => Promise<unknown> },
  reason: string,
): Promise<void> {
  recipient.status = 'failed';
  recipient.lastError = reason;
  await recipient.save();
}
