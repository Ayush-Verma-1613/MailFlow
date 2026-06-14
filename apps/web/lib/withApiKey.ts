/**
 * Gate for the public `/api/v1/*` API. Authenticates a Bearer API key, enforces
 * a required scope, and hands the handler a trusted org context.
 */
import 'server-only';
import { connectToDatabase } from '@mailflow/db';

import { forbidden, serverError, unauthorized } from './api';
import { hasScope, verifyApiKey } from './api-keys';

export interface ApiKeyContext {
  orgId: string;
  scopes: string[];
}

type RouteContext = { params: Promise<Record<string, string>> };
type Handler = (
  req: Request,
  ctx: ApiKeyContext,
  routeCtx: RouteContext,
) => Promise<Response> | Response;

export function withApiKey(handler: Handler, options: { scope?: string } = {}) {
  return async (req: Request, routeCtx: RouteContext): Promise<Response> => {
    const header = req.headers.get('authorization') ?? '';
    const raw = header.toLowerCase().startsWith('bearer ') ? header.slice(7) : null;

    await connectToDatabase();
    const verified = await verifyApiKey(raw);
    if (!verified) return unauthorized('Invalid or missing API key');

    if (options.scope && !hasScope(verified.scopes, options.scope)) {
      return forbidden(`Missing scope: ${options.scope}`);
    }

    try {
      return await handler(req, { orgId: verified.orgId, scopes: verified.scopes }, routeCtx);
    } catch (error) {
      console.error('[withApiKey] handler error:', error);
      return serverError();
    }
  };
}
