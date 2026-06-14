import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { connectToDatabase, EmailAccount } from '@mailflow/db';

import { env } from '@mailflow/shared/env';

import { auth } from '@/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { AccountsView } from '@/components/accounts/accounts-view';
import { DnsGuidance } from '@/components/accounts/dns-guidance';
import { sanitizeAccount } from '@/lib/email-account';
import type { AccountCardData } from '@/components/accounts/account-card';

export const metadata = { title: 'Accounts' };

export default async function AccountsPage() {
  const session = await auth();
  if (!session?.user) redirect('/signin');

  await connectToDatabase();
  const docs = await EmailAccount.find({ orgId: session.user.orgId })
    .sort({ createdAt: -1 })
    .lean();

  const accounts: AccountCardData[] = docs.map((doc) => {
    const a = sanitizeAccount(doc);
    return {
      id: a.id,
      provider: a.provider,
      displayName: a.displayName,
      fromEmail: a.fromEmail,
      fromName: a.fromName,
      limits: { dailyCap: a.limits.dailyCap, hourlyCap: a.limits.hourlyCap },
      health: {
        status: a.health.status,
        sentToday: a.health.sentToday,
        lastError: a.health.lastError,
      },
      dkimRecord: a.dkimRecord ? { host: a.dkimRecord.host, value: a.dkimRecord.value } : null,
    };
  });

  // Unique sending domains for DNS deliverability guidance.
  const domains = [
    ...new Set(accounts.map((a) => a.fromEmail.split('@')[1]).filter(Boolean) as string[]),
  ];
  const appHost = (() => {
    try {
      return new URL(env.APP_URL).host;
    } catch {
      return 'app.mailflow.example';
    }
  })();

  return (
    <div className="space-y-6">
      <div>
        <PageHeader
          title="Email accounts"
          description="Connected sending mailboxes. Health and daily caps update as you send."
        />
        <Suspense fallback={null}>
          <AccountsView accounts={accounts} />
        </Suspense>
      </div>
      <DnsGuidance domains={domains} appHost={appHost} />
    </div>
  );
}
