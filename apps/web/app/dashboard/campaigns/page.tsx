import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus, Send } from 'lucide-react';
import { connectToDatabase, Campaign } from '@mailflow/db';

import { auth } from '@/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkline } from '@/components/charts/sparkline';
import { Donut } from '@/components/charts/donut';
import { getOverview } from '@/lib/analytics-service';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Campaigns' };

type Tone = 'sage' | 'amber' | 'rose' | 'muted';
const STATUS_TONE: Record<string, Tone> = {
  draft: 'muted',
  scheduled: 'amber',
  running: 'sage',
  paused: 'amber',
  completed: 'sage',
};
const STATUS_VARIANT: Record<string, 'sage' | 'amber' | 'rose' | 'default'> = {
  draft: 'default',
  scheduled: 'amber',
  running: 'sage',
  paused: 'amber',
  completed: 'sage',
};
const dotTone: Record<Tone, string> = {
  sage: 'bg-sage',
  amber: 'bg-amber',
  rose: 'bg-rose',
  muted: 'bg-muted-2',
};
const barTone: Record<Tone, string> = {
  sage: 'bg-sage',
  amber: 'bg-amber',
  rose: 'bg-rose',
  muted: 'bg-muted-2',
};
const sparkColor: Record<Tone, string> = {
  sage: 'rgb(var(--sage))',
  amber: 'rgb(var(--amber))',
  rose: 'rgb(var(--rose))',
  muted: 'rgb(var(--muted-2))',
};

const intentColor: Record<string, string> = {
  interested: 'rgb(var(--sage))',
  question: 'rgb(var(--clay))',
  maybe_later: 'rgb(var(--amber))',
  out_of_office: 'rgb(var(--amber))',
  unsubscribe: 'rgb(var(--rose))',
  bounce: 'rgb(var(--rose))',
  not_interested: 'rgb(var(--rose))',
  spam: 'rgb(var(--rose))',
  other: 'rgb(var(--muted-2))',
};

