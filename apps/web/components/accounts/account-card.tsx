'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Loader2, Mail, MoreVertical, Send, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AccountHealthStatus } from '@mailflow/shared';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiRequest } from '@/lib/client-api';
import { cn } from '@/lib/utils';
import { TestSendDialog } from './test-send-dialog';

export interface AccountCardData {
  id: string;
  provider: string;
  displayName: string;
  fromEmail: string;
  fromName: string;
  limits: { dailyCap: number; hourlyCap: number };
  health: { status: AccountHealthStatus; sentToday: number; lastError?: string };
  dkimRecord?: { host: string; value: string } | null;
}

const HEALTH_BADGE: Record<
  AccountHealthStatus,
  { label: string; variant: 'success' | 'warning' | 'secondary' | 'destructive' }
> = {
  connected: { label: 'Connected', variant: 'success' },
  degraded: { label: 'Degraded', variant: 'warning' },
  disconnected: { label: 'Disconnected', variant: 'secondary' },
  error: { label: 'Error', variant: 'destructive' },
};

export function AccountCard({ account }: { account: AccountCardData }) {
  const router = useRouter();
  const [testOpen, setTestOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dkim, setDkim] = useState(account.dkimRecord ?? null);
  const [dkimBusy, setDkimBusy] = useState(false);

  async function setupDkim() {
    setDkimBusy(true);
    try {
      const res = await apiRequest<{ record: { host: string; value: string } }>(
        `/api/email-accounts/${account.id}/dkim`,
        { method: 'POST' },
      );
      setDkim(res.record);
      toast.success('DKIM key generated — publish the DNS record below');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to set up DKIM');
    } finally {
      setDkimBusy(false);
    }
  }

  const badge = HEALTH_BADGE[account.health.status];
  const used = account.health.sentToday;
  const cap = account.limits.dailyCap;
  const pct = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0;

  async function disconnect() {
    if (!confirm(`Disconnect ${account.fromEmail}?`)) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/email-accounts/${account.id}`, { method: 'DELETE' });
      toast.success('Mailbox disconnected');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to disconnect');
      setDeleting(false);
    }
  }

  return (
    <Card className={cn('gap-4', deleting && 'pointer-events-none opacity-50')}>
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-md">
            <Mail className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{account.displayName}</p>
            <p className="text-muted-foreground truncate text-xs">{account.fromEmail}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground rounded p-1 outline-none">
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTestOpen(true)}>
              <Send className="size-4" />
              Send test
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={disconnect}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="size-4" />
              Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant={badge.variant}>{badge.label}</Badge>
          <span className="text-muted-foreground text-xs uppercase">{account.provider}</span>
        </div>

        <div className="space-y-1.5">
          <div className="text-muted-foreground flex justify-between text-xs">
            <span>Daily sends</span>
            <span>
              {used} / {cap}
            </span>
          </div>
          <div className="bg-muted h-1.5 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {account.health.status === 'error' && account.health.lastError && (
          <p className="text-destructive text-xs">{account.health.lastError}</p>
        )}

        {account.provider === 'smtp' && (
          <div className="border-t pt-3">
            {dkim ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <ShieldCheck className="text-primary size-3.5" /> DKIM — publish this TXT record
                </div>
                <DkimField label="Host" value={dkim.host} />
                <DkimField label="Value" value={dkim.value} mono />
                <button
                  onClick={setupDkim}
                  disabled={dkimBusy}
                  className="text-muted-foreground hover:text-foreground text-xs underline"
                >
                  Rotate key
                </button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={setupDkim} disabled={dkimBusy}>
                {dkimBusy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ShieldCheck className="size-4" />
                )}
                Set up DKIM
              </Button>
            )}
          </div>
        )}
      </CardContent>

      <TestSendDialog
        accountId={account.id}
        fromEmail={account.fromEmail}
        open={testOpen}
        onOpenChange={setTestOpen}
      />
    </Card>
  );
}

function DkimField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-muted/50 flex items-start gap-2 rounded-md border p-2">
      <span className="text-muted-foreground w-10 shrink-0 pt-0.5 text-xs">{label}</span>
      <code className={cn('flex-1 break-all text-xs', mono && 'font-mono')}>{value}</code>
      <button
        className="text-muted-foreground hover:text-foreground shrink-0"
        onClick={() => {
          void navigator.clipboard.writeText(value);
          toast.success('Copied');
        }}
        aria-label={`Copy ${label}`}
      >
        <Copy className="size-3" />
      </button>
    </div>
  );
}
