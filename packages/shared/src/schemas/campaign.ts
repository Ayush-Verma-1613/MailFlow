import { z } from 'zod';
import { ROTATION_STRATEGIES } from '../constants';
import { objectId } from './common';

export const sendWindowSchema = z.object({
  tz: z.string().default('UTC'),
  /** Allowed send hours [start, end) in the window's timezone, 0–24. */
  hours: z
    .tuple([z.number().int().min(0).max(24), z.number().int().min(0).max(24)])
    .default([9, 17]),
});

export const campaignScheduleSchema = z.object({
  startAt: z.coerce.date().optional(),
  sendWindow: sendWindowSchema.default({ tz: 'UTC', hours: [9, 17] }),
  /** Max sends per recipient (prevents duplicate emailing across reruns). */
  perRecipientCap: z.coerce.number().int().min(1).max(10).default(1),
});

export const campaignCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  listIds: z.array(objectId).min(1, 'Pick at least one list'),
  senderPoolIds: z.array(objectId).min(1, 'Pick at least one sender'),
  templateId: objectId,
  rotation: z.enum(ROTATION_STRATEGIES).default('round-robin'),
  schedule: campaignScheduleSchema.default({
    sendWindow: { tz: 'UTC', hours: [9, 17] },
    perRecipientCap: 1,
  }),
});
export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>;

export const campaignUpdateSchema = campaignCreateSchema.partial();
export type CampaignUpdateInput = z.infer<typeof campaignUpdateSchema>;
