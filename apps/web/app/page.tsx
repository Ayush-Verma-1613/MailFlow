import Link from 'next/link';
import {
  ArrowRight,
  ChevronRight,
  FileText,
  GitBranch,
  Inbox,
  ListFilter,
  Mail,
  Send,
  Sparkles,
  Star,
  UsersRound,
} from 'lucide-react';

import { Brand } from '@/components/dashboard/brand';
import { ModeToggle } from '@/components/mode-toggle';

export const metadata = {
  title: 'MailFlow — Cold email, warm enough to reply to',
};

const GoogleMark = () => (
  <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
    <path
      fill="#4285F4"
      d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4c-.2 1.2-.9 2.3-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"
    />
    <path
      fill="#34A853"
      d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"
    />
    <path
      fill="#FBBC05"
      d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1A10 10 0 0 0 2 12c0 1.6.4 3.2 1.1 4.6L6.4 14z"
    />
    <path
      fill="#EA4335"
      d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 3 14.7 2 12 2A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.4 3-4.1 5.6-4.1z"
    />
  </svg>
);

const navMid = ['Product', 'Workflows', 'Deliverability', 'Pricing'];

const previewNav: Array<[string, typeof Inbox, boolean, string?]> = [
  ['Inbox', Inbox, true, '12'],
  ['Campaigns', Send, false, '4'],
  ['Contacts', UsersRound, false],
  ['Templates', FileText, false],
  ['Workflows', GitBranch, false],
  ['Accounts', Mail, false, '8'],
];

const previewThreads: Array<[string, string, string, string, string, string]> = [
  ['Priya Shah', 'Q1 budget intro', 'Yes — let’s find a time next week.', 'sage', 'Interested', '2m'],
  ['M. Okafor', 'Re: pilot proposal', 'Can you send pricing for 20 seats?', 'sage', 'Question', '14m'],
  ['Dana Liu', 'Reaching out', 'Not the right time, ping in Q3.', 'amber', 'Maybe later', '1h'],
  ['Jonas K.', '5-min favor', 'Please remove me from this list.', 'rose', 'Unsubscribe', '3h'],
  ['Sara N.', 'Coffee?', 'Out of office until Aug 14…', '', 'Auto-reply', '5h'],
];

const toneClass: Record<string, string> = {
  sage: 'bg-sage-soft text-sage',
  amber: 'bg-amber-soft text-amber',
  rose: 'bg-rose-soft text-rose',
};

const features: Array<[string, string, typeof Mail, string]> = [
  ['Multi-account sending', 'Rotate across unlimited Gmail + SMTP boxes with per-account rate limits, warmup, and reputation scoring.', Mail, '01'],
  ['Unified inbox', 'Every reply, every mailbox, one Gmail-like view. Triage with keyboard shortcuts.', Inbox, '02'],
  ['AI reply analysis', 'Intent, sentiment, decision-maker signals. One-click suggested replies in your voice.', Sparkles, '03'],
  ['Workflow automation', 'Trigger follow-ups, list moves, tags, Slack pings, and rewards from reply signals.', GitBranch, '04'],
];

const steps: Array<[string, string]> = [
  ['Send', 'Rotated across 8 mailboxes, 47 sent today'],
  ['Detect reply', 'Bounce, OOO, real reply — sorted instantly'],
  ['Classify', 'Interested · Question · Maybe later · Out'],
  ['Decide', 'Route to human, draft reply, or auto-respond'],
  ['Reward', 'Hot leads get a perk; cold ones get follow-ups'],
];

const metrics: Array<[string, string, string]> = [
  ['3.4×', 'reply rate vs. blast tools', 'Northbeam pilot, 14 days'],
  ['62%', 'fewer hours/wk in inbox', 'across 240 operators'],
  ['9 min', 'from signup → first send', 'median, free tier'],
  ['0.4%', 'spam complaint rate', '12-month rolling'],
];

