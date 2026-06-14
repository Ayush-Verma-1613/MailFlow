import { describe, expect, it } from 'vitest';
import { Campaign, CampaignRecipient, Contact, mongoose } from '@mailflow/db';

import { applyBounce } from '../../apps/worker/src/lib/inbound';

const oid = () => new mongoose.Types.ObjectId();

async function seed() {
  const orgId = oid();
  const contact = await Contact.create({
    orgId,
    email: 'bob@example.com',
    status: 'active',
    unsubscribeToken: 'tok-bob',
  });
  const campaign = await Campaign.create({
    orgId,
    name: 'Spring blast',
    status: 'running',
    templateId: oid(),
    createdBy: oid(),
  });
  const recipient = await CampaignRecipient.create({
    orgId,
    campaignId: campaign._id,
    contactId: contact._id,
    status: 'sent',
  });
  return { orgId, contact, campaign, recipient };
}

describe('applyBounce (integration)', () => {
  it('suppresses the contact, flips the sent recipient, and bumps stats.bounced', async () => {
    const { orgId, contact, campaign, recipient } = await seed();

    const suppressed = await applyBounce(orgId.toString(), {
      recipients: ['bob@example.com'],
      permanent: true,
      status: '5.1.1',
    });

    expect(suppressed).toBe(1);
    expect((await Contact.findById(contact._id))!.status).toBe('bounced');

    const r = await CampaignRecipient.findById(recipient._id);
    expect(r!.status).toBe('bounced');
    expect(r!.events.some((e) => e.type === 'bounce')).toBe(true);

    expect((await Campaign.findById(campaign._id))!.stats.bounced).toBe(1);
  });

  it('is idempotent — re-processing the same bounce does not double-count', async () => {
    const { orgId, campaign } = await seed();
    const report = { recipients: ['bob@example.com'], permanent: true, status: '5.1.1' };

    await applyBounce(orgId.toString(), report);
    await applyBounce(orgId.toString(), report);

    expect((await Campaign.findById(campaign._id))!.stats.bounced).toBe(1);
  });

  it('ignores recipients with no matching contact', async () => {
    const suppressed = await applyBounce(oid().toString(), {
      recipients: ['nobody@example.com'],
      permanent: true,
    });
    expect(suppressed).toBe(0);
  });
});
