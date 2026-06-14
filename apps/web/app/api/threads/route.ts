import { Thread } from '@mailflow/db';
import { paginationQuery, THREAD_STATUSES, objectId, type Paginated } from '@mailflow/shared';
import { z } from 'zod';
import type { FilterQuery } from 'mongoose';

import { ok, parseQuery } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';

const querySchema = paginationQuery.extend({
  accountId: objectId.optional(),
  status: z.enum(THREAD_STATUSES).optional(),
});

interface ThreadDto {
  id: string;
  subject: string;
  participants: string[];
  lastMessageAt: string;
  messageCount: number;
  aiIntent?: string;
  aiSummary?: string;
  status: string;
  accountId: string;
}

/** Paginated thread list for the unified inbox. */
export const GET = withOrg(async (req, ctx) => {
  const parsed = parseQuery(req.url, querySchema);
  if (!parsed.ok) return parsed.response;
  const { page, pageSize, search, accountId, status } = parsed.data;

  const filter: FilterQuery<Record<string, unknown>> = { orgId: ctx.orgId };
  if (accountId) filter.emailAccountId = accountId;
  if (status) filter.status = status;
  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ subject: rx }, { participants: rx }];
  }

  const [total, docs] = await Promise.all([
    Thread.countDocuments(filter),
    Thread.find(filter)
      .sort({ lastMessageAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
  ]);

  const items: ThreadDto[] = docs.map((t) => ({
    id: t._id.toString(),
    subject: t.subject,
    participants: t.participants ?? [],
    lastMessageAt: t.lastMessageAt.toISOString(),
    messageCount: t.messageCount,
    aiIntent: t.aiIntent,
    aiSummary: t.aiSummary,
    status: t.status,
    accountId: t.emailAccountId.toString(),
  }));

  const body: Paginated<ThreadDto> = {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
  return ok(body);
});
