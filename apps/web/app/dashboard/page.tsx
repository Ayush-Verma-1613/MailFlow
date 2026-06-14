import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Check, Download, Plus } from 'lucide-react';
import {
  Campaign,
  connectToDatabase,
  Contact,
  Template,
  Thread,
  Workflow,
} from '@mailflow/db';

import { auth } from '@/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkline } from '@/components/charts/sparkline';
import { getAccountAnalytics, getOverview } from '@/lib/analytics-service';
import { cn } from '@/lib/utils';

type Tone = 'sage' | 'amber' | 'rose';

const healthDot: Record<string, string> = {
  connected: 'bg-sage',
  degraded: 'bg-amber',
  disconnected: 'bg-muted-2',
  error: 'bg-rose',
};
const toneFill: Record<Tone, string> = { sage: 'bg-sage', amber: 'bg-amber', rose: 'bg-rose' };
const toneBar: Record<Tone, string> = {
  sage: 'bg-sage-soft border-l-sage',
  amber: 'bg-amber-soft border-l-amber',
  rose: 'bg-rose-soft border-l-rose',
};

function statusTone(status: string): Tone {
  if (status === 'connected') return 'sage';
  if (status === 'degraded') return 'amber';
  return 'rose';
}

function intentTone(intent?: string): 'sage' | 'amber' | 'rose' | 'default' {
  if (!intent) return 'default';
  if (['interested', 'question'].includes(intent)) return 'sage';
  if (['maybe_later', 'out_of_office'].includes(intent)) return 'amber';
  if (['unsubscribe', 'bounce', 'spam', 'not_interested'].includes(intent)) return 'rose';
  return 'default';
}

function timeAgo(date: Date): string {
  const m = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60000));
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

