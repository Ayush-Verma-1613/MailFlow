import { describe, expect, it } from 'vitest';
import { Campaign, CampaignRecipient, Contact, Message, mongoose } from '@mailflow/db';

import { ingestParsedMessage } from '../../apps/worker/src/lib/inbound';
import type { ParsedEmail } from '@mailflow/email';

const oid = () => new mongoose.Types.ObjectId();

function parsed(overrides: Partial<ParsedEmail>): ParsedEmail {
  return {
    messageId: '<in-1@reply.com>',
    references: [],
    to: ['sales@us.com'],
    cc: [],
    snippet: 'hello',
    ...overrides,
  };
}

describe('ingestParsedMessage (integration)', () => {
  it('creates a thread + inbound message for a fresh email', async () => {
    const orgId = oid().toString();
    const res = await ingestParsedMessage({
      orgId,
      accountId: oid().toString(),
      parsed: parsed({ from: 'jane@acme.com', subject: 'Hi' }),
    });

    expect(res.deduped).toBe(false);
    expect(res.threadId).toBeDefined();
    const msg = await Message.findById(res.messageDbId);
    expect(msg!.direction).toBe('in');
    expect(msg!.from).toBe('jane@acme.com');
  });

  it('dedupes a message it has already stored (by Message-ID)', async () => {
    const orgId = oid().toString();
    const accountId = oid().toString();
    const p = parsed({ messageId: '<dupe@x.com>', from: 'jane@acme.com' });

    const first = await ingestParsedMessage({ orgId, accountId, parsed: p });
    const second = await ingestParsedMessage({ orgId, accountId, parsed: p });

    expect(first.deduped).toBe(false);
    expect(second.deduped).toBe(true);
    expect(await Message.countDocuments({ orgId, messageId: '<dupe@x.com>' })).toBe(1);
  });

  it('links a reply to its campaign send and records stats.replied once', async () => {
    const orgId = oid();
    const contact = await Contact.create({
      orgId,
      email: 'lead@acme.com',
      status: 'active',
      unsubscribeToken: 'tok-lead',
    });
    const campaign = await Campaign.create({
      orgId,
      name: 'Outreach',
      status: 'running',
      templateId: oid(),
      createdBy: oid(),
    });
    await CampaignRecipient.create({
      orgId,
      campaignId: campaign._id,
      contactId: contact._id,
      status: 'sent',
      messageId: '<out-1@us.com>',
    });

    const res = await ingestParsedMessage({
      orgId: orgId.toString(),
      accountId: oid().toString(),
      parsed: parsed({
        messageId: '<reply-1@acme.com>',
        from: 'lead@acme.com',
        inReplyTo: '<out-1@us.com>',
        references: ['<out-1@us.com>'],
      }),
    });

    expect(res.isReply).toBe(true);
    expect(res.linkedCampaignId).toBe(campaign._id.toString());

    const recip = await CampaignRecipient.findOne({ campaignId: campaign._id });
    expect(recip!.events.some((e) => e.type === 'reply')).toBe(true);
    expect((await Campaign.findById(campaign._id))!.stats.replied).toBe(1);
  });
});
