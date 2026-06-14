import {
  CAMPAIGN_STATUSES,
  ROTATION_STRATEGIES,
  type CampaignStatus,
  type RotationStrategy,
} from '@mailflow/shared';
import { Schema, defineModel, type Types } from './_helpers';

export interface ICampaignSchedule {
  startAt?: Date;
  sendWindow: { tz: string; hours: [number, number] };
  perRecipientCap: number;
}

export interface ICampaignStats {
  queued: number;
  sent: number;
  delivered: number;
  bounced: number;
  opened: number;
  clicked: number;
  replied: number;
  unsubscribed: number;
}

export interface ICampaign {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  name: string;
  status: CampaignStatus;
  listIds: Types.ObjectId[];
  senderPoolIds: Types.ObjectId[];
  templateId: Types.ObjectId;
  schedule: ICampaignSchedule;
  rotation: RotationStrategy;
  stats: ICampaignStats;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const statsDefault = (): ICampaignStats => ({
  queued: 0,
  sent: 0,
  delivered: 0,
  bounced: 0,
  opened: 0,
  clicked: 0,
  replied: 0,
  unsubscribed: 0,
});

const campaignSchema = new Schema<ICampaign>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
    name: { type: String, required: true, trim: true },
    status: { type: String, enum: CAMPAIGN_STATUSES, default: 'draft', index: true },
    listIds: { type: [Schema.Types.ObjectId], ref: 'List', default: [] },
    senderPoolIds: { type: [Schema.Types.ObjectId], ref: 'EmailAccount', default: [] },
    templateId: { type: Schema.Types.ObjectId, ref: 'Template', required: true },
    schedule: {
      startAt: { type: Date },
      sendWindow: {
        tz: { type: String, default: 'UTC' },
        hours: { type: [Number], default: [9, 17] },
      },
      perRecipientCap: { type: Number, default: 1 },
    },
    rotation: { type: String, enum: ROTATION_STRATEGIES, default: 'round-robin' },
    stats: {
      queued: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      bounced: { type: Number, default: 0 },
      opened: { type: Number, default: 0 },
      clicked: { type: Number, default: 0 },
      replied: { type: Number, default: 0 },
      unsubscribed: { type: Number, default: 0 },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

campaignSchema.index({ orgId: 1, status: 1 });

export const Campaign = defineModel<ICampaign>('Campaign', campaignSchema);
export { statsDefault as campaignStatsDefault };
