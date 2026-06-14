import { NextResponse } from 'next/server';
import { z, ZodError, type ZodTypeAny } from 'zod';
import type { ApiErrorBody } from '@mailflow/shared';

/** Success JSON response. */
export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

/** Uniform error JSON response. */
export function fail(
  code: string,
  message: string,
  status: number,
  details?: ApiErrorBody['error']['details'],
): NextResponse {
  return NextResponse.json<ApiErrorBody>({ error: { code, message, details } }, { status });
}

// Common error shortcuts.
export const unauthorized = (msg = 'Not authenticated') => fail('UNAUTHORIZED', msg, 401);
export const forbidden = (msg = 'Insufficient permissions') => fail('FORBIDDEN', msg, 403);
export const notFound = (msg = 'Not found') => fail('NOT_FOUND', msg, 404);
export const conflict = (msg = 'Conflict') => fail('CONFLICT', msg, 409);
export const badRequest = (msg = 'Bad request') => fail('BAD_REQUEST', msg, 400);
export const serverError = (msg = 'Something went wrong') => fail('INTERNAL', msg, 500);
export const tooManyRequests = (msg = 'Too many requests', retryAfterMs?: number) => {
  const res = fail('RATE_LIMITED', msg, 429);
  if (retryAfterMs != null) {
    res.headers.set('Retry-After', String(Math.ceil(retryAfterMs / 1000)));
  }
  return res;
};

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  return xff?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

/** Parse + validate a request JSON body against a zod schema (output-typed). */
export async function parseBody<S extends ZodTypeAny>(
  req: Request,
  schema: S,
): Promise<{ ok: true; data: z.infer<S> } | { ok: false; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, response: badRequest('Invalid JSON body') };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return { ok: false, response: zodFail(result.error) };
  }
  return { ok: true, data: result.data };
}

/** Validate URL search params against a zod schema (output-typed). */
export function parseQuery<S extends ZodTypeAny>(
  url: string,
  schema: S,
): { ok: true; data: z.infer<S> } | { ok: false; response: NextResponse } {
  const params = Object.fromEntries(new URL(url).searchParams);
  const result = schema.safeParse(params);
  if (!result.success) return { ok: false, response: zodFail(result.error) };
  return { ok: true, data: result.data };
}

export function zodFail(error: ZodError): NextResponse {
  return fail(
    'VALIDATION',
    'Validation failed',
    422,
    error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  );
}
