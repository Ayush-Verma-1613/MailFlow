import 'server-only';
import { Campaign, CampaignRecipient } from '@mailflow/db';
import type { RecipientEventType } from '@mailflow/shared';

/** Map an event type to the campaign stat it increments (first occurrence only). */
const STAT_FIELD: Partial<Record<RecipientEventType, string>> = {
  open: 'stats.opened',
  click: 'stats.clicked',
};

/**
 * Record a tracking event on a recipient. The campaign stat is incremented only
 * on the first event of that type for the recipient (unique opens/clicks).
 */
export async function recordRecipientEvent(
  recipientId: string,
  type: RecipientEventType,
  meta?: Record<string, unknown>,
): Promise<void> {
  const recipient = await CampaignRecipient.findById(recipientId).select(
    'campaignId events',
  );
  if (!recipient) return;

  const isFirst = !recipient.events.some((e) => e.type === type);
  recipient.events.push({ type, at: new Date(), meta });
  await recipient.save();

  const field = STAT_FIELD[type];
  if (isFirst && field) {
    await Campaign.updateOne({ _id: recipient.campaignId }, { $inc: { [field]: 1 } });
  }
}
