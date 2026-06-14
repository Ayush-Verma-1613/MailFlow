import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Job } from 'bullmq';

// The queue (Redis) is mocked; this test exercises the real Mongo cursor +
// bulk-upsert path and asserts the jobs that *would* be enqueued.
const { enqueueBulk } = vi.hoisted(() => ({ enqueueBulk: vi.fn(async () => []) }));
vi.mock('@mailflow/queue', () => ({ enqueueBulk }));

import { Campaign, CampaignRecipient, Contact, List, mongoose } from '@mailflow/db';
import { processCampaignFanout } from '../../apps/worker/src/workers/campaign-fanout.worker';
import type { CampaignFanoutJob } from '@mailflow/queue';

const oid = () => new mongoose.Types.ObjectId();

describe('processCampaignFanout (integration)', () => {
  beforeEach(() => enqueueBulk.mockClear());

  it('streams contacts across batches into queued recipients + bulk send jobs', async () => {
    const orgId = oid();
    const list = await List.create({ orgId, name: 'Everyone' });
    // 1200 > the 1000 batch size, so this exercises multiple chunks.
    await Contact.insertMany(
      Array.from({ length: 1200 }, (_, i) => ({
        orgId,
        email: `u${i}@acme.com`,
        status: 'active',
        unsubscribeToken: `tok-${i}`,
        listIds: [list._id],
      })),
    );
    const campaign = await Campaign.create({
      orgId,
      name: 'Launch',
      status: 'scheduled',
      listIds: [list._id],
      templateId: oid(),
      createdBy: oid(),
    });

    const job = {
      data: { orgId: orgId.toString(), campaignId: campaign._id.toString() },
    } as unknown as Job<CampaignFanoutJob>;
    await processCampaignFanout(job);

    expect(
      await CampaignRecipient.countDocuments({ campaignId: campaign._id, status: 'queued' }),
    ).toBe(1200);
    const updated = await Campaign.findById(campaign._id);
    expect(updated!.status).toBe('running');
    expect(updated!.stats.queued).toBe(1200);

    // One send job per recipient, delivered in bulk batches (not 1200 calls).
    const totalJobs = enqueueBulk.mock.calls.reduce(
      (n, call) => n + (call[1] as unknown[]).length,
      0,
    );
    expect(totalJobs).toBe(1200);
    expect(enqueueBulk.mock.calls.length).toBeLessThan(1200);
  });

  it('only enqueues active contacts and is idempotent on re-fanout', async () => {
    const orgId = oid();
    const list = await List.create({ orgId, name: 'Mixed' });
    await Contact.insertMany([
      { orgId, email: 'a@x.com', status: 'active', unsubscribeToken: 'a', listIds: [list._id] },
      {
        orgId,
        email: 'b@x.com',
        status: 'unsubscribed',
        unsubscribeToken: 'b',
        listIds: [list._id],
      },
      { orgId, email: 'c@x.com', status: 'bounced', unsubscribeToken: 'c', listIds: [list._id] },
    ]);
    const campaign = await Campaign.create({
      orgId,
      name: 'C',
      status: 'scheduled',
      listIds: [list._id],
      templateId: oid(),
      createdBy: oid(),
    });
    const job = {
      data: { orgId: orgId.toString(), campaignId: campaign._id.toString() },
    } as unknown as Job<CampaignFanoutJob>;

    await processCampaignFanout(job);
    await processCampaignFanout(job); // re-run must not duplicate recipients

    expect(await CampaignRecipient.countDocuments({ campaignId: campaign._id })).toBe(1);
  });
});
