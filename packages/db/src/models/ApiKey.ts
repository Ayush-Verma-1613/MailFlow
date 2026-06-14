import { Schema, defineModel, type Types } from './_helpers';

export interface IApiKey {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  name: string;
  /** bcrypt hash of the raw key; the raw key is shown only once at creation. */
  hashedKey: string;
  /** Short non-secret prefix shown in the UI to identify the key. */
  prefix: string;
  scopes: string[];
  createdBy: Types.ObjectId;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const apiKeySchema = new Schema<IApiKey>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
    name: { type: String, required: true, trim: true },
    hashedKey: { type: String, required: true, select: false },
    prefix: { type: String, required: true },
    scopes: { type: [String], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lastUsedAt: { type: Date },
  },
  { timestamps: true },
);

apiKeySchema.index({ orgId: 1 });
apiKeySchema.index({ prefix: 1 });

export const ApiKey = defineModel<IApiKey>('ApiKey', apiKeySchema);
