import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-safe base config shared by the full Node-runtime auth (`auth.ts`) and
 * the middleware. It must NOT import node-only modules (mongoose, bcrypt) so it
 * can run on the Edge runtime in `middleware.ts`.
 *
 * Provider list is intentionally empty here; `auth.ts` augments it with the
 * Credentials + Google providers that require node APIs.
 */
export const authConfig = {
  pages: {
    signIn: '/signin',
  },
  session: { strategy: 'jwt' },
  providers: [],
  callbacks: {
    /** Route gate used by middleware. Authenticated users only past here. */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user);
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      const isOnAuthPage =
        nextUrl.pathname === '/signin' || nextUrl.pathname === '/signup';

      if (isOnDashboard) return isLoggedIn;
      // Bounce signed-in users away from auth pages.
      if (isOnAuthPage && isLoggedIn) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
