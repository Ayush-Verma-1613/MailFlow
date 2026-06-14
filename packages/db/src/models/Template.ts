import { Schema, defineModel, type Types } from './_helpers';

export interface ITemplateVariant {
  name: string;
  subject: string;
  bodyHtml: string;
}

export interface ITemplate {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  mergeTags: string[];
  variants: ITemplateVariant[];
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

const variantSchema = new Schema<ITemplateVariant>(
  {
    name: { type: String, required: true },
    subject: { type: String, required: true },
    bodyHtml: { type: String, required: true },
  },
  { _id: false },
);

const templateSchema = new Schema<ITemplate>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
    name: { type: String, required: true, trim: true },
    subject: { type: String, required: true },
    bodyHtml: { type: String, required: true },
    bodyText: { type: String },
    mergeTags: { type: [String], default: [] },
    variants: { type: [variantSchema], default: [] },
    category: { type: String },
  },
  { timestamps: true },
);

templateSchema.index({ orgId: 1, name: 1 });

export const Template = defineModel<ITemplate>('Template', templateSchema);
