import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border border-hairline px-2 py-0.5 text-[11.5px] font-medium leading-[1.4] w-fit whitespace-nowrap',
  {
    variants: {
      variant: {
        // neutral chip
        default: 'bg-secondary text-ink-2 border-hairline',
        secondary: 'bg-secondary text-secondary-foreground border-hairline',
        outline: 'text-foreground border-hairline',
        // semantic state — soft bg + state text, transparent border
        clay: 'border-transparent bg-clay-soft text-clay-ink',
        sage: 'border-transparent bg-sage-soft text-sage',
        amber: 'border-transparent bg-amber-soft text-amber',
        rose: 'border-transparent bg-rose-soft text-rose',
        // aliases used across the app
        success: 'border-transparent bg-sage-soft text-sage',
        warning: 'border-transparent bg-amber-soft text-amber',
        destructive: 'border-transparent bg-rose-soft text-rose',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
