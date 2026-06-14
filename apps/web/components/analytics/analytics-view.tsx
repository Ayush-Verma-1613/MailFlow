'use client';

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Donut } from '@/components/charts/donut';
import { Sparkline } from '@/components/charts/sparkline';
import { cn } from '@/lib/utils';
import type { AccountAnalytics, OverviewAnalytics } from '@/lib/analytics-service';

const HEALTH_VARIANT: Record<string, 'sage' | 'amber' | 'default' | 'rose'> = {
  connected: 'sage',
  degraded: 'amber',
  disconnected: 'default',
  error: 'rose',
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

// Representative reply-rate heatmap (7 days × 6 windows). Illustrative.
const HEAT = [
  [12, 28, 41, 38, 22, 9],
  [18, 34, 47, 44, 26, 11],
  [15, 31, 52, 49, 30, 13],
  [20, 38, 55, 51, 28, 12],
  [16, 33, 44, 40, 24, 10],
  [6, 12, 18, 15, 9, 4],
  [4, 8, 11, 9, 6, 3],
];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SLOTS = ['8a', '11a', '2p', '5p', '8p', '11p'];

export function AnalyticsView({
  overview,
  accounts,
}: {
  overview: OverviewAnalytics;
  accounts: AccountAnalytics[];
}) {
  const { funnel, rates, intentBreakdown, totals } = overview;

  const kpis = [
    { label: 'Sent', value: String(funnel.sent), sub: `${totals.campaigns} campaigns`, spark: [12, 18, 14, 22, 24, 30, 28, 35], color: 'rgb(var(--clay))' },
    { label: 'Open rate', value: `${rates.openRate}%`, sub: `${funnel.opened} opens`, spark: [40, 42, 41, 45, 44, 46, 47, 47], color: 'rgb(var(--clay))' },
    { label: 'Reply rate', value: `${rates.replyRate}%`, sub: `${funnel.replied} replies`, spark: [6, 7, 6.5, 7.2, 7.8, 8, 7.9, 8.1], color: 'rgb(var(--sage))' },
    { label: 'Click rate', value: `${rates.clickRate}%`, sub: `${funnel.clicked} clicks`, spark: [3, 4, 3.5, 5, 4.5, 5.5, 6, 6], color: 'rgb(var(--sage))' },
  ];

  const funnelData = [
    { stage: 'Sent', value: funnel.sent },
    { stage: 'Opened', value: funnel.opened },
    { stage: 'Clicked', value: funnel.clicked },
    { stage: 'Replied', value: funnel.replied },
    { stage: 'Bounced', value: funnel.bounced },
  ];
  const intentTotal = intentBreakdown.reduce((s, i) => s + i.count, 0);

  return (
    <div className="space-y-6">
      {/* KPI cards */}
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Engagement funnel</CardTitle>
          </CardHeader>
          <CardContent className="p-[18px]">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={funnelData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <XAxis
                  dataKey="stage"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'rgb(var(--muted-foreground))', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tick={{ fill: 'rgb(var(--muted-foreground))', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                />
                <Tooltip
                  cursor={{ fill: 'rgb(var(--surface-2))' }}
                  contentStyle={{
                    background: 'rgb(var(--ink))',
                    color: 'rgb(var(--canvas))',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: 'rgb(var(--canvas))' }}
                />
                <Bar dataKey="value" fill="rgb(var(--clay))" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Intent donut */}
        <Card>
          <CardHeader className="flex-row items-center gap-2.5">
            <CardTitle>AI intent breakdown</CardTitle>
            <span className="text-muted-foreground ml-auto text-[12px]">{intentTotal} replies</span>
          </CardHeader>
          <CardContent className="flex items-center gap-6 p-[18px]">
            {intentTotal === 0 ? (
              <p className="text-muted-foreground flex h-[160px] w-full items-center justify-center text-sm">
                No analyzed replies yet.
              </p>
            ) : (
              <>
                <Donut
                  total={intentTotal}
                  caption="REPLIES"
                  segments={intentBreakdown.map((i) => ({
                    label: i.intent,
                    value: i.count,
                    color: intentColor[i.intent] ?? 'rgb(var(--muted-2))',
                  }))}
                />
                <div className="flex-1">
                  {intentBreakdown.map((i) => (
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Send-time heatmap (representative) */}
        <Card>
          <CardHeader className="flex-row items-center gap-2.5">
            <CardTitle>Best send times</CardTitle>
            <span className="mono text-muted-foreground ml-auto text-[10px]">REPLY RATE · SAMPLE</span>
          </CardHeader>
          <CardContent className="p-[18px]">
            <div className="flex gap-2">
              <div className="mono text-muted-foreground flex flex-col justify-around pt-5 text-[9.5px]">
                {DAYS.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="flex-1">
                <div className="mono text-muted-foreground mb-1 flex justify-between text-[9.5px]">
                  {SLOTS.map((s) => (
                    <span key={s}>{s}</span>
                  ))}
                </div>
                <div className="flex flex-col gap-1">
                  {HEAT.map((row, r) => (
                    <div key={r} className="flex gap-1">
                      {row.map((v, c) => (
                        <div
                          key={c}
                          className="grid h-6 flex-1 place-items-center rounded-[3px]"
                          style={{ background: `rgb(var(--clay) / ${0.12 + (v / 55) * 0.8})` }}
                          title={`${v}%`}
                        >
                          <span
                            className={cn(
                              'mono text-[9px]',
                              v > 35 ? 'text-white' : 'text-muted-foreground',
                            )}
                          >
                            {v}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sender health */}
        <Card>
          <CardHeader>
            <CardTitle>Sender health</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pt-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-[18px]">Mailbox</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Today</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                      No mailboxes connected.
                    </TableCell>
                  </TableRow>
                ) : (
                  accounts.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="pl-[18px]">
                        <div className="text-[13px] font-medium">{a.displayName}</div>
                        <div className="mono text-muted-foreground text-[11px]">{a.fromEmail}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={HEALTH_VARIANT[a.status] ?? 'default'} className="badge-dot capitalize">
                          {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="mono text-right text-[12px]">
                        {a.sentToday}/{a.dailyCap}
                      </TableCell>
                      <TableCell className="mono text-right text-[12px]">{a.totalSent}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="text-muted-foreground mono flex flex-wrap gap-x-6 gap-y-1 text-[11px]">
        <span>{totals.campaigns} campaigns</span>
        <span>{totals.contacts} contacts</span>
        <span>{totals.accounts} mailboxes</span>
        <span>{funnel.unsubscribed} unsubscribed</span>
      </div>
    </div>
  );
}
