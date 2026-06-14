import { Template } from '@mailflow/db';
import { extractMergeTags, templateCreateSchema } from '@mailflow/shared';

import { ok, parseBody } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';

interface TemplateListItem {
  id: string;
  name: string;
  subject: string;
  category?: string;
  mergeTags: string[];
  updatedAt: string;
}

/** All templates for the org (list view — bodies omitted for payload size). */
export const GET = withOrg(async (_req, ctx) => {
  const docs = await Template.find({ orgId: ctx.orgId })
    .select('name subject category mergeTags updatedAt')
    .sort({ updatedAt: -1 })
    .lean();

  const templates: TemplateListItem[] = docs.map((t) => ({
    id: t._id.toString(),
    name: t.name,
    subject: t.subject,
    category: t.category,
    mergeTags: t.mergeTags ?? [],
    updatedAt: t.updatedAt.toISOString(),
  }));
  return ok({ templates });
});

/** Create a template; merge tags are auto-extracted from subject + body. */
export const POST = withOrg(
  async (req, ctx) => {
    const parsed = await parseBody(req, templateCreateSchema);
    if (!parsed.ok) return parsed.response;
    const input = parsed.data;

    const mergeTags = extractMergeTags(
      input.subject,
      input.bodyHtml,
      ...input.variants.flatMap((v) => [v.subject, v.bodyHtml]),
    );

    const template = await Template.create({
      orgId: ctx.orgId,
      ...input,
      mergeTags,
    });
    return ok({ id: template._id.toString() }, { status: 201 });
  },
  { role: 'member' },
);
