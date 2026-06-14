'use client';

import { usePathname } from 'next/navigation';
import { Bell, Search, Sparkles } from 'lucide-react';

import { NAV_ITEMS } from '@/lib/nav';
import { UserMenu } from '@/components/dashboard/user-menu';

interface TopbarProps {
  name: string | null;
  email: string;
  image: string | null;
}

export function Topbar({ name, email, image }: TopbarProps) {
  const pathname = usePathname();
  const match = [...NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
  const section = match?.label ?? 'Overview';

  return (
    <header className="bg-canvas sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-hairline px-7">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <span>Dashboard</span>
        <span className="text-muted-2">/</span>
        <span className="text-ink">{section}</span>
      </div>

      {/* Search pill */}
      <button
        type="button"
        className="bg-surface text-muted-foreground hover:border-hairline-strong ml-2 flex h-8 min-w-[280px] items-center gap-2 rounded-sm border border-hairline px-2.5 text-[12.5px] transition-colors"
      >
        <Search className="size-3.5" strokeWidth={1.6} />
        <span>Search threads, contacts, campaigns…</span>
        <span className="mono text-muted-foreground ml-auto rounded border border-hairline bg-canvas px-1.5 py-0.5 text-[10px]">
          ⌘K
        </span>
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Notifications"
          className="text-muted-foreground hover:bg-surface hover:text-ink grid size-[30px] place-items-center rounded-sm border border-transparent transition-colors hover:border-hairline"
        >
          <Bell className="size-[16px]" strokeWidth={1.6} />
        </button>
        <button
          type="button"
          aria-label="AI assistant"
          className="text-muted-foreground hover:bg-surface hover:text-ink grid size-[30px] place-items-center rounded-sm border border-transparent transition-colors hover:border-hairline"
        >
          <Sparkles className="size-[16px]" strokeWidth={1.6} />
        </button>
        <div className="ml-1">
          <UserMenu name={name} email={email} image={image} />
        </div>
      </div>
    </header>
  );
}
