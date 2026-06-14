import { redirect } from 'next/navigation';
import { connectToDatabase, List, Template, Workflow } from '@mailflow/db';

import { auth } from '@/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { WorkflowsView, type WorkflowItem } from '@/components/workflows/workflows-view';

export const metadata = { title: 'Workflows' };

export default async function WorkflowsPage() {
  const session = await auth();
  if (!session?.user) redirect('/signin');
  const orgId = session.user.orgId;

  await connectToDatabase();
  const [docs, templates, lists] = await Promise.all([
    Workflow.find({ orgId }).sort({ createdAt: -1 }).lean(),
    Template.find({ orgId }).select('name').sort({ name: 1 }).lean(),
    List.find({ orgId }).select('name').sort({ name: 1 }).lean(),
  ]);

  const workflows: WorkflowItem[] = docs.map((w) => ({
    id: w._id.toString(),
    name: w.name,
    enabled: w.enabled,
    trigger: { type: w.trigger.type },
    stepCount: w.steps.length,
  }));

  return (
    <div>
      <PageHeader
        title="Workflows"
        description="Automate follow-ups, tagging, and rewards from reply signals."
      />
      <WorkflowsView
        workflows={workflows}
        templates={templates.map((t) => ({ id: t._id.toString(), name: t.name }))}
        lists={lists.map((l) => ({ id: l._id.toString(), name: l.name }))}
      />
    </div>
  );
}
