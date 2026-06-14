import { createHmac } from 'node:crypto';
import type { Job } from 'bullmq';
import { AuditLog, Contact, Reward, decrypt } from '@mailflow/db';
import type { RewardGrantJob } from '@mailflow/queue';
import { renderMergeTags } from '@mailflow/shared';

import { logger } from '../logger';

/**
 * Grant a reward to a contact by calling the configured external endpoint
 * (HMAC-signed). Idempotent: a contact is granted at most once per reward.
 */
export async function processRewardGrant(job: Job<RewardGrantJob>): Promise<void> {
  const { orgId, rewardId, contactId } = job.data;
  const log = logger.child({ worker: 'reward-grant', rewardId, contactId });

  const reward = await Reward.findOne({ _id: rewardId, orgId }).select(
    '+grantAction.secret',
  );
  if (!reward) return;

  // Idempotency: skip if this contact was already granted.
  if (reward.recipients.some((r) => r.contactId.toString() === contactId)) {
    log.info('already granted — skipping');
    return;
  }

  const contact = await Contact.findOne({ _id: contactId, orgId }).lean();
  if (!contact) return;

  const data = {
    email: contact.email,
    firstName: contact.firstName ?? '',
    lastName: contact.lastName ?? '',
    rewardName: reward.name,
    contactId,
  };

  const body = reward.grantAction.payloadTemplate
    ? renderMergeTags(reward.grantAction.payloadTemplate, data)
    : JSON.stringify({ event: 'reward.grant', reward: reward.name, contact: data });

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (reward.grantAction.secret) {
    const secret = decrypt(reward.grantAction.secret);
    headers['X-MailFlow-Signature'] = createHmac('sha256', secret).update(body).digest('hex');
  }

  const res = await fetch(reward.grantAction.url, { method: 'POST', headers, body });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Grant endpoint returned ${res.status}: ${text.slice(0, 200)}`);
  }

  const ref = res.headers.get('x-grant-id') ?? undefined;
  reward.recipients.push({ contactId: contact._id, grantedAt: new Date(), ref });
  await reward.save();

  await AuditLog.create({
    orgId,
    action: 'reward.grant',
    target: { kind: 'Reward', id: rewardId },
    meta: { contactId, email: contact.email, ref },
    at: new Date(),
  });

  log.info({ email: contact.email }, 'reward granted');
}
