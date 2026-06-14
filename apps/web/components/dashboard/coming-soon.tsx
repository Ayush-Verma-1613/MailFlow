import { Construction } from 'lucide-react';

/** Placeholder for dashboard sections delivered in a later roadmap phase. */
export function ComingSoon({ phase }: { phase: string }) {
  return (
    <div className="text-muted-foreground flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-xl border border-dashed text-center">
      <Construction className="size-8" />
      <div>
        <p className="text-foreground font-medium">Coming soon</p>
        <p className="text-sm">Built in {phase}.</p>
      </div>
    </div>
  );
}
