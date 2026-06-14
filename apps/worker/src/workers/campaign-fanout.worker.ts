import type { Job } from 'bullmq';
import { Campaign, CampaignRecipient, Contact, mongoose } from '@mailflow/db';
import { enqueueBulk, type CampaignFanoutJob, type SendEmailJob } from '@mailflow/queue';
import { QUEUE_NAMES } from '@mailflow/shared';
import type { JobsOptions } from 'bullmq';

import { logger } from '../logger';

/** Stream contacts/recipients in chunks so a 100k-contact list never loads at once. */
const CONTACT_BATCH = 1_000;
const ENQUEUE_BATCH = 1_000;
/** Spacing between sends so a campaign doesn't burst the providers. */
const STAGGER_MS = 1_500;
const MAX_JITTER_MS = 5_000;

/**
 * Expand a campaign into per-recipient send jobs:
 *  1. stream active contacts across the campaign's lists (cursor, batched),
 *  2. upsert a CampaignRecipient per (campaign, contact) — dedup via the unique
 *     index, so re-runs never double-send,
 *  3. enqueue a staggered, jittered send-email job for each queued recipient
 *     (deterministic jobId → idempotent re-fanout), in bulk.
 *
 * Everything is chunked: memory stays flat regardless of list size.
 */
export async function processCampaignFanout(job: Job<CampaignFanoutJob>): Promise<void> {
  const { orgId, campaignId } = job.data;
  const log = logger.child({ worker: 'campaign-fanout', campaignId });

  const campaign = await Campaign.findOne({ _id: campaignId, orgId });
  if (!campaign) {
    log.warn('campaign not found');
    return;
  }
  if (campaign.status === 'paused' || campaign.status === 'completed') {
    log.info({ status: campaign.status }, 'skipping fanout');
    return;
  }

  campaign.status = 'running';
  await campaign.save();
  const orgObjectId = new mongoose.Types.ObjectId(orgId);

  // 1 + 2: stream contacts and upsert recipients in batches.
  const contactCursor = Contact.find({
    orgId,
    listIds: { $in: campaign.listIds },
    status: 'active',
  })
    .select('_id')
    .lean()
    .cursor();

  let recipientBuf: { _id: mongoose.Types.ObjectId }[] = [];
  const flushRecipients = async (): Promise<void> => {
    if (recipientBuf.length === 0) return;
    await CampaignRecipient.bulkWrite(
      recipientBuf.map((c) => ({
        updateOne: {
          filter: { campaignId: campaign._id, contactId: c._id },
          update: {
            $setOnInsert: {
              orgId: orgObjectId,
              campaignId: campaign._id,
              contactId: c._id,
              status: 'queued' as const,
            },
          },
          upsert: true,
        },
      })),
      { ordered: false },
    );
    recipientBuf = [];
  };

  for await (const c of contactCursor) {
    recipientBuf.push(c as { _id: mongoose.Types.ObjectId });
    if (recipientBuf.length >= CONTACT_BATCH) await flushRecipients();
  }
  await flushRecipients();

  // 3: stream queued recipients and bulk-enqueue staggered send jobs.
  const startAt = campaign.schedule?.startAt?.getTime() ?? Date.now();
  const baseDelay = Math.max(0, startAt - Date.now());

  const queuedCursor = CampaignRecipient.find({ campaignId: campaign._id, status: 'queued' })
    .select('_id')
    .lean()
    .cursor();

  let i = 0;
  let jobBuf: { data: SendEmailJob; opts?: JobsOptions }[] = [];
  const flushJobs = async (): Promise<void> => {
    if (jobBuf.length === 0) return;
    await enqueueBulk(QUEUE_NAMES.sendEmail, jobBuf);
    jobBuf = [];
  };

  for await (const r of queuedCursor) {
    const id = (r as { _id: mongoose.Types.ObjectId })._id.toString();
    const jitter = Math.floor(Math.random() * MAX_JITTER_MS);
    const delay = baseDelay + i * STAGGER_MS + jitter; // stagger to avoid bursts
    jobBuf.push({
      data: { orgId, campaignId, recipientId: id },
      opts: { jobId: `send-${id}`, delay },
    });
    i++;
    if (jobBuf.length >= ENQUEUE_BATCH) await flushJobs();
  }
  await flushJobs();

  await Campaign.updateOne({ _id: campaign._id }, { $set: { 'stats.queued': i } });
  log.info({ recipients: i }, 'fanout complete');
}
