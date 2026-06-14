import { ROLES, type Role } from '@mailflow/shared';
import { Schema, defineModel, type Types } from './_helpers';

/**
 * Links a user to an org with a role. Enables multi-org membership (v2 org
 * switching). For v1 every user has exactly one membership matching their
 * primary org.
 */
export interface IMembership {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  orgId: Types.ObjectId;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

const membershipSchema = new Schema<IMembership>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
    role: { type: String, enum: ROLES, default: 'member' },
  },
  { timestamps: true },
);

membershipSchema.index({ userId: 1, orgId: 1 }, { unique: true });
membershipSchema.index({ orgId: 1 });

export const Membership = defineModel<IMembership>('Membership', membershipSchema);
