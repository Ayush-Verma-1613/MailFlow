import { redirect } from 'next/navigation';
import { connectToDatabase, List } from '@mailflow/db';

import { auth } from '@/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { ContactsView } from '@/components/contacts/contacts-view';

export const metadata = { title: 'Contacts' };

export default async function ContactsPage() {
  const session = await auth();
  if (!session?.user) redirect('/signin');

  await connectToDatabase();
  const lists = await List.find({ orgId: session.user.orgId }).sort({ name: 1 }).lean();

  return (
    <div>
      <PageHeader
        title="Contacts"
        description="Your lead lists and CRM. Import, segment, and manage recipients."
      />
      <ContactsView
        lists={lists.map((l) => ({
          id: l._id.toString(),
          name: l.name,
          contactCount: l.contactCount,
        }))}
      />
    </div>
  );
}
