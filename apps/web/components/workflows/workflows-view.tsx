'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GitBranch, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { apiRequest } from '@/lib/client-api';
import { WorkflowBuilderDialog } from './workflow-builder-dialog';

interface Option {
  id: string;
  name: string;
}
export interface WorkflowItem {
  id: string;
  name: string;
  enabled: boolean;
  trigger: { type: string };
  stepCount: number;
}

export function WorkflowsView({
  workflows,
  templates,
  lists,
}: {
  workflows: WorkflowItem[];
  templates: Option[];
  lists: Option[];
}) {
  const router = useRouter();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(w: WorkflowItem) {
    setBusy(w.id);
    try {
      await apiRequest(`/api/workflows/${w.id}/enable`, {
        method: 'POST',
        body: JSON.stringify({ enabled: !w.enabled }),
      });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed');
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this workflow?')) return;
    try {
      await apiRequest(`/api/workflows/${id}`, { method: 'DELETE' });
      toast.success('Workflow deleted');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setBuilderOpen(true)}>
          <Plus className="size-4" /> New workflow
        </Button>
      </div>

      {workflows.length === 0 ? (
        <div className="text-muted-foreground flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-xl border border-dashed text-center">
          <GitBranch className="size-8" />
          <div>
            <p className="text-foreground font-medium">No workflows yet</p>
            <p className="text-sm">Automate follow-ups from reply signals.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workflows.map((w) => (
            <Card key={w.id} className="gap-3">
              <CardHeader className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-medium">{w.name}</p>
                  <Badge variant={w.enabled ? 'success' : 'secondary'}>
                    {w.enabled ? 'On' : 'Off'}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-xs capitalize">
                  {w.trigger.type.replace(/_/g, ' ')} · {w.stepCount} step
                  {w.stepCount === 1 ? '' : 's'}
                </p>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <Button
                  variant={w.enabled ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => toggle(w)}
                  disabled={busy === w.id}
                >
                  {w.enabled ? 'Disable' : 'Enable'}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive size-8"
                  onClick={() => remove(w.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <WorkflowBuilderDialog
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        onSaved={() => router.refresh()}
        templates={templates}
        lists={lists}
      />
    </div>
  );
}
