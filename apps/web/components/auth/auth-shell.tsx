import Link from 'next/link';

import { Brand } from '@/components/dashboard/brand';

const activity: Array<[string, string, string, string]> = [
  ['02:14', 'Priya Shah replied to “Q1 budget intro”', 'sage', 'Interested'],
  ['03:48', 'Workflow “Hot-reply playbook” fired', 'clay', 'Action'],
  ['05:02', 'M. Okafor asked about pricing', 'sage', 'Question'],
  ['06:31', '4 OOO auto-replies filed', '', 'Filed'],
  ['07:15', 'Sender pool acme-sales-04 paused', 'amber', 'Health'],
];

const toneClass: Record<string, string> = {
  sage: 'bg-sage-soft text-sage',
  clay: 'bg-clay-soft text-clay-ink',
  amber: 'bg-amber-soft text-amber',
};

interface AuthShellProps {
  eyebrow: string;
  /** Serif headline; pass an <em> for the clay italic accent. */
  headline: React.ReactNode;
  copy: string;
  switchPrompt: string;
  switchHref: string;
  switchLabel: string;
  children: React.ReactNode;
}

export function AuthShell({
  eyebrow,
  headline,
  copy,
  switchPrompt,
  switchHref,
  switchLabel,
  children,
}: AuthShellProps) {
  return (
    <div className="grid min-h-svh grid-cols-1 lg:grid-cols-2">
      {/* Left — editorial */}
      <div className="bg-surface border-hairline hidden flex-col border-r px-12 py-10 lg:flex">
        <Brand />
        <div className="flex max-w-[520px] flex-1 flex-col justify-center">
          <div className="label-mono text-[11px] tracking-[0.1em]">{eyebrow}</div>
          <h1 className="font-serif mt-3.5 text-[clamp(40px,5vw,56px)] leading-[1.05] tracking-[-0.025em]">
            {headline}
          </h1>
          <p className="text-ink-2 mt-4 max-w-[440px] text-[15px] leading-[1.5]">{copy}</p>

          {/* Overnight activity */}
          <div className="border-hairline bg-canvas mt-9 max-w-[460px] overflow-hidden rounded-xl border">
            <div className="border-hairline flex items-center gap-2 border-b px-3.5 py-2.5">
              <span className="mono text-muted-foreground text-[10px]">OVERNIGHT · 6h ago → now</span>
              <span className="ml-auto flex items-center gap-1.5 text-[12px]">
                <span className="bg-sage size-1.5 rounded-full" /> live
              </span>
            </div>
            {activity.map(([t, msg, tone, lbl], i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-3.5 py-2.5 ${i < activity.length - 1 ? 'border-hairline border-b' : ''}`}
              >
                <span className="mono text-muted-foreground w-9 text-[11px]">{t}</span>
                <span className="flex-1 text-[13px]">{msg}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${tone ? toneClass[tone] : 'border-hairline text-muted-foreground border'}`}
                >
                  {lbl}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="text-muted-foreground mono text-[11px] tracking-[0.06em]">
          “One dashboard. No per-seat math.”
        </div>
      </div>

      {/* Right — form */}
      <div className="bg-canvas flex flex-col px-6 py-10 sm:px-14">
        <div className="text-muted-foreground flex items-center justify-end gap-2 text-[13px]">
          {switchPrompt}{' '}
          <Link href={switchHref} className="text-clay font-medium hover:underline">
            {switchLabel} →
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center">
          {children}
        </div>
        <div className="text-muted-foreground mono flex justify-between text-[11px]">
          <span>SOC 2 · Type II</span>
          <span>support@mailflow.io</span>
          <span>v2.4.1</span>
        </div>
      </div>
    </div>
  );
}
