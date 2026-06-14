import { redirect } from 'next/navigation';
import { connectToDatabase, Org } from '@mailflow/db';
import { ROLE_RANK } from '@mailflow/shared';

import { auth } from '@/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { AdminPanels } from '@/components/settings/admin-panels';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect('/signin');

  await connectToDatabase();
  const org = await Org.findById(session.user.orgId).lean();
  const isAdmin = ROLE_RANK[session.user.role] >= ROLE_RANK.admin;

  const rows: Array<{ label: string; value: string }> = [
    { label: 'Workspace', value: org?.name ?? '—' },
    { label: 'Slug', value: org?.slug ?? '—' },
    { label: 'Plan', value: org?.plan ?? 'free' },
    { label: 'Your role', value: session.user.role },
    { label: 'Email', value: session.user.email ?? '—' },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings" description="Workspace, API access, and activity." />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workspace</CardTitle>
          <CardDescription>Your organization and account.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="divide-y">
            {rows.map((row) => (
              <div key={row.label} className="flex justify-between py-2.5 text-sm">
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="font-medium capitalize">{row.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {isAdmin && <AdminPanels />}
    </div>
  );
}
