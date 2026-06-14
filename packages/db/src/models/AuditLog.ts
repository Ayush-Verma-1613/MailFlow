import { Schema, defineModel, type Types } from './_helpers';

/** Immutable audit trail of privileged actions, per org. */
export interface IAuditLog {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  actorId?: Types.ObjectId;
  action: string; // e.g. 'account.connect', 'campaign.launch', 'reward.grant'
  target?: { kind: string; id?: string };
  meta?: Record<string, unknown>;
  at: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    target: {
      kind: { type: String },
      id: { type: String },
    },
    meta: { type: Schema.Types.Mixed },
    at: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

auditLogSchema.index({ orgId: 1, at: -1 });
auditLogSchema.index({ orgId: 1, action: 1, at: -1 });

export const AuditLog = defineModel<IAuditLog>('AuditLog', auditLogSchema);
