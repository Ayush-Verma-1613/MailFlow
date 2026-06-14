import { Schema, defineModel, type Types } from './_helpers';

export interface IOrgSettings {
  unsubscribeFooter?: string;
  brandColor?: string;
  fromDomain?: string;
}

export interface IOrg {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  ownerId: Types.ObjectId;
  plan: 'free' | 'pro' | 'enterprise';
  settings: IOrgSettings;
  createdAt: Date;
  updatedAt: Date;
}

const orgSchema = new Schema<IOrg>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    plan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
    settings: {
      unsubscribeFooter: { type: String },
      brandColor: { type: String },
      fromDomain: { type: String },
    },
  },
  { timestamps: true },
);

export const Org = defineModel<IOrg>('Org', orgSchema);
