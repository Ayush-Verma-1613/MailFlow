import 'server-only';
import { AuditLog } from '@mailflow/db';

/** Append an immutable audit-trail entry. Never throws into the caller. */
export async function audit(params: {
  orgId: string;
  actorId?: string;
  action: string;
  target?: { kind: string; id?: string };
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await AuditLog.create({
      orgId: params.orgId,
      actorId: params.actorId,
      action: params.action,
      target: params.target,
      meta: params.meta,
      at: new Date(),
    });
  } catch (error) {
    console.error('[audit] failed to record', params.action, error);
  }
}