export default function HomePage() {
  return (
    <div className="bg-canvas text-ink min-h-svh overflow-x-hidden">
      {/* Nav */}
      <nav className="flex items-center gap-7 px-6 py-5 sm:px-14">
        <Brand />
        <div className="text-ink-2 ml-8 hidden items-center gap-7 text-[13.5px] lg:flex">
          {navMid.map((n) => (
            <span key={n}>{n}</span>
          ))}
          <span className="flex items-center gap-1.5">
            Changelog
            <span className="bg-sage-soft text-sage rounded-full px-1.5 py-0.5 text-[10px] font-medium">
              v2.4
            </span>
          </span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <ModeToggle />
          <Link href="/signin" className="text-ink-2 text-[13.5px] hover:underline">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="bg-primary text-primary-foreground inline-flex h-8 items-center gap-[7px] rounded-sm px-3 text-[13px] font-medium hover:bg-primary/90"
          >
            Start free trial <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-16 sm:px-14 sm:pt-20">
        <div className="border-hairline bg-surface text-ink-2 inline-flex items-center gap-2.5 rounded-full border py-[5px] pr-3 pl-[5px] text-[12.5px]">
          <span className="bg-sage-soft text-sage badge-dot inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium">
            NEW
          </span>
          <span>Intent classifier v3 — now catching “maybe later” replies</span>
          <span className="text-clay">Read post →</span>
        </div>

        <h1 className="font-serif mt-6 max-w-[1100px] text-[clamp(48px,9vw,96px)] leading-[0.95] font-normal tracking-[-0.035em]">
          Cold email,
          <br />
          <em className="text-clay italic">warm enough</em> to reply to.
        </h1>
        <p className="text-ink-2 mt-7 max-w-[560px] text-[17px] leading-[1.45]">
          MailFlow rotates your fleet of Gmail and SMTP mailboxes, classifies every reply with
          AI, and runs the follow-ups for you. One dashboard. Zero per-seat math.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link
            href="/signup"
            className="bg-primary text-primary-foreground inline-flex h-[38px] items-center gap-2 rounded-sm px-4 text-[14px] font-medium hover:bg-primary/90"
          >
            Start free — no card <ArrowRight className="size-4" />
          </Link>
          <button className="border-hairline-strong text-ink inline-flex h-[38px] items-center rounded-sm border px-4 text-[14px] font-medium hover:bg-surface">
            Book a 15-min demo
          </button>
          <div className="text-muted-foreground ml-4 hidden items-center gap-2.5 text-[12.5px] sm:flex">
            <span className="mono">SOC 2 · Type II</span>
            <span>·</span>
            <span>GDPR-ready</span>
          </div>
        </div>

        {/* Product preview slab */}
        <div
          className="border-hairline bg-surface mt-16 overflow-hidden rounded-[14px] border"
          style={{ boxShadow: 'var(--shadow-hero)' }}
        >
          {/* window chrome */}
          <div className="bg-canvas border-hairline flex h-8 items-center gap-1.5 border-b px-3.5">
            <span className="size-2.5 rounded-full bg-[#E5C2B9]" />
            <span className="size-2.5 rounded-full bg-[#E9D9B4]" />
            <span className="size-2.5 rounded-full bg-[#C9D9C8]" />
            <span className="mono text-muted-foreground mx-auto text-[11px]">app.mailflow.io / inbox</span>
          </div>
          <div className="grid h-[480px] grid-cols-[200px_300px_1fr_260px] max-lg:grid-cols-[1fr]">
            {/* mini sidebar */}
            <div className="border-hairline flex flex-col gap-0.5 border-r p-3 max-lg:hidden">
              <Brand />
              <div className="label-mono px-2 pt-3 pb-1 text-[10px]">Workspace</div>
              {previewNav.map(([label, Icon, active, badge], i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2.5 rounded-sm px-2.5 py-[7px] text-[13px] ${active ? 'bg-surface text-ink shadow-[inset_0_0_0_1px_rgb(var(--hairline))]' : 'text-ink-2'}`}
                >
                  <Icon className={`size-[15px] ${active ? 'text-clay' : 'opacity-70'}`} strokeWidth={1.6} />
                  <span>{label}</span>
                  {badge && (
                    <span className="bg-surface-2 text-muted-foreground mono ml-auto rounded-full px-1.5 text-[10px]">
                      {badge}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {/* thread list */}
            <div className="border-hairline overflow-hidden border-r max-lg:hidden">
              <div className="border-hairline flex items-center gap-2 border-b px-3.5 py-3">
                <span className="font-serif text-[17px]">Replies</span>
                <span className="bg-clay rounded-full px-1.5 text-[10px] font-medium text-white">12</span>
                <ListFilter className="text-muted-foreground ml-auto size-4" strokeWidth={1.6} />
              </div>
              {previewThreads.map(([who, sub, snippet, tone, intent, t], i) => (
                <div
                  key={i}
                  className={`border-hairline border-b px-3.5 py-3 ${i === 0 ? 'border-l-2 border-l-clay bg-clay/[0.04]' : 'border-l-2 border-l-transparent'}`}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-medium">{who}</span>
                    <span className="mono text-muted-foreground ml-auto text-[11px]">{t}</span>
                  </div>
                  <div className="mt-0.5 text-[12.5px]">{sub}</div>
                  <div className="text-muted-foreground mt-0.5 truncate text-[12px]">{snippet}</div>
                  <div className="mt-1.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${tone ? toneClass[tone] : 'border-hairline text-muted-foreground border'}`}
                    >
                      {intent}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {/* conversation */}
            <div className="overflow-hidden p-6 max-lg:hidden">
              <div className="flex items-center gap-2.5">
                <span className="font-serif text-[22px]">Q1 budget intro</span>
                <span className="bg-sage-soft text-sage badge-dot inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium">
                  Interested
                </span>
              </div>
              <div className="text-muted-foreground mono mt-1 text-[11px]">
                3 messages · started Mon, Jun 3 · sender pool · acme-sales-04
              </div>
              <div className="border-hairline bg-surface-2 mt-4 rounded-md border p-3.5">
                <div className="flex items-center gap-2 text-[12px]">
                  <span className="grid size-[22px] place-items-center rounded-full bg-[#5C6F8A] text-[10px] text-white">
                    PS
                  </span>
                  <b>Priya Shah</b>
                  <span className="mono text-muted-foreground ml-auto text-[11px]">2m ago</span>
                </div>
                <p className="mt-2.5 text-[13.5px] leading-[1.55]">
                  Yes — let’s find a time next week. Tuesday or Wednesday afternoon works. Could you
                  send a quick agenda + who’ll be joining? Also, do you have a one-pager I can
                  forward to our CFO?
                </p>
              </div>
              <div className="border-clay-soft bg-clay/[0.05] mt-3.5 rounded-md border p-3.5">
                <div className="text-clay-ink flex items-center gap-2 text-[12px]">
                  <Sparkles className="size-4" strokeWidth={1.6} />
                  <b>Suggested reply</b>
                  <span className="mono ml-auto text-[11px]">haiku-4.5 · 0.4s</span>
                </div>
                <p className="text-ink-2 mt-2 text-[13.5px] leading-[1.55]">
                  Tuesday at 2pm PT works — sending a calendar invite. Attaching the one-pager and a
                  short agenda below. From our side it’ll be me and Maya (CS)…
                </p>
                <div className="mt-2.5 flex gap-1.5">
                  <span className="bg-clay rounded-sm px-2.5 py-1 text-[12.5px] font-medium text-white">
                    Use draft
                  </span>
                  <span className="border-hairline bg-surface rounded-sm border px-2.5 py-1 text-[12.5px] font-medium">
                    Refine
                  </span>
                </div>
              </div>
            </div>
            {/* AI panel */}
            <div className="border-hairline bg-surface-2 overflow-hidden border-l p-[18px] max-lg:hidden">
              <div className="label-mono text-[10px]">AI Analysis</div>
              <div className="font-serif mt-2.5 text-[18px] leading-[1.2]">
                Hot lead. Asks for agenda + one-pager. Forwarding to CFO.
              </div>
              <div className="bg-hairline my-3 h-px" />
              {[['Intent', 'Interested'], ['Confidence', '0.94'], ['Next step', 'Book meeting'], ['Sentiment', 'Positive']].map(
                ([k, v]) => (
                  <div key={k} className="border-hairline flex border-b py-1.5 text-[12.5px]">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="ml-auto">{v}</span>
                  </div>
                ),
              )}
              <div className="label-mono mt-4 text-[10px]">Workflow triggered</div>
              <div className="border-hairline bg-surface mt-2 rounded-sm border p-2.5 text-[12px]">
                <div className="flex items-center gap-1.5">
                  <GitBranch className="size-3.5" strokeWidth={1.6} />
                  <b>Hot-reply playbook</b>
                </div>
                <div className="text-muted-foreground mt-1">
                  + Tag <span className="mono bg-surface-2 rounded px-1.5 py-0.5 text-[10.5px]">pilot-Q3</span> · Notify Slack
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* logo bar */}
        <div className="text-muted-foreground mt-14 flex flex-wrap items-center gap-x-12 gap-y-4 text-[12px]">
          <span className="mono">Sending from teams at</span>
          {['NORTHBEAM', 'ACME · SALES', 'BRIGHTLINE', 'OCTAVE', 'KEELBOAT', 'HARBOR & CO'].map((l) => (
            <span key={l} className="font-serif text-[18px] tracking-[0.03em] opacity-60">
              {l}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pt-28 sm:px-14">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="label-mono">How it works</div>
            <h2 className="font-serif mt-3 text-[clamp(40px,6vw,56px)] leading-none tracking-[-0.025em]">
              Four pieces.
              <br />
              <em className="text-clay italic">One pipeline.</em>
            </h2>
          </div>
          <p className="text-ink-2 max-w-[380px] text-[15px] leading-[1.5]">
            Built for operators running 20+ mailboxes a day. The boring parts — rotation, warmup,
            classification, follow-ups — automated. The judgment parts — surfaced.
          </p>
        </div>
        <div className="border-hairline grid grid-cols-1 gap-px overflow-hidden rounded-[14px] border bg-hairline sm:grid-cols-2 lg:grid-cols-4">
          {features.map(([t, d, Icon, n]) => (
            <div key={t} className="bg-surface px-6 pt-7 pb-8">
              <div className="flex items-center justify-between">
                <div className="bg-canvas border-hairline text-clay grid size-9 place-items-center rounded-md border">
                  <Icon className="size-[18px]" strokeWidth={1.6} />
                </div>
                <span className="mono text-muted-foreground text-[11px]">{n}</span>
              </div>
              <h3 className="font-serif mt-5 text-[22px] tracking-[-0.01em]">{t}</h3>
              <p className="text-muted-foreground mt-2.5 text-[13.5px] leading-[1.55]">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Workflow strip */}
      <section className="px-6 pt-28 sm:px-14">
        <div className="label-mono">Workflow</div>
        <h2 className="font-serif mt-2.5 max-w-[800px] text-[clamp(32px,5vw,48px)] leading-[1.05] tracking-[-0.025em]">
          Reply lands → AI classifies → workflow runs. While you sleep.
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map(([t, d], i) => (
            <div
              key={t}
              className={`border-hairline relative rounded-[10px] border px-[18px] pt-5 pb-[22px] ${i === 2 ? 'bg-clay/[0.06]' : 'bg-surface'}`}
            >
              <div className={`mono text-[10px] tracking-[0.06em] ${i === 2 ? 'text-clay' : 'text-muted-foreground'}`}>
                STEP {String(i + 1).padStart(2, '0')}
              </div>
              <div className="font-serif mt-1.5 text-[22px]">{t}</div>
              <div className="text-muted-foreground mt-2 text-[12.5px]">{d}</div>
              {i < steps.length - 1 && (
                <div className="bg-canvas text-muted-2 absolute top-1/2 -right-3 hidden -translate-y-1/2 lg:block">
                  <ChevronRight className="size-4" strokeWidth={1.6} />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Metrics + testimonial */}
      <section className="grid grid-cols-1 gap-16 px-6 pt-28 sm:px-14 lg:grid-cols-2">
        <div>
          <div className="label-mono">Results</div>
          <h2 className="font-serif mt-2.5 text-[clamp(32px,5vw,48px)] leading-[1.05]">
            The numbers we keep getting back.
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-6">
            {metrics.map(([n, l, s]) => (
              <div key={n}>
                <div className="font-serif text-[64px] leading-none tracking-[-0.03em]">{n}</div>
                <div className="mt-1.5 text-[14px]">{l}</div>
                <div className="text-muted-foreground mono mt-1 text-[11px]">{s}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-ink text-canvas flex flex-col justify-between gap-8 rounded-[14px] px-9 py-10">
          <div className="mono text-[14px] tracking-[0.08em] text-muted-2">FROM AN OPERATOR</div>
          <p className="font-serif text-[30px] leading-[1.25] tracking-[-0.01em]">
            “We were running fourteen Gmail tabs and a spreadsheet. MailFlow ate all of it. The AI
            replies are scary good — I had to triple-check one wasn’t mine.”
          </p>
          <div className="flex items-center gap-3">
            <span className="bg-clay grid size-8 place-items-center rounded-full text-[12px] font-medium text-white">
              MO
            </span>
            <div>
              <div className="text-[14px]">Maya Okafor</div>
              <div className="text-muted-2 mono text-[11px]">Head of Outbound · Brightline</div>
            </div>
            <div className="text-clay ml-auto flex gap-0.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} className="size-4 fill-current" strokeWidth={1.6} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pt-28 pb-20 sm:px-14">
        <div className="border-hairline bg-surface flex flex-col items-center gap-12 rounded-[14px] border px-8 py-16 sm:px-14 lg:flex-row">
          <div className="flex-1">
            <h2 className="font-serif text-[clamp(40px,6vw,56px)] leading-none tracking-[-0.025em]">
              Send the first one
              <br />
              <em className="text-clay italic">this afternoon.</em>
            </h2>
            <p className="text-muted-foreground mt-4 max-w-[480px] text-[15px]">
              Free tier ships with 2 mailboxes, 500 sends/mo, and the full AI inbox. Upgrade only
              when you actually need to.
            </p>
          </div>
          <div className="flex w-full min-w-[280px] flex-col gap-2.5 lg:w-auto">
            <Link
              href="/signup"
              className="bg-primary text-primary-foreground inline-flex h-[38px] items-center justify-center gap-2 rounded-sm px-4 text-[14px] font-medium hover:bg-primary/90"
            >
              Start free trial <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/signin"
              className="border-hairline text-ink inline-flex h-[38px] items-center justify-center gap-2 rounded-sm border px-4 text-[14px] font-medium hover:bg-surface-2"
            >
              <GoogleMark /> Continue with Google
            </Link>
            <span className="text-muted-foreground mono mt-2 text-center text-[11px]">NO CARD · 2 MIN SETUP</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-hairline flex flex-wrap items-center gap-6 border-t px-6 pt-8 pb-12 sm:px-14">
        <Brand />
        <span className="text-muted-foreground text-[12px]">
          © 2026 MailFlow Labs. Built on Next.js, BullMQ, MongoDB, OpenRouter.
        </span>
        <div className="text-muted-foreground ml-auto flex gap-5 text-[12.5px]">
          {['Status', 'Docs', 'API', 'Security', 'Privacy', 'Terms'].map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      </footer>
    </div>
  );
}
