import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { rateLimit } from '@mailflow/queue';
import { signInSchema, type Role } from '@mailflow/shared';
import { env } from '@mailflow/shared/env';

import { authConfig } from './auth.config';
import { ensureOAuthUser, verifyCredentials } from './lib/auth-service';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  secret: env.AUTH_SECRET,
  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      // Do NOT auto-link a Google sign-in to an existing same-email account:
      // credentials accounts aren't email-verified here, so auto-linking is an
      // account-takeover vector. (Explicit, verified linking is a follow-up.)
      allowDangerousEmailAccountLinking: false,
    }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        const parsed = signInSchema.safeParse(credentials);
        if (!parsed.success) return null;
        // Throttle password attempts per email to blunt brute-forcing. On limit
        // we return null (same as a bad password) — no work, no info leak.
        const limited = await rateLimit(`signin:${parsed.data.email.toLowerCase()}`, {
          limit: 10,
          windowSec: 900,
        });
        if (!limited.allowed) return null;
        const user = await verifyCredentials(parsed.data.email, parsed.data.password);
        if (!user) return null;
        // Block sign-in until the email is verified (closes the unverified-
        // account takeover vector). The signup flow emails a verification link.
        if (!user.emailVerified) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          orgId: user.orgId,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    /**
     * Runs only at sign-in (when `user` is present). We resolve the canonical
     * DB user — creating an org for brand-new Google users — and stamp the
     * tenant context onto the token so subsequent requests carry it statelessly.
     */
    async jwt({ token, user }) {
      if (user?.email) {
        const resolved = await ensureOAuthUser({
          email: user.email,
          name: user.name,
          image: user.image,
        });
        token.id = resolved.id;
        token.orgId = resolved.orgId;
        token.role = resolved.role;
      }
      return token;
    },
    async session({ session, token }) {
      // Token fields are stamped in the jwt callback above. Read them with the
      // concrete types (the base JWT indexes to `unknown`).
      if (session.user) {
        session.user.id = token.id as string;
        session.user.orgId = token.orgId as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
});
