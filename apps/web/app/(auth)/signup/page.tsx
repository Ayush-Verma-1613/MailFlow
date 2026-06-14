import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth/auth-shell';
import { EmailDivider } from '@/components/auth/email-divider';
import { GoogleButton } from '@/components/auth/google-button';
import { SignUpForm } from '@/components/auth/signup-form';

export const metadata: Metadata = { title: 'Create account' };

export default function SignUpPage() {
  return (
    <AuthShell
      eyebrow="Get started free"
      headline={
        <>
          Send the first one
          <br />
          <em className="text-clay italic">this afternoon.</em>
        </>
      }
      copy="Two mailboxes, 500 sends a month, and the full AI inbox — free. Connect a mailbox and import your leads in under ten minutes."
      switchPrompt="Already have an account?"
      switchHref="/signin"
      switchLabel="Sign in"
    >
      <h2 className="font-serif text-[40px] leading-[1.1] tracking-[-0.02em]">
        Create your workspace
      </h2>
      <p className="text-muted-foreground mt-2 text-[14px]">Start sending in minutes.</p>

      <div className="mt-7">
        <GoogleButton label="Sign up with Google" />
      </div>
      <EmailDivider />
      <SignUpForm />
    </AuthShell>
  );
}
