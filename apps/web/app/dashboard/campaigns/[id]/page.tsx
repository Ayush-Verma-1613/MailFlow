import { notFound, redirect } from 'next/navigation';
import { connectToDatabase, Campaign } from '@mailflow/db';

import { auth } from '@/auth';
import { CampaignDetail } from '@/components/campaigns/campaign-detail';

export const metadata = { title: 'Campaign' };

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/signin');
  const { id } = await params;

  await connectToDatabase();
  const c = await Campaign.findOne({ _id: id, orgId: session.user.orgId }).lean();
  if (!c) notFound();

  return (
    <CampaignDetail
      id={c._id.toString()}
      name={c.name}
      initialStatus={c.status}
      initialStats={c.stats}
    />
  );
}
