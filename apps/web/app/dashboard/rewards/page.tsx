import { redirect } from 'next/navigation';
import { connectToDatabase, Reward } from '@mailflow/db';

import { auth } from '@/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { RewardsView, type RewardItem } from '@/components/rewards/rewards-view';

export const metadata = { title: 'Rewards' };

export default async function RewardsPage() {
  const session = await auth();
  if (!session?.user) redirect('/signin');

  await connectToDatabase();
  const docs = await Reward.find({ orgId: session.user.orgId })
    .sort({ createdAt: -1 })
    .lean();

  const rewards: RewardItem[] = docs.map((r) => ({
    id: r._id.toString(),
    name: r.name,
    url: r.grantAction.url,
    hasSecret: Boolean(r.grantAction.secret),
    grantCount: r.recipients.length,
  }));

  return (
    <div>
      <PageHeader
        title="Rewards"
        description="Grant lifetime premium (or any perk) to qualifying contacts via a signed webhook."
      />
      <RewardsView rewards={rewards} />
    </div>
  );
}
