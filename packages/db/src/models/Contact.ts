import { CONTACT_STATUSES, type ContactStatus } from '@mailflow/shared';
import { Schema, defineModel, type Types } from './_helpers';

export interface IContact {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  email: string;
  firstName?: string;
  lastName?: string;
  customFields: Map<string, string>;
  tags: string[];
  listIds: Types.ObjectId[];
  status: ContactStatus;
  source?: string;
  unsubscribeToken: string;
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema<IContact>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    customFields: { type: Map, of: String, default: () => new Map() },
    tags: { type: [String], default: [], index: true },
    listIds: { type: [Schema.Types.ObjectId], ref: 'List', default: [], index: true },
    status: { type: String, enum: CONTACT_STATUSES, default: 'active' },
    source: { type: String },
    // Opaque per-contact token embedded in unsubscribe links.
    unsubscribeToken: { type: String, required: true, index: true },
  },
  { timestamps: true },
);

// Dedupe contacts per org by email.
contactSchema.index({ orgId: 1, email: 1 }, { unique: true });
contactSchema.index({ orgId: 1, status: 1 });

export const Contact = defineModel<IContact>('Contact', contactSchema);
