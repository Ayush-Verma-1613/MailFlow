import { Send } from 'lucide-react';

import { cn } from '@/lib/utils';

/** Serif wordmark "Mail<em>flow</em>" with an ink mark tile. */
export function Brand({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="bg-ink text-canvas grid size-[22px] place-items-center rounded-md">
        <Send className="size-[13px]" strokeWidth={2} />
      </span>
      <span className="font-serif text-[20px] leading-none tracking-[-0.02em]">
        Mail<em className="text-clay italic">flow</em>
      </span>
    </div>
  );
}
