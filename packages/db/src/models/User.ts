import { ROLES, type Role } from '@mailflow/shared';
import { Schema, defineModel, type Types } from './_helpers';

export interface IUser {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  email: string;
  name?: string;
  image?: string;
  role: Role;
  /** bcrypt hash; absent for OAuth-only accounts. */
  hashedPassword?: string;
  emailVerified?: Date;
  /** SHA-256 of the pending email-verification token (single-use). */
  verificationTokenHash?: string;
  verificationTokenExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, trim: true },
    image: { type: String },
    role: { type: String, enum: ROLES, default: 'admin' },
    hashedPassword: { type: String, select: false },
    emailVerified: { type: Date },
    verificationTokenHash: { type: String, select: false },
    verificationTokenExpires: { type: Date },
  },
  { timestamps: true },
);

// Email is globally unique (one login → one primary org for v1).
userSchema.index({ email: 1 }, { unique: true });

export const User = defineModel<IUser>('User', userSchema);
