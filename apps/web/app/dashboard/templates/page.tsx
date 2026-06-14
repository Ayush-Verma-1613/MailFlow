import { redirect } from 'next/navigation';
import { connectToDatabase, Template } from '@mailflow/db';

import { auth } from '@/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import {
  TemplatesView,
  type TemplateListItem,
} from '@/components/templates/templates-view';

export const metadata = { title: 'Templates' };

export default async function TemplatesPage() {
  const session = await auth();
  if (!session?.user) redirect('/signin');

  await connectToDatabase();
  const docs = await Template.find({ orgId: session.user.orgId })
    .select('name subject category mergeTags updatedAt')
    .sort({ updatedAt: -1 })
    .lean();

  const templates: TemplateListItem[] = docs.map((t) => ({
    id: t._id.toString(),
    name: t.name,
    subject: t.subject,
    category: t.category,
    mergeTags: t.mergeTags ?? [],
    updatedAt: t.updatedAt.toISOString(),
  }));

  return (
    <div>
      <PageHeader
        title="Templates"
        description="Reusable email templates with merge-tag personalization."
      />
      <TemplatesView templates={templates} />
    </div>
  );
}
