import { AI_INTENTS, MESSAGE_DIRECTIONS, type AiIntent, type MessageDirection } from '@mailflow/shared';
import { Schema, defineModel, type Types } from './_helpers';

export interface IMessageAttachment {
  filename: string;
  contentType: string;
  size: number;
  /** Storage reference (e.g. S3 key) — bodies of large attachments not inlined. */
  storageKey?: string;
}

export interface IMessageAi {
  intent?: AiIntent;
  confidence?: number;
  entities?: Record<string, unknown>;
  summary?: string;
  draftReply?: string;
  analyzedAt?: Date;
}

export interface IMessage {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  threadId: Types.ObjectId;
  emailAccountId: Types.ObjectId;
  direction: MessageDirection;
  messageId: string; // rfc822 Message-ID (globally unique)
  inReplyTo?: string;
  references: string[];
  from: string;
  to: string[];
  cc?: string[];
  subject?: string;
  snippet?: string;
  bodyHtml?: string;
  bodyText?: string;
  attachments: IMessageAttachment[];
  receivedAt?: Date;
  sentAt?: Date;
  ai?: IMessageAi;
  createdAt: Date;
  updatedAt: Date;
}

const attachmentSchema = new Schema<IMessageAttachment>(
  {
    filename: { type: String, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    storageKey: { type: String },
  },
  { _id: false },
);

const messageSchema = new Schema<IMessage>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
    threadId: { type: Schema.Types.ObjectId, ref: 'Thread', required: true },
    emailAccountId: { type: Schema.Types.ObjectId, ref: 'EmailAccount', required: true },
    direction: { type: String, enum: MESSAGE_DIRECTIONS, required: true },
    messageId: { type: String, required: true },
    inReplyTo: { type: String },
    references: { type: [String], default: [] },
    from: { type: String, required: true },
    to: { type: [String], default: [] },
    cc: { type: [String] },
    subject: { type: String },
    snippet: { type: String },
    bodyHtml: { type: String },
    bodyText: { type: String },
    attachments: { type: [attachmentSchema], default: [] },
    receivedAt: { type: Date },
    sentAt: { type: Date },
    ai: {
      intent: { type: String, enum: AI_INTENTS },
      confidence: { type: Number },
      entities: { type: Schema.Types.Mixed },
      summary: { type: String },
      draftReply: { type: String },
      analyzedAt: { type: Date },
    },
  },
  { timestamps: true },
);

messageSchema.index({ orgId: 1, threadId: 1 });
messageSchema.index({ messageId: 1 }, { unique: true });

export const Message = defineModel<IMessage>('Message', messageSchema);
