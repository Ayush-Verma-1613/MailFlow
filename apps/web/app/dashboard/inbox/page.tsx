import { redirect } from 'next/navigation';
import { connectToDatabase, EmailAccount } from '@mailflow/db';

import { auth } from '@/auth';
import { InboxView } from '@/components/inbox/inbox-view';

export const metadata = { title: 'Inbox' };

export default async function InboxPage() {
  const session = await auth();
  if (!session?.user) redirect('/signin');

  await connectToDatabase();
  const accounts = await EmailAccount.find({ orgId: session.user.orgId })
    .select('displayName fromEmail health')
    .sort({ createdAt: -1 })
    .lean();

  return (
    <InboxView
      accounts={accounts.map((a) => ({
        id: a._id.toString(),
        name: a.displayName,
        email: a.fromEmail,
        status: a.health.status,
      }))}
    />
  );
}
