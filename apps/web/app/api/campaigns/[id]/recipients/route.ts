import { CampaignRecipient } from '@mailflow/db';
import { paginationQuery, RECIPIENT_STATUSES, type Paginated } from '@mailflow/shared';
import { z } from 'zod';
import type { FilterQuery } from 'mongoose';

import { notFound, ok, parseQuery } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';

const querySchema = paginationQuery.extend({
  status: z.enum(RECIPIENT_STATUSES).optional(),
});

interface RecipientDto {
  id: string;
  email: string;
  status: string;
  sentAt?: string;
  lastError?: string;
}

/** Paginated recipients for a campaign, optionally filtered by status. */
export const GET = withOrg(async (req, ctx, routeCtx) => {
  const { id } = await routeCtx.params;
  if (!id) return notFound('Campaign not found');

  const parsed = parseQuery(req.url, querySchema);
  if (!parsed.ok) return parsed.response;
  const { page, pageSize, status } = parsed.data;

  const filter: FilterQuery<Record<string, unknown>> = { campaignId: id, orgId: ctx.orgId };
  if (status) filter.status = status;

  const [total, docs] = await Promise.all([
    CampaignRecipient.countDocuments(filter),
    CampaignRecipient.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate<{ contactId: { email: string } }>('contactId', 'email')
      .lean(),
  ]);

  const items: RecipientDto[] = docs.map((r) => {
    const contact = r.contactId as unknown as { email?: string } | null;
    return {
      id: r._id.toString(),
      email: contact?.email ?? '—',
      status: r.status,
      sentAt: r.sentAt?.toISOString(),
      lastError: r.lastError,
    };
  });

  const body: Paginated<RecipientDto> = {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
  return ok(body);
});
