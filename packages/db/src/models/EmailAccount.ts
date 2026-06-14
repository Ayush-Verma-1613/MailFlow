import {
  ACCOUNT_HEALTH_STATUSES,
  EMAIL_PROVIDERS,
  type AccountHealthStatus,
  type EmailProvider,
} from '@mailflow/shared';
import { Schema, defineModel, type Types } from './_helpers';

/** Encrypted secret bag — fields are AES-GCM ciphertext (see crypto.ts). */
export interface IEmailAccountAuth {
  // gmail / oauth
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  // smtp
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  secure?: boolean;
  // sendgrid / mailgun
  apiKey?: string;
  domain?: string;
  // dkim (smtp): PEM private key (encrypted) + the DNS selector it's published
  // under + the base64 public key (non-secret; for re-displaying the DNS record)
  dkimPrivateKey?: string;
  dkimSelector?: string;
  dkimPublicKey?: string;
}

export interface IEmailAccountLimits {
  dailyCap: number;
  hourlyCap: number;
  warmupDay?: number;
}

export interface IEmailAccountHealth {
  status: AccountHealthStatus;
  lastError?: string;
  lastSentAt?: Date;
  sentToday: number;
  bouncesToday: number;
  resetAt?: Date;
}

export interface IEmailAccount {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  provider: EmailProvider;
  displayName: string;
  fromEmail: string;
  fromName: string;
  auth: IEmailAccountAuth;
  limits: IEmailAccountLimits;
  health: IEmailAccountHealth;
  /** Gmail push: when the current users.watch expires. */
  watchExpiration?: Date;
  /** Gmail history watermark for incremental fetch. */
  historyId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const emailAccountSchema = new Schema<IEmailAccount>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
    provider: { type: String, enum: EMAIL_PROVIDERS, required: true },
    displayName: { type: String, required: true, trim: true },
    fromEmail: { type: String, required: true, lowercase: true, trim: true },
    fromName: { type: String, required: true, trim: true },
    auth: {
      accessToken: { type: String, select: false },
      refreshToken: { type: String, select: false },
      expiresAt: { type: Date },
      host: { type: String },
      port: { type: Number },
      user: { type: String },
      pass: { type: String, select: false },
      secure: { type: Boolean },
      apiKey: { type: String, select: false },
      domain: { type: String },
      dkimPrivateKey: { type: String, select: false },
      dkimSelector: { type: String },
      dkimPublicKey: { type: String },
    },
    limits: {
      dailyCap: { type: Number, required: true, default: 500 },
      hourlyCap: { type: Number, required: true, default: 60 },
      warmupDay: { type: Number, default: 0 },
    },
    health: {
      status: {
        type: String,
        enum: ACCOUNT_HEALTH_STATUSES,
        default: 'connected',
      },
      lastError: { type: String },
      lastSentAt: { type: Date },
      sentToday: { type: Number, default: 0 },
      bouncesToday: { type: Number, default: 0 },
      resetAt: { type: Date },
    },
    watchExpiration: { type: Date },
    historyId: { type: String },
  },
  { timestamps: true },
);

emailAccountSchema.index({ orgId: 1, provider: 1 });
emailAccountSchema.index({ orgId: 1, fromEmail: 1 }, { unique: true });
// Used by the account-health scheduler to find watches needing refresh.
emailAccountSchema.index({ watchExpiration: 1 });

export const EmailAccount = defineModel<IEmailAccount>('EmailAccount', emailAccountSchema);
