'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Gift, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/client-api';

export interface RewardItem {
  id: string;
  name: string;
  url: string;
  hasSecret: boolean;
  grantCount: number;
}

interface Grant {
  email: string;
  grantedAt: string;
  ref?: string;
}

export function RewardsView({ rewards }: { rewards: RewardItem[] }) {
  const router = useRouter();
  const [grantsFor, setGrantsFor] = useState<RewardItem | null>(null);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loadingGrants, setLoadingGrants] = useState(false);

  async function openGrants(reward: RewardItem) {
    setGrantsFor(reward);
    setLoadingGrants(true);
    try {
      const data = await apiRequest<{ grants: Grant[] }>(`/api/rewards/${reward.id}/grants`);
      setGrants(data.grants);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load grants');
    } finally {
      setLoadingGrants(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this reward?')) return;
    try {
      await apiRequest(`/api/rewards/${id}`, { method: 'DELETE' });
      toast.success('Reward deleted');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CreateRewardDialog onCreated={() => router.refresh()} />
      </div>

      {rewards.length === 0 ? (
        <div className="text-muted-foreground flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-xl border border-dashed text-center">
          <Gift className="size-8" />
          <div>
            <p className="text-foreground font-medium">No rewards yet</p>
            <p className="text-sm">
              Define a grant endpoint, then trigger it from a workflow&apos;s “grant
              reward” action.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rewards.map((r) => (
            <Card key={r.id} className="gap-3">
              <CardHeader className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-medium">{r.name}</p>
                  {r.hasSecret && <Badge variant="secondary">signed</Badge>}
                </div>
                <p className="text-muted-foreground truncate text-xs">{r.url}</p>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => openGrants(r)}>
                  {r.grantCount} grant{r.grantCount === 1 ? '' : 's'}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive size-8"
                  onClick={() => remove(r.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={Boolean(grantsFor)} onOpenChange={(o) => !o && setGrantsFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grants — {grantsFor?.name}</DialogTitle>
            <DialogDescription>Contacts who received this reward.</DialogDescription>
          </DialogHeader>
          {loadingGrants ? (
            <Loader2 className="mx-auto size-5 animate-spin" />
          ) : grants.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">No grants yet.</p>
          ) : (
            <ul className="max-h-72 space-y-1.5 overflow-y-auto">
              {grants.map((g, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span className="truncate">{g.email}</span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(g.grantedAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateRewardDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [payloadTemplate, setPayloadTemplate] = useState(
    '{\n  "email": "{{email}}",\n  "plan": "lifetime"\n}',
  );
  const [secret, setSecret] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim() || !url.trim()) return toast.error('Name and URL are required');
    setSaving(true);
    try {
      await apiRequest('/api/rewards', {
        method: 'POST',
        body: JSON.stringify({
          name,
          grantAction: {
            type: 'webhook',
            url,
            payloadTemplate: payloadTemplate || undefined,
            secret: secret || undefined,
          },
        }),
      });
      toast.success('Reward created');
      setOpen(false);
      setName('');
      setUrl('');
      setSecret('');
      onCreated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" /> New reward
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New reward</DialogTitle>
          <DialogDescription>
            When granted, MailFlow POSTs the payload to your endpoint (HMAC-signed via
            the <code className="text-xs">X-MailFlow-Signature</code> header when a secret
            is set).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="r-name">Name</Label>
            <Input
              id="r-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Lifetime premium"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-url">Grant URL (webhook)</Label>
            <Input
              id="r-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-app.com/api/grant-premium"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-payload">Payload template</Label>
            <Textarea
              id="r-payload"
              className="min-h-28 font-mono text-xs"
              value={payloadTemplate}
              onChange={(e) => setPayloadTemplate(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Merge tags: {'{{email}}'}, {'{{firstName}}'}, {'{{rewardName}}'}.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-secret">HMAC secret (optional)</Label>
            <Input
              id="r-secret"
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Create reward
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
