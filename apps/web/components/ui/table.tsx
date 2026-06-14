import * as React from 'react';

import { cn } from '@/lib/utils';

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div className="relative w-full overflow-x-auto">
      <table
        className={cn('w-full caption-bottom border-separate border-spacing-0 text-sm', className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead className={cn('[&_tr]:border-b', className)} {...props} />;
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody className={cn('[&>tr:last-child>td]:border-0', className)} {...props} />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      className={cn(
        '[&>td]:border-b [&>td]:border-hairline hover:[&>td]:bg-foreground/[0.015] data-[state=selected]:[&>td]:bg-foreground/[0.02] transition-colors',
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      className={cn(
        'text-muted-foreground bg-card border-b border-hairline h-9 px-3.5 text-left align-middle font-mono text-[10.5px] font-medium uppercase tracking-[0.06em]',
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return <td className={cn('px-3.5 py-3 align-middle text-[13px]', className)} {...props} />;
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
