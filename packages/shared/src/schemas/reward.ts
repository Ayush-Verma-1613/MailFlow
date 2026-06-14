import { z } from 'zod';

export const rewardCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  grantAction: z.object({
    type: z.enum(['webhook', 'api']).default('webhook'),
    url: z.string().url('A valid grant URL is required'),
    /** Handlebars-style template ({{email}}, {{firstName}}, {{rewardName}}) → request body. */
    payloadTemplate: z.string().max(8000).optional(),
    /** Optional HMAC secret used to sign the outbound request. */
    secret: z.string().max(200).optional(),
  }),
});
export type RewardCreateInput = z.infer<typeof rewardCreateSchema>;
