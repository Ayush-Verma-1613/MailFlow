'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';

import { ConnectGmailButton } from './connect-gmail-button';
import { SmtpDialog } from './smtp-dialog';
import { AccountCard, type AccountCardData } from './account-card';

const OAUTH_ERRORS: Record<string, string> = {
  cancelled: 'Google connection was cancelled',
  missing_code: 'Google did not return an authorization code',
  invalid_state: 'Security check failed — please try connecting again',
  exchange_failed: 'Could not complete the Google connection',
};

export function AccountsView({ accounts }: { accounts: AccountCardData[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const handled = useRef(false);

  // Surface the OAuth callback result, then clean the URL.
  useEffect(() => {
    if (handled.current) return;
    const connected = params.get('connected');
    const error = params.get('error');
    if (!connected && !error) return;
    handled.current = true;

    if (connected) toast.success(`Connected ${connected}`);
    if (error) toast.error(OAUTH_ERRORS[error] ?? 'Connection failed');

    router.replace('/dashboard/accounts');
  }, [params, router]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <ConnectGmailButton />
        <SmtpDialog />
      </div>

      {accounts.length === 0 ? (
        <div className="text-muted-foreground flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-xl border border-dashed text-center">
          <Mail className="size-8" />
          <div>
            <p className="text-foreground font-medium">No mailboxes connected</p>
            <p className="text-sm">Connect a Gmail or SMTP account to start sending.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      )}
    </div>
  );
}
