'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';
import { NAV_GROUPS } from '@/lib/nav';

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-0.5">
          <div className="label-mono px-2.5 pt-3.5 pb-1.5 text-[10px] text-muted-2">
            {group.label}
          </div>
          {group.items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex items-center gap-2.5 rounded-sm px-2.5 py-[7px] text-[13.5px] transition-colors',
                  active
                    ? 'bg-surface text-ink shadow-[inset_0_0_0_1px_rgb(var(--hairline))]'
                    : 'text-ink-2 hover:bg-foreground/[0.04]',
                )}
              >
                {/* clay left rail on active */}
                {active && (
                  <span className="bg-clay absolute top-2 bottom-2 -left-[14px] w-0.5 rounded-r-sm" />
                )}
                <item.icon
                  className={cn('size-[15px] shrink-0', active ? 'text-clay' : 'opacity-70')}
                  strokeWidth={1.6}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
