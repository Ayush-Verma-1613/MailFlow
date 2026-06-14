import { Org, User } from '@mailflow/db';

import { ok, notFound } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';

/** Current user + org context for the signed-in session. */
export const GET = withOrg(async (_req, ctx) => {
  const [user, org] = await Promise.all([
    User.findById(ctx.userId).lean(),
    Org.findById(ctx.orgId).lean(),
  ]);
  if (!user || !org) return notFound('Account not found');

  return ok({
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name ?? null,
      image: user.image ?? null,
      role: user.role,
    },
    org: {
      id: org._id.toString(),
      name: org.name,
      slug: org.slug,
      plan: org.plan,
    },
  });
});