function rate(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 1000) / 10}%` : '—';
}

export default async function CampaignsPage() {
  const session = await auth();
  if (!session?.user) redirect('/signin');

  await connectToDatabase();
  const [docs, overview] = await Promise.all([
    Campaign.find({ orgId: session.user.orgId }).sort({ createdAt: -1 }).lean(),
    getOverview(session.user.orgId),
  ]);

  const counts = docs.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});
  const summary = ['running', 'paused', 'draft']
    .filter((s) => counts[s])
    .map((s) => `${counts[s]} ${s}`)
    .join(' · ');

  const top = [...docs].sort((a, b) => b.stats.sent - a.stats.sent)[0];
  const intents = overview.intentBreakdown;
  const intentTotal = intents.reduce((s, i) => s + i.count, 0);

  return (
    <div>
      <PageHeader title="Campaigns" description={`Send, sequence, and track outreach.${summary ? ` ${summary}.` : ''}`}>
        <Button variant="clay" asChild>
          <Link href="/dashboard/campaigns/new">
            <Plus /> New campaign
          </Link>
        </Button>
      </PageHeader>

      {docs.length === 0 ? (
        <div className="text-muted-foreground border-hairline flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-xl border border-dashed text-center">
          <Send className="size-8" />
          <div>
            <p className="text-foreground font-medium">No campaigns yet</p>
            <p className="text-sm">Create one to start sending.</p>
          </div>
        </div>
      ) : (
        <>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-7 pl-[18px]" />
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                  <TableHead className="text-right">Reply</TableHead>
                  <TableHead>Pace</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((c) => {
                  const tone = STATUS_TONE[c.status] ?? 'muted';
                  const total = Math.max(c.stats.queued, c.stats.sent, 1);
                  const replyRate = rate(c.stats.replied, c.stats.sent);
                  const hot = c.stats.sent > 0 && c.stats.replied / c.stats.sent > 0.1;
                  return (
                    <TableRow key={c._id.toString()}>
                      <TableCell className="pl-[18px]">
                        <span className={cn('inline-block size-1.5 rounded-full', dotTone[tone])} />
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/dashboard/campaigns/${c._id.toString()}`}
                          className="text-[13.5px] font-medium hover:underline"
                        >
                          {c.name}
                        </Link>
                        <div className="mono text-muted-foreground mt-0.5 text-[10.5px] capitalize">
                          {c.rotation.replace('-', ' ')} · {c.listIds.length} list
                          {c.listIds.length === 1 ? '' : 's'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[c.status] ?? 'default'} className="badge-dot capitalize">
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="mono text-[12px]">
                          {c.stats.sent}
                          <span className="text-muted-foreground"> / {total}</span>
                        </div>
                        <div className="bg-surface-2 mt-1 h-[3px] overflow-hidden rounded-full">
                          <div
                            className={cn('h-full rounded-full', barTone[tone])}
                            style={{ width: `${Math.min(100, (c.stats.sent / total) * 100)}%` }}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="mono text-right text-[12px]">
                        {rate(c.stats.opened, c.stats.sent)}
                      </TableCell>
                      <TableCell className={cn('mono text-right text-[12px]', hot && 'text-clay')}>
                        {replyRate}
                      </TableCell>
                      <TableCell>
                        <Sparkline
                          data={
                            c.stats.sent > 0
                              ? [2, 3, 3, 5, 6, 7, 8, 9]
                              : [0, 0, 0, 0, 0, 0, 0, 0]
                          }
                          color={sparkColor[tone]}
                          width={70}
                          fill={tone === 'sage'}
                        />
                      </TableCell>
                      <TableCell className="mono text-muted-foreground text-right text-[11.5px]">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {/* Funnel + intent donut */}
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
            {top && (
              <Card>
                <CardHeader className="flex-row items-center gap-2.5">
                  <CardTitle className="truncate">{top.name}</CardTitle>
                  <span className="text-muted-foreground ml-auto text-[12px]">Funnel</span>
                </CardHeader>
                <CardContent className="p-[18px]">
                  {(
                    [
                      ['Sent', top.stats.sent, 'rgb(var(--ink-2))'],
                      ['Delivered', Math.max(0, top.stats.sent - top.stats.bounced), 'rgb(var(--ink-2))'],
                      ['Opened', top.stats.opened, 'rgb(var(--clay))'],
                      ['Clicked', top.stats.clicked, 'rgb(var(--clay))'],
                      ['Replied', top.stats.replied, 'rgb(var(--sage))'],
                      ['Bounced', top.stats.bounced, 'rgb(var(--rose))'],
                      ['Unsubscribed', top.stats.unsubscribed, 'rgb(var(--rose))'],
                    ] as Array<[string, number, string]>
                  ).map(([label, n, color]) => {
                    const pct = top.stats.sent > 0 ? (n / top.stats.sent) * 100 : 0;
                    return (
                      <div key={label} className="border-hairline border-b border-dashed py-2.5 last:border-0">
                        <div className="flex items-baseline gap-3">
                          <span className="w-[90px] text-[13px]">{label}</span>
                          <div className="bg-surface-2 relative h-4 flex-1 overflow-hidden rounded-[3px]">
                            <div
                              className="absolute inset-y-0 left-0"
                              style={{ width: `${Math.min(100, pct)}%`, background: color, opacity: 0.7 }}
                            />
                          </div>
                          <span className="mono w-12 text-right text-[12px]">{n}</span>
                          <span className="mono text-muted-foreground w-12 text-right text-[12px]">
                            {Math.round(pct)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex-row items-center gap-2.5">
                <CardTitle>AI intent breakdown</CardTitle>
                <span className="text-muted-foreground ml-auto text-[12px]">
                  From {intentTotal} replies
                </span>
              </CardHeader>
              <CardContent className="flex items-center gap-6 p-[18px]">
                {intentTotal === 0 ? (
                  <p className="text-muted-foreground text-[13px]">No analyzed replies yet.</p>
                ) : (
                  <>
                    <Donut
                      total={intentTotal}
                      caption="REPLIES"
                      segments={intents.map((i) => ({
                        label: i.intent,
                        value: i.count,
                        color: intentColor[i.intent] ?? 'rgb(var(--muted-2))',
                      }))}
                    />
                    <div className="flex-1">
                      {intents.map((i) => (
                        <div key={i.intent} className="flex items-center gap-2.5 py-1">
                          <span
                            className="size-2 rounded-[2px]"
                            style={{ background: intentColor[i.intent] ?? 'rgb(var(--muted-2))' }}
                          />
                          <span className="text-[13px] capitalize">{i.intent.replace(/_/g, ' ')}</span>
                          <span className="mono text-muted-foreground ml-auto text-[12px]">{i.count}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
