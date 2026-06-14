import type { Role } from './constants';

/** The authenticated principal carried in the Auth.js JWT/session. */
export interface SessionUser {
  id: string;
  orgId: string;
  role: Role;
  email: string;
  name?: string | null;
  image?: string | null;
}

/** Resolved tenant context attached to every authorized API handler. */
export interface OrgContext {
  userId: string;
  orgId: string;
  role: Role;
}

/** Uniform API error envelope returned by route handlers. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    /** Field-level validation issues, when applicable. */
    details?: Array<{ path: string; message: string }>;
  };
}

/** A discriminated result type for service-layer functions that can fail. */
export type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
