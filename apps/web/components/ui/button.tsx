import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-[7px] whitespace-nowrap rounded-sm text-[13px] font-medium leading-none transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-3.5 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
  {
    variants: {
      variant: {
        // ink primary — the default action
        default: 'bg-primary text-primary-foreground border border-primary hover:bg-primary/90',
        // clay — precious accent CTA
        clay: 'bg-clay text-white border border-clay hover:bg-clay-ink',
        destructive:
          'bg-destructive text-destructive-foreground border border-destructive hover:bg-destructive/90',
        // neutral secondary — surface + hairline
        outline: 'bg-surface text-ink border border-hairline hover:bg-surface-2',
        secondary: 'bg-surface-2 text-ink border border-transparent hover:bg-surface-2/70',
        ghost: 'bg-transparent text-ink-2 border border-transparent hover:bg-surface',
        link: 'text-clay underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-8 px-3 has-[>svg]:px-2.5',
        sm: 'h-7 px-2.5 text-[12.5px] has-[>svg]:px-2',
        lg: 'h-[38px] px-4 text-[14px] has-[>svg]:px-3.5',
        icon: 'size-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
