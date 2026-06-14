import Papa from 'papaparse';
import { Contact } from '@mailflow/db';
import { contactQuerySchema, sanitizeCsvCell } from '@mailflow/shared';
import type { FilterQuery } from 'mongoose';

import { parseQuery } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';

/** Export contacts (optionally filtered) as a CSV download. */
export const GET = withOrg(async (req, ctx) => {
  const parsed = parseQuery(req.url, contactQuerySchema);
  if (!parsed.ok) return parsed.response;
  const { listId, status, tag } = parsed.data;

  const filter: FilterQuery<Record<string, unknown>> = { orgId: ctx.orgId };
  if (listId) filter.listIds = listId;
  if (status) filter.status = status;
  if (tag) filter.tags = tag;

  const docs = await Contact.find(filter).sort({ createdAt: -1 }).lean();
  // Sanitize every user-controlled cell against CSV/formula injection — a
  // contact's name or tag could be `=cmd|...` and execute when the export is
  // opened in a spreadsheet. `email`/`status`/`createdAt` are system-shaped but
  // sanitized too for defence in depth.
  const rows = docs.map((c) => ({
    email: sanitizeCsvCell(c.email),
    firstName: sanitizeCsvCell(c.firstName ?? ''),
    lastName: sanitizeCsvCell(c.lastName ?? ''),
    status: sanitizeCsvCell(c.status),
    tags: sanitizeCsvCell((c.tags ?? []).join('|')),
    createdAt: c.createdAt.toISOString(),
  }));

  const csv = Papa.unparse(rows, {
    columns: ['email', 'firstName', 'lastName', 'status', 'tags', 'createdAt'],
  });

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="contacts-${Date.now()}.csv"`,
    },
  });
});
