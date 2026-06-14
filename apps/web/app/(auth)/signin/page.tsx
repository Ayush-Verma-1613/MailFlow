import { Suspense } from 'react';
import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth/auth-shell';
import { EmailDivider } from '@/components/auth/email-divider';
import { GoogleButton } from '@/components/auth/google-button';
import { SignInForm } from '@/components/auth/signin-form';

export const metadata: Metadata = { title: 'Sign in' };

export default function SignInPage() {
  return (
    <AuthShell
      eyebrow="Welcome back"
      headline={
        <>
          The follow-up
          <br />
          sent <em className="text-clay italic">itself.</em>
        </>
      }
      copy="72 replies came in while you were asleep. 14 were hot. 3 already have meetings on your calendar. Sign in to triage the rest."
      switchPrompt="No account?"
      switchHref="/signup"
      switchLabel="Create one"
    >
      <h2 className="font-serif text-[40px] leading-[1.1] tracking-[-0.02em]">Sign in</h2>
      <p className="text-muted-foreground mt-2 text-[14px]">Pick up where you left off.</p>

      <div className="mt-7">
        <GoogleButton label="Continue with Google" />
      </div>
      <EmailDivider />
      <Suspense fallback={null}>
        <SignInForm />
      </Suspense>
    </AuthShell>
  );
}
