import { Schema, defineModel, type Types } from './_helpers';

export interface IRewardGrant {
  contactId: Types.ObjectId;
  grantedAt: Date;
  /** External reference returned by the grant target (e.g. license id). */
  ref?: string;
}

export interface IReward {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  name: string;
  /** All conditions that must match for the reward to fire. */
  condition: { matchAll: Array<{ field: string; op: string; value: unknown }> };
  grantAction: {
    type: 'webhook' | 'api';
    url: string;
    /** Handlebars-style template rendered with grant context → request body. */
    payloadTemplate?: string;
    /** Encrypted HMAC secret used to sign outbound webhook. */
    secret?: string;
  };
  recipients: IRewardGrant[];
  createdAt: Date;
  updatedAt: Date;
}

const grantSchema = new Schema<IRewardGrant>(
  {
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact', required: true },
    grantedAt: { type: Date, default: Date.now },
    ref: { type: String },
  },
  { _id: false },
);

const rewardSchema = new Schema<IReward>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
    name: { type: String, required: true, trim: true },
    condition: {
      matchAll: { type: [Schema.Types.Mixed], default: [] },
    },
    grantAction: {
      type: { type: String, enum: ['webhook', 'api'], default: 'webhook' },
      url: { type: String, required: true },
      payloadTemplate: { type: String },
      secret: { type: String, select: false },
    },
    recipients: { type: [grantSchema], default: [] },
  },
  { timestamps: true },
);

rewardSchema.index({ orgId: 1 });

export const Reward = defineModel<IReward>('Reward', rewardSchema);
