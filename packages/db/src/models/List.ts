import { Schema, defineModel, type Types } from './_helpers';

export interface IList {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  name: string;
  /** Denormalised count, kept roughly in sync; recomputed on import. */
  contactCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const listSchema = new Schema<IList>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
    name: { type: String, required: true, trim: true },
    contactCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

listSchema.index({ orgId: 1, name: 1 }, { unique: true });

export const List = defineModel<IList>('List', listSchema);
