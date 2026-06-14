import { z } from 'zod';
import { ApiKey } from '@mailflow/db';

import { ok, parseBody } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';
import { audit } from '@/lib/audit';
import { generateApiKey } from '@/lib/api-keys';

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  scopes: z.array(z.string().trim().min(1)).min(1).default(['*']),
});

/** List API keys (never returns the hash or raw key). */
export const GET = withOrg(
  async (_req, ctx) => {
    const keys = await ApiKey.find({ orgId: ctx.orgId }).sort({ createdAt: -1 }).lean();
    return ok({
      keys: keys.map((k) => ({
        id: k._id.toString(),
        name: k.name,
        prefix: k.prefix,
        scopes: k.scopes,
        lastUsedAt: k.lastUsedAt?.toISOString(),
        createdAt: k.createdAt.toISOString(),
      })),
    });
  },
  { role: 'admin' },
);

/** Create a key — the raw value is returned exactly once. */
export const POST = withOrg(
  async (req, ctx) => {
    const parsed = await parseBody(req, createSchema);
    if (!parsed.ok) return parsed.response;

    const { raw, prefix, hashedKey } = await generateApiKey();
    const key = await ApiKey.create({
      orgId: ctx.orgId,
      name: parsed.data.name,
      hashedKey,
      prefix,
      scopes: parsed.data.scopes,
      createdBy: ctx.userId,
    });

    await audit({
      orgId: ctx.orgId,
      actorId: ctx.userId,
      action: 'apikey.create',
      target: { kind: 'ApiKey', id: key._id.toString() },
      meta: { name: parsed.data.name },
    });

    // `key` shown once — the client must store it now.
    return ok({ id: key._id.toString(), key: raw, prefix }, { status: 201 });
  },
  { role: 'admin' },
);
