import { Contact } from '@mailflow/db';
import {
  contactCreateSchema,
  paginationQuery,
  type Paginated,
} from '@mailflow/shared';

import { conflict, ok, parseBody, parseQuery, serverError } from '@/lib/api';
import { withApiKey } from '@/lib/withApiKey';
import { newUnsubscribeToken } from '@/lib/contacts-service';

interface ContactDto {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  status: string;
  tags: string[];
}

/** Public API: list contacts (scope `contacts:read`). */
export const GET = withApiKey(
  async (req, ctx) => {
    const parsed = parseQuery(req.url, paginationQuery);
    if (!parsed.ok) return parsed.response;
    const { page, pageSize } = parsed.data;

    const [total, docs] = await Promise.all([
      Contact.countDocuments({ orgId: ctx.orgId }),
      Contact.find({ orgId: ctx.orgId })
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
    }));
    const body: Paginated<ContactDto> = {
      items,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
    return ok(body);
  },
  { scope: 'contacts:read' },
);

/** Public API: create a contact (scope `contacts:write`). */
export const POST = withApiKey(
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
        source: input.source ?? 'api',
        status: 'active',
        unsubscribeToken: newUnsubscribeToken(),
      });
      return ok({ id: contact._id.toString() }, { status: 201 });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        return conflict('A contact with that email already exists');
      }
      console.error('[v1/contacts] error:', error);
      return serverError('Could not create contact');
    }
  },
  { scope: 'contacts:write' },
);
