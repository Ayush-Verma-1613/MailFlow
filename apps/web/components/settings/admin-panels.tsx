'use client';

import { useCallback, useEffect, useState } from 'react';
import { Copy, KeyRound, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/client-api';

interface ApiKeyRow {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt?: string;
}
interface AuditRow {
  id: string;
  action: string;
  at: string;
}
interface QueueRow {
  name: string;
  counts: { waiting: number; active: number; completed: number; failed: number; delayed: number };
}

export function AdminPanels() {
  return (
    <div className="space-y-6">
      <ApiKeysCard />
      <QueueHealthCard />
      <AuditLogCard />
    </div>
  );
}

function ApiKeysCard() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState('*');
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ keys: ApiKeyRow[] }>('/api/api-keys');
      setKeys(data.keys);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load keys');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    if (!name.trim()) return toast.error('Name required');
    setCreating(true);
    try {
      const res = await apiRequest<{ key: string }>('/api/api-keys', {
        method: 'POST',
        body: JSON.stringify({
          name,
          scopes: scopes.split(',').map((s) => s.trim()).filter(Boolean),
        }),
      });
      setNewKey(res.key);
      setName('');
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create key');
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm('Revoke this key? Apps using it will stop working.')) return;
    try {
      await apiRequest(`/api/api-keys/${id}`, { method: 'DELETE' });
      toast.success('Key revoked');
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to revoke');
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">API keys</CardTitle>
          <CardDescription>Authenticate requests to the public /api/v1 API.</CardDescription>
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setNewKey(null);
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" /> New key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
            </DialogHeader>
            {newKey ? (
              <div className="space-y-3">
                <p className="text-sm">Copy your key now — it won&apos;t be shown again.</p>
                <div className="bg-muted flex items-center gap-2 rounded-md border p-2 font-mono text-xs">
                  <span className="flex-1 break-all">{newKey}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 shrink-0"
                    onClick={() => {
                      void navigator.clipboard.writeText(newKey);
                      toast.success('Copied');
                    }}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="k-name">Name</Label>
                  <Input id="k-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Zapier integration" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="k-scopes">Scopes (comma-separated)</Label>
                  <Input id="k-scopes" value={scopes} onChange={(e) => setScopes(e.target.value)} placeholder="contacts:read, contacts:write" />
                  <p className="text-muted-foreground text-xs">Use * for full access.</p>
                </div>
              </div>
            )}
            <DialogFooter>
              {newKey ? (
                <Button onClick={() => setOpen(false)}>Done</Button>
              ) : (
                <Button onClick={create} disabled={creating}>
                  {creating && <Loader2 className="size-4 animate-spin" />}
                  Create
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="text-muted-foreground size-5 animate-spin" />
        ) : keys.length === 0 ? (
          <p className="text-muted-foreground text-sm">No API keys yet.</p>
        ) : (
          <ul className="divide-y">
            {keys.map((k) => (
              <li key={k.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <KeyRound className="text-muted-foreground size-3.5" />
                    <span className="truncate text-sm font-medium">{k.name}</span>
                    <code className="text-muted-foreground text-xs">mf_{k.prefix}…</code>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {k.scopes.map((s) => (
                      <Badge key={s} variant="secondary" className="text-[10px]">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive size-8 shrink-0"
                  onClick={() => revoke(k.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function QueueHealthCard() {
  const [queues, setQueues] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<{ queues: QueueRow[] }>('/api/admin/queues')
      .then((d) => setQueues(d.queues))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Queue health</CardTitle>
        <CardDescription>BullMQ job counts across the worker fleet.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="text-muted-foreground size-5 animate-spin" />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {queues.map((q) => (
              <div key={q.name} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span className="font-medium">{q.name}</span>
                <span className="text-muted-foreground text-xs">
                  {q.counts.active} active · {q.counts.waiting + q.counts.delayed} pending ·{' '}
                  {q.counts.failed} failed
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AuditLogCard() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<{ items: AuditRow[] }>('/api/audit?pageSize=15')
      .then((d) => setRows(d.items))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Audit log</CardTitle>
        <CardDescription>Recent privileged actions in this workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="text-muted-foreground size-5 animate-spin" />
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">No activity yet.</p>
        ) : (
          <ul className="divide-y text-sm">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2">
                <code className="text-xs">{r.action}</code>
                <span className="text-muted-foreground text-xs">
                  {new Date(r.at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
