import Link from 'next/link';
import { redirect } from 'next/navigation';
import { connectToDatabase, Org } from '@mailflow/db';
import { Search } from 'lucide-react';

import { auth } from '@/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Brand } from '@/components/dashboard/brand';
import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import { Topbar } from '@/components/dashboard/topbar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defense-in-depth: middleware gates this, but never render without a session.
  const session = await auth();
  if (!session?.user) redirect('/signin');

  await connectToDatabase();
  const org = await Org.findById(session.user.orgId).select('name').lean();

  const name = session.user.name ?? null;
  const email = session.user.email ?? '';
  const initials = (name ?? email)
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="bg-canvas flex min-h-svh">
      {/* Sidebar */}
      <aside className="bg-canvas hidden w-[232px] shrink-0 flex-col border-r border-hairline px-3.5 py-4 md:flex">
        <Link href="/dashboard" className="px-2 pt-1.5 pb-5">
          <Brand />
        </Link>

        {/* Quick find */}
        <button
          type="button"
          className="text-muted-foreground hover:bg-foreground/[0.03] mb-1.5 flex h-7 items-center gap-2 rounded-sm border border-dashed border-hairline-strong px-2.5 text-[12.5px] transition-colors"
        >
          <Search className="size-3.5" strokeWidth={1.6} />
          <span>Quick find</span>
          <span className="mono ml-auto rounded border border-hairline px-1.5 py-px text-[10px]">
            ⌘K
          </span>
        </button>

        <SidebarNav />

        {/* User meta footer */}
        <div className="mt-auto flex items-center gap-2.5 border-t border-hairline pt-3">
          <Avatar className="size-[26px]">
            {session.user.image && <AvatarImage src={session.user.image} alt={name ?? email} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[12.5px]">{name ?? 'Account'}</div>
            <div className="mono text-muted-foreground truncate text-[11px]">
              {org?.name ?? 'Workspace'} · {session.user.role}
            </div>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar name={name} email={email} image={session.user.image ?? null} />
        <main className="flex-1 px-8 pt-7 pb-16">{children}</main>
      </div>
    </div>
  );
}
