import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

// Edge-safe auth instance (no providers that need node APIs). The `authorized`
// callback in authConfig decides access for matched routes.
export const { auth: middleware } = NextAuth(authConfig);

export default middleware((req) => {
  // The `authorized` callback already returned a redirect/boolean; nothing more
  // to do here. Kept as a thin pass-through for future request-level logic.
  void req;
});

export const config = {
  // Run on everything except static assets, image optimizer, and the auth API.
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
