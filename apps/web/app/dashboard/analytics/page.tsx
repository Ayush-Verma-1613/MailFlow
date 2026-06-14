import { redirect } from 'next/navigation';
import { connectToDatabase } from '@mailflow/db';

import { auth } from '@/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { AnalyticsView } from '@/components/analytics/analytics-view';
import { getAccountAnalytics, getOverview } from '@/lib/analytics-service';

export const metadata = { title: 'Analytics' };

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect('/signin');

  await connectToDatabase();
  const [overview, accounts] = await Promise.all([
    getOverview(session.user.orgId),
    getAccountAnalytics(session.user.orgId),
  ]);

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Engagement funnel, AI intent breakdown, and sender health."
      />
      <AnalyticsView overview={overview} accounts={accounts} />
    </div>
  );
}
