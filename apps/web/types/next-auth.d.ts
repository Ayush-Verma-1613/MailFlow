import type { Role } from '@mailflow/shared';
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      orgId: string;
      role: Role;
    } & DefaultSession['user'];
  }

  // The object returned from `authorize` / created on OAuth sign-in.
  interface User {
    orgId?: string;
    role?: Role;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    orgId: string;
    role: Role;
  }
}
