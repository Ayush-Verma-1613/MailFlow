import * as React from 'react';

import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-hairline bg-surface text-ink placeholder:text-muted-2 flex min-h-20 w-full rounded-sm border px-3 py-2 text-[13.5px] transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-50',
        'focus-visible:border-ink',
        'aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
