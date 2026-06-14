import { Contact } from '@mailflow/db';
import {
  contactCreateSchema,
  contactQuerySchema,
  paginationQuery,
  type Paginated,
} from '@mailflow/shared';
import type { FilterQuery } from 'mongoose';

import { conflict, ok, parseBody, parseQuery, serverError } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';
import { newUnsubscribeToken, recomputeListCount } from '@/lib/contacts-service';

const listQuerySchema = paginationQuery.merge(contactQuerySchema);

interface ContactDto {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  status: string;
  tags: string[];
  listIds: string[];
  createdAt: string;
}

/** Paginated, filterable contact list. */
export const GET = withOrg(async (req, ctx) => {
  const parsed = parseQuery(req.url, listQuerySchema);
  if (!parsed.ok) return parsed.response;
  const { page, pageSize, search, listId, status, tag } = parsed.data;

  const filter: FilterQuery<Record<string, unknown>> = { orgId: ctx.orgId };
  if (listId) filter.listIds = listId;
  if (status) filter.status = status;
  if (tag) filter.tags = tag;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ email: rx }, { firstName: rx }, { lastName: rx }];
  }

  const [total, docs] = await Promise.all([
    Contact.countDocuments(filter),
    Contact.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
  ]);

  const items: ContactDto[] = docs.map((c) => ({
    id: c._id.toString(),
    email: c.email,
    firstName: c.firstName,
    lastName: c.lastName,
    status: c.status,
    tags: c.tags ?? [],
    listIds: (c.listIds ?? []).map((l) => l.toString()),
    createdAt: c.createdAt.toISOString(),
  }));

  const body: Paginated<ContactDto> = {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
  return ok(body);
});

/** Create a single contact. */
export const POST = withOrg(
  async (req, ctx) => {
    const parsed = await parseBody(req, contactCreateSchema);
    if (!parsed.ok) return parsed.response;
    const input = parsed.data;

    try {
      const contact = await Contact.create({
        orgId: ctx.orgId,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        tags: input.tags,
        listIds: input.listIds,
        customFields: input.customFields,
        source: input.source ?? 'manual',
        status: 'active',
        unsubscribeToken: newUnsubscribeToken(),
      });

      // Keep list counts fresh.
      await Promise.all(input.listIds.map((id) => recomputeListCount(ctx.orgId, id)));

      return ok({ id: contact._id.toString() }, { status: 201 });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        return conflict('A contact with that email already exists');
      }
      console.error('[contacts.create] error:', error);
      return serverError('Could not create contact');
    }
  },
  { role: 'member' },
);

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
