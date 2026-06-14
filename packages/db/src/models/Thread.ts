import { AI_INTENTS, THREAD_STATUSES, type AiIntent, type ThreadStatus } from '@mailflow/shared';
import { Schema, defineModel, type Types } from './_helpers';

export interface IThread {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  emailAccountId: Types.ObjectId;
  subject: string;
  participants: string[];
  campaignId?: Types.ObjectId;
  contactId?: Types.ObjectId;
  lastMessageAt: Date;
  messageCount: number;
  aiSummary?: string;
  aiIntent?: AiIntent;
  status: ThreadStatus;
  createdAt: Date;
  updatedAt: Date;
}

const threadSchema = new Schema<IThread>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
    emailAccountId: { type: Schema.Types.ObjectId, ref: 'EmailAccount', required: true },
    subject: { type: String, default: '(no subject)' },
    participants: { type: [String], default: [] },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign' },
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact' },
    lastMessageAt: { type: Date, default: Date.now },
    messageCount: { type: Number, default: 0 },
    aiSummary: { type: String },
    aiIntent: { type: String, enum: AI_INTENTS },
    status: { type: String, enum: THREAD_STATUSES, default: 'open' },
  },
  { timestamps: true },
);

threadSchema.index({ orgId: 1, emailAccountId: 1, lastMessageAt: -1 });
threadSchema.index({ orgId: 1, status: 1 });
threadSchema.index({ contactId: 1 });

export const Thread = defineModel<IThread>('Thread', threadSchema);
