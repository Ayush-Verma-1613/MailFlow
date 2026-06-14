import {
  RECIPIENT_EVENT_TYPES,
  RECIPIENT_STATUSES,
  type RecipientEventType,
  type RecipientStatus,
} from '@mailflow/shared';
import { Schema, defineModel, type Types } from './_helpers';

export interface IRecipientEvent {
  type: RecipientEventType;
  at: Date;
  meta?: Record<string, unknown>;
}

/** One send attempt: a (campaign, contact) pairing routed through an account. */
export interface ICampaignRecipient {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  campaignId: Types.ObjectId;
  contactId: Types.ObjectId;
  emailAccountId?: Types.ObjectId;
  status: RecipientStatus;
  messageId?: string; // rfc822 Message-ID of the sent mail
  threadId?: Types.ObjectId;
  scheduledFor?: Date;
  sentAt?: Date;
  attempts: number;
  lastError?: string;
  events: IRecipientEvent[];
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IRecipientEvent>(
  {
    type: { type: String, enum: RECIPIENT_EVENT_TYPES, required: true },
    at: { type: Date, required: true, default: Date.now },
    meta: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

const recipientSchema = new Schema<ICampaignRecipient>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact', required: true },
    emailAccountId: { type: Schema.Types.ObjectId, ref: 'EmailAccount' },
    status: { type: String, enum: RECIPIENT_STATUSES, default: 'queued' },
    messageId: { type: String },
    threadId: { type: Schema.Types.ObjectId, ref: 'Thread' },
    scheduledFor: { type: Date },
    sentAt: { type: Date },
    attempts: { type: Number, default: 0 },
    lastError: { type: String },
    events: { type: [eventSchema], default: [] },
  },
  { timestamps: true },
);

recipientSchema.index({ campaignId: 1, status: 1 });
recipientSchema.index({ scheduledFor: 1, status: 1 });
// Prevent emailing the same contact twice in one campaign.
recipientSchema.index({ campaignId: 1, contactId: 1 }, { unique: true });
recipientSchema.index({ messageId: 1 }, { sparse: true });

export const CampaignRecipient = defineModel<ICampaignRecipient>(
  'CampaignRecipient',
  recipientSchema,
);
