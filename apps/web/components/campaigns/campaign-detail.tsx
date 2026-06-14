'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Pause, Play } from 'lucide-react';
import { toast } from 'sonner';
import type { ICampaignStats } from '@mailflow/db';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiRequest } from '@/lib/client-api';

interface CampaignDetailProps {
  id: string;
  name: string;
  initialStatus: string;
  initialStats: ICampaignStats;
}

interface RecipientRow {
  id: string;
  email: string;
  status: string;
  sentAt?: string;
  lastError?: string;
}

const FUNNEL: Array<{ key: keyof ICampaignStats; label: string }> = [
  { key: 'queued', label: 'Queued' },
  { key: 'sent', label: 'Sent' },
  { key: 'opened', label: 'Opened' },
  { key: 'clicked', label: 'Clicked' },
  { key: 'replied', label: 'Replied' },
  { key: 'bounced', label: 'Bounced' },
  { key: 'unsubscribed', label: 'Unsubscribed' },
];

const ACTIVE = new Set(['scheduled', 'running']);

export function CampaignDetail({
  id,
  name,
  initialStatus,
  initialStats,
}: CampaignDetailProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [stats, setStats] = useState(initialStats);
  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [working, setWorking] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([
        apiRequest<{ status: string; stats: ICampaignStats }>(`/api/campaigns/${id}/stats`),
        apiRequest<{ items: RecipientRow[] }>(`/api/campaigns/${id}/recipients?pageSize=50`),
      ]);
      setStatus(s.status);
      setStats(s.stats);
      setRecipients(r.items);
    } catch {
      // transient — keep last good state
    }
  }, [id]);

  // Poll while the campaign is actively sending.
  useEffect(() => {
    refresh();
    if (!ACTIVE.has(status)) return;
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [refresh, status]);

  async function act(action: 'launch' | 'pause') {
    setWorking(true);
    try {
      await apiRequest(`/api/campaigns/${id}/${action}`, { method: 'POST' });
      toast.success(action === 'launch' ? 'Campaign launched' : 'Campaign paused');
      await refresh();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action failed');
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
          <Badge className="capitalize">{status}</Badge>
        </div>
        <div className="flex gap-2">
          {ACTIVE.has(status) ? (
            <Button variant="outline" onClick={() => act('pause')} disabled={working}>
              {working ? <Loader2 className="size-4 animate-spin" /> : <Pause className="size-4" />}
              Pause
            </Button>
          ) : (
            status !== 'completed' && (
              <Button onClick={() => act('launch')} disabled={working}>
                {working ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                {status === 'paused' ? 'Resume' : 'Launch'}
              </Button>
            )
          )}
        </div>
      </div>

      {/* Funnel */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {FUNNEL.map((m) => (
          <Card key={m.key}>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-semibold">{stats[m.key]}</p>
              <p className="text-muted-foreground text-xs">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recipients */}
      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recipient</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead>Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recipients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                  No recipients yet.
                </TableCell>
              </TableRow>
            ) : (
              recipients.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {r.sentAt ? new Date(r.sentAt).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell className="text-destructive text-xs">
                    {r.lastError ?? ''}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
