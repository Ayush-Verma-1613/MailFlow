import { redirect } from 'next/navigation';
import { connectToDatabase, EmailAccount, List, Template } from '@mailflow/db';

import { auth } from '@/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { CampaignWizard } from '@/components/campaigns/campaign-wizard';

export const metadata = { title: 'New campaign' };

export default async function NewCampaignPage() {
  const session = await auth();
  if (!session?.user) redirect('/signin');
  const orgId = session.user.orgId;

  await connectToDatabase();
  const [lists, accounts, templates] = await Promise.all([
    List.find({ orgId }).sort({ name: 1 }).lean(),
    EmailAccount.find({ orgId }).sort({ createdAt: -1 }).lean(),
    Template.find({ orgId }).select('name').sort({ updatedAt: -1 }).lean(),
  ]);

  return (
    <div>
      <PageHeader title="New campaign" description="Five quick steps to launch." />
      <CampaignWizard
        lists={lists.map((l) => ({
          id: l._id.toString(),
          name: l.name,
          meta: `${l.contactCount} contacts`,
        }))}
        senders={accounts.map((a) => ({
          id: a._id.toString(),
          name: a.displayName,
          meta: a.fromEmail,
        }))}
        templates={templates.map((t) => ({ id: t._id.toString(), name: t.name }))}
      />
    </div>
  );
}
