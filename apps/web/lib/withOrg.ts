/**
 * `withOrg` — the single gate every authenticated API route passes through.
 *
 * It resolves the session, ensures a DB connection, and hands the handler a
 * trusted {@link OrgContext}. The orgId comes ONLY from the server session —
 * never from client input — which is what enforces multi-tenant isolation.
 */
import 'server-only';
import { connectToDatabase } from '@mailflow/db';
import { ROLE_RANK, type Role } from '@mailflow/shared';
import type { OrgContext } from '@mailflow/shared';

import { auth } from '@/auth';
import { forbidden, serverError, unauthorized } from './api';

type RouteContext = { params: Promise<Record<string, string>> };

type Handler = (
  req: Request,
  ctx: OrgContext,
  routeCtx: RouteContext,
) => Promise<Response> | Response;

interface WithOrgOptions {
  /** Minimum role required to invoke the handler. */
  role?: Role;
}

export function withOrg(handler: Handler, options: WithOrgOptions = {}) {
  return async (req: Request, routeCtx: RouteContext): Promise<Response> => {
    const session = await auth();
    if (!session?.user?.id || !session.user.orgId) {
      return unauthorized();
    }

    if (options.role && !hasAtLeastRole(session.user.role, options.role)) {
      return forbidden(`Requires role: ${options.role}`);
    }

    const ctx: OrgContext = {
      userId: session.user.id,
      orgId: session.user.orgId,
      role: session.user.role,
    };

    try {
      await connectToDatabase();
      return await handler(req, ctx, routeCtx);
    } catch (error) {
      console.error('[withOrg] handler error:', error);
      return serverError();
    }
  };
}

export function hasAtLeastRole(role: Role, minimum: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}
