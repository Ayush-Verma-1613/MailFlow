import { AuditLog } from '@mailflow/db';
import { paginationQuery, type Paginated } from '@mailflow/shared';

import { ok, parseQuery } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';

interface AuditDto {
  id: string;
  action: string;
  actorId?: string;
  target?: { kind: string; id?: string };
  meta?: Record<string, unknown>;
  at: string;
}

/** Immutable audit trail for the org (admin only). */
export const GET = withOrg(
  async (req, ctx) => {
    const parsed = parseQuery(req.url, paginationQuery);
    if (!parsed.ok) return parsed.response;
    const { page, pageSize } = parsed.data;

    const [total, docs] = await Promise.all([
      AuditLog.countDocuments({ orgId: ctx.orgId }),
      AuditLog.find({ orgId: ctx.orgId })
        .sort({ at: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
    ]);

    const items: AuditDto[] = docs.map((a) => ({
      id: a._id.toString(),
      action: a.action,
      actorId: a.actorId?.toString(),
      target: a.target,
      meta: a.meta,
      at: a.at.toISOString(),
    }));
    const body: Paginated<AuditDto> = {
      items,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
    return ok(body);
  },
  { role: 'admin' },
);