export default async function DashboardHome() {
  const session = await auth();
  if (!session?.user) redirect('/signin');
  const orgId = session.user.orgId;
  const firstName = session.user.name?.split(' ')[0];

  await connectToDatabase();
  const [overview, accounts, contactCount, templateCount, campaignCount, workflowCount, threads] =
    await Promise.all([
      getOverview(orgId),
      getAccountAnalytics(orgId),
      Contact.countDocuments({ orgId }),
      Template.countDocuments({ orgId }),
      Campaign.countDocuments({ orgId }),
      Workflow.countDocuments({ orgId }),
      Thread.find({ orgId }).sort({ lastMessageAt: -1 }).limit(4).lean(),
    ]);

  const kpis: Array<{ label: string; value: string; sub: string; spark: number[]; color: string }> = [
    { label: 'Sent', value: String(overview.funnel.sent), sub: `${overview.totals.campaigns} campaigns`, spark: [12, 18, 14, 22, 24, 30, 28, 35], color: 'rgb(var(--clay))' },
    { label: 'Open rate', value: `${overview.rates.openRate}%`, sub: `${overview.funnel.opened} opens`, spark: [40, 42, 41, 45, 44, 46, 47, 47], color: 'rgb(var(--clay))' },
    { label: 'Reply rate', value: `${overview.rates.replyRate}%`, sub: `${overview.funnel.replied} replies`, spark: [6, 7, 6.5, 7.2, 7.8, 8, 7.9, 8.1], color: 'rgb(var(--sage))' },
    { label: 'Bounce rate', value: `${overview.rates.bounceRate}%`, sub: `${overview.funnel.bounced} bounced`, spark: [2.1, 2, 1.8, 1.7, 1.6, 1.5, 1.4, 1.4], color: 'rgb(var(--sage))' },
  ];

  const onboarding: Array<{ title: string; sub: string; done: boolean; n: string; href: string }> = [
    { title: 'Connect a mailbox', sub: 'Gmail OAuth or SMTP.', done: accounts.length > 0, n: String(accounts.length), href: '/dashboard/accounts' },
    { title: 'Import contacts', sub: `${contactCount} contacts.`, done: contactCount > 0, n: String(contactCount), href: '/dashboard/contacts' },
    { title: 'Pick a template', sub: `${templateCount} templates.`, done: templateCount > 0, n: String(templateCount), href: '/dashboard/templates' },
    { title: 'Launch a campaign', sub: 'Choose list, sender pool, template.', done: campaignCount > 0, n: String(campaignCount), href: '/dashboard/campaigns/new' },
    { title: 'Build a workflow', sub: 'Auto-route hot replies; tag and reward.', done: workflowCount > 0, n: String(workflowCount), href: '/dashboard/workflows' },
  ];
  const doneCount = onboarding.filter((o) => o.done).length;

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="font-serif text-[32px] leading-[1.1] tracking-[-0.02em]">
            Good day
            {firstName ? (
              <>
                , <em className="text-clay italic">{firstName}.</em>
              </>
            ) : (
              '.'
            )}
          </h1>
          <p className="text-muted-foreground text-[13.5px]">
            {accounts.length} mailboxes connected · {overview.funnel.sent} sent all-time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download /> Export weekly
          </Button>
          <Button variant="clay" asChild>
            <Link href="/dashboard/campaigns/new">
              <Plus /> New campaign
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-[18px]">
              <div className="flex items-start justify-between">
                <div className="label-mono">{k.label}</div>
                <Sparkline data={k.spark} color={k.color} />
              </div>
              <div className="font-serif mt-2.5 text-[36px] leading-none tracking-[-0.02em]">
                {k.value}
              </div>
              <div className="mono text-muted-foreground mt-2 text-[11px]">{k.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Onboarding + sender health */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center gap-2.5">
            <CardTitle>Get your outreach running</CardTitle>
            <span className="text-muted-foreground text-[12px]">{doneCount} of 5 done</span>
            <div className="ml-auto">
              <Badge variant={doneCount >= 4 ? 'sage' : 'default'}>
                {doneCount >= 4 ? 'Almost there' : 'Getting started'}
              </Badge>
            </div>
          </CardHeader>
          <div className="px-1.5 py-1">
            {onboarding.map((o, i) => (
              <div
                key={o.title}
                className={cn(
                  'flex items-center gap-3.5 px-4 py-3.5',
                  i < onboarding.length - 1 && 'border-hairline border-b',
                )}
              >
                <span
                  className={cn(
                    'grid size-6 shrink-0 place-items-center rounded-full',
                    o.done
                      ? 'bg-sage text-white'
                      : 'border-hairline-strong border border-dashed',
                  )}
                >
                  {o.done ? (
                    <Check className="size-3.5" strokeWidth={2.5} />
                  ) : (
                    <span className="mono text-muted-foreground text-[11px]">{i + 1}</span>
                  )}
                </span>
                <div className="flex-1">
                  <div className="text-[14px] font-medium">{o.title}</div>
                  <div className="text-muted-foreground mt-0.5 text-[12.5px]">{o.sub}</div>
                </div>
                <span className="mono text-muted-foreground text-[11px]">{o.n}</span>
                {o.done ? (
                  <Badge variant="sage" className="badge-dot">
                    Done
                  </Badge>
                ) : (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={o.href}>
                      Start <ArrowRight />
                    </Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2.5">
            <CardTitle>Sender pool health</CardTitle>
            <Link href="/dashboard/accounts" className="text-clay ml-auto text-[12px]">
              Manage →
            </Link>
          </CardHeader>
          <CardContent className="p-4">
            {accounts.length === 0 ? (
              <p className="text-muted-foreground text-[13px]">No mailboxes connected yet.</p>
            ) : (
              accounts.slice(0, 6).map((a) => {
                const pct = a.dailyCap > 0 ? Math.min(100, (a.sentToday / a.dailyCap) * 100) : 0;
                const tone = statusTone(a.status);
                return (
                  <div
                    key={a.id}
                    className="border-hairline border-b border-dashed py-2.5 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn('size-1.5 rounded-full', healthDot[a.status])} />
                      <span className="mono truncate text-[12px]">{a.fromEmail}</span>
                      <span className="text-muted-foreground ml-auto text-[11px] capitalize">
                        {a.status}
                      </span>
                    </div>
                    <div className="bg-surface-2 mt-1.5 h-1 overflow-hidden rounded-full">
                      <div className={cn('h-full rounded-full', toneFill[tone])} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mono text-muted-foreground mt-1 text-[10.5px]">
                      {a.sentToday} / {a.dailyCap} today
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Replies + schedule */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-2.5">
            <CardTitle>Replies needing you</CardTitle>
            <Link href="/dashboard/inbox" className="text-clay ml-auto text-[12px]">
              Open inbox →
            </Link>
          </CardHeader>
          <div>
            {threads.length === 0 ? (
              <p className="text-muted-foreground p-[18px] text-[13px]">
                No replies yet — launch a campaign to start the conversation.
              </p>
            ) : (
              threads.map((th, i) => {
                const who = th.participants?.[0] ?? 'Unknown';
                return (
                  <Link
                    key={th._id.toString()}
                    href="/dashboard/inbox"
                    className={cn(
                      'flex items-center gap-3 px-[18px] py-3 transition-colors hover:bg-foreground/[0.015]',
                      i < threads.length - 1 && 'border-hairline border-b',
                    )}
                  >
                    <span className="bg-clay grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-medium text-white">
                      {who.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="truncate text-[13.5px] font-medium">{who}</span>
                        {th.aiIntent && (
                          <Badge variant={intentTone(th.aiIntent)} className="text-[10px] capitalize">
                            {th.aiIntent.replace(/_/g, ' ')}
                          </Badge>
                        )}
                        <span className="mono text-muted-foreground ml-auto text-[11px]">
                          {timeAgo(th.lastMessageAt)}
                        </span>
                      </div>
                      <div className="text-muted-foreground mt-0.5 truncate text-[12.5px]">
                        {th.aiSummary ?? th.subject}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </Card>

        {/* Today's schedule — representative per-account send windows */}
        <Card>
          <CardHeader className="flex-row items-center gap-2.5">
            <CardTitle>Today’s schedule</CardTitle>
            <span className="text-muted-foreground ml-auto text-[12px]">Cron · per-account caps</span>
          </CardHeader>
          <CardContent className="p-[18px]">
            <div className="dotted-grid relative min-h-[160px] rounded-md py-2">
              {(accounts.length ? accounts.slice(0, 8) : []).map((a, i) => {
                const start = 0.05 + i * 0.08;
                const end = Math.min(1, start + 0.35);
                const tone = statusTone(a.status);
                return (
                  <div key={a.id} className="relative mb-1.5 h-4">
                    <span className="mono text-muted-foreground absolute top-0.5 left-1 z-10 text-[9.5px]">
                      {a.fromEmail.split('@')[0]}
                    </span>
                    <div
                      className={cn('absolute top-0.5 h-3 rounded-sm border-l-2', toneBar[tone])}
                      style={{ left: `${start * 100}%`, width: `${(end - start) * 100}%` }}
                    />
                  </div>
                );
              })}
              {accounts.length === 0 && (
                <p className="text-muted-foreground p-3 text-[13px]">
                  Connect mailboxes to see the send schedule.
                </p>
              )}
            </div>
            <div className="mono text-muted-foreground mt-2 flex justify-between text-[10px]">
              {['08:00', '11:00', '14:00', '17:00', '20:00', '23:00'].map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
