'use client';

import { useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  AI_INTENTS,
  WORKFLOW_ACTION_TYPES,
  WORKFLOW_TRIGGER_TYPES,
} from '@mailflow/shared';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiRequest } from '@/lib/client-api';

interface Option {
  id: string;
  name: string;
}

type StepDraft =
  | { type: 'condition'; field: string; op: string; value: string }
  | { type: 'action'; action: string; param: string };

const CONDITION_FIELDS = ['intent', 'confidence', 'contactTags', 'contactEmail'];
const CONDITION_OPS = ['eq', 'neq', 'gt', 'lt', 'contains', 'in'];

export function WorkflowBuilderDialog({
  open,
  onOpenChange,
  onSaved,
  templates,
  lists,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
  templates: Option[];
  lists: Option[];
}) {
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState('reply_received');
  const [intent, setIntent] = useState('');
  const [days, setDays] = useState('3');
  const [steps, setSteps] = useState<StepDraft[]>([]);
  const [saving, setSaving] = useState(false);

  function addCondition() {
    setSteps((s) => [...s, { type: 'condition', field: 'intent', op: 'eq', value: '' }]);
  }
  function addAction() {
    setSteps((s) => [...s, { type: 'action', action: 'send_template', param: '' }]);
  }
  function update(i: number, patch: Partial<StepDraft>) {
    setSteps((s) => s.map((st, idx) => (idx === i ? ({ ...st, ...patch } as StepDraft) : st)));
  }
  function remove(i: number) {
    setSteps((s) => s.filter((_, idx) => idx !== i));
  }

  function buildPayload() {
    const params: Record<string, unknown> = {};
    if ((triggerType === 'reply_received' || triggerType === 'intent_detected') && intent) {
      params.intent = intent;
    }
    if (triggerType === 'no_reply_after') params.days = Number(days);

    const builtSteps = steps.map((st) => {
      if (st.type === 'condition') {
        let value: unknown = st.value;
        if (st.field === 'confidence') value = Number(st.value);
        return { type: 'condition', config: { field: st.field, op: st.op, value } };
      }
      const p: Record<string, unknown> = {};
      if (st.action === 'send_template') p.templateId = st.param;
      else if (st.action === 'change_list') p.listId = st.param;
      else if (st.action === 'add_tag') p.tag = st.param;
      else if (st.action === 'notify') p.message = st.param;
      else if (st.action === 'grant_reward') p.rewardId = st.param;
      return { type: 'action', config: { action: st.action, params: p } };
    });

    return { name, enabled: false, trigger: { type: triggerType, params }, steps: builtSteps };
  }

  async function save() {
    if (!name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      await apiRequest('/api/workflows', {
        method: 'POST',
        body: JSON.stringify(buildPayload()),
      });
      toast.success('Workflow created (disabled — enable it when ready)');
      onOpenChange(false);
      setName('');
      setSteps([]);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const showIntent = triggerType === 'reply_received' || triggerType === 'intent_detected';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New workflow</DialogTitle>
          <DialogDescription>
            When the trigger fires, conditions are checked top-down (a failing condition
            stops the run); actions run in order.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="wf-name">Name</Label>
            <Input
              id="wf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Auto follow-up on interest"
            />
          </div>

          {/* Trigger */}
          <div className="rounded-lg border p-3">
            <p className="mb-2 text-sm font-medium">When…</p>
            <div className="flex flex-wrap gap-2">
              <Select value={triggerType} onValueChange={setTriggerType}>
                <SelectTrigger className="w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORKFLOW_TRIGGER_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showIntent && (
                <Select value={intent} onValueChange={setIntent}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="any intent" />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_INTENTS.map((i) => (
                      <SelectItem key={i} value={i} className="capitalize">
                        {i.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {triggerType === 'no_reply_after' && (
                <Input
                  type="number"
                  className="w-28"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  placeholder="days"
                />
              )}
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Then…</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={addCondition}>
                  <Plus className="size-3.5" /> Condition
                </Button>
                <Button variant="outline" size="sm" onClick={addAction}>
                  <Plus className="size-3.5" /> Action
                </Button>
              </div>
            </div>

            {steps.length === 0 && (
              <p className="text-muted-foreground rounded-md border border-dashed p-4 text-center text-sm">
                Add a condition or action.
              </p>
            )}

            {steps.map((st, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md border p-2">
                {st.type === 'condition' ? (
                  <>
                    <span className="text-muted-foreground w-16 text-xs">IF</span>
                    <Select value={st.field} onValueChange={(v) => update(i, { field: v })}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CONDITION_FIELDS.map((f) => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={st.op} onValueChange={(v) => update(i, { op: v })}>
                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CONDITION_OPS.map((o) => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {st.field === 'intent' ? (
                      <Select value={st.value} onValueChange={(v) => update(i, { value: v })}>
                        <SelectTrigger className="flex-1"><SelectValue placeholder="value" /></SelectTrigger>
                        <SelectContent>
                          {AI_INTENTS.map((iv) => (
                            <SelectItem key={iv} value={iv}>{iv}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        className="flex-1"
                        placeholder="value"
                        value={st.value}
                        onChange={(e) => update(i, { value: e.target.value })}
                      />
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground w-16 text-xs">DO</span>
                    <Select value={st.action} onValueChange={(v) => update(i, { action: v, param: '' })}>
                      <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {WORKFLOW_ACTION_TYPES.map((a) => (
                          <SelectItem key={a} value={a} className="capitalize">
                            {a.replace(/_/g, ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <ActionParam step={st} templates={templates} lists={lists} onChange={(v) => update(i, { param: v })} />
                  </>
                )}
                <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => remove(i)}>
                  <X className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Create workflow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ActionParam({
  step,
  templates,
  lists,
  onChange,
}: {
  step: Extract<StepDraft, { type: 'action' }>;
  templates: Option[];
  lists: Option[];
  onChange: (v: string) => void;
}) {
  if (step.action === 'pause_campaign') {
    return <span className="text-muted-foreground flex-1 text-xs">uses event campaign</span>;
  }
  if (step.action === 'send_template') {
    return (
      <Select value={step.param} onValueChange={onChange}>
        <SelectTrigger className="flex-1"><SelectValue placeholder="template" /></SelectTrigger>
        <SelectContent>
          {templates.map((t) => (
            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (step.action === 'change_list') {
    return (
      <Select value={step.param} onValueChange={onChange}>
        <SelectTrigger className="flex-1"><SelectValue placeholder="list" /></SelectTrigger>
        <SelectContent>
          {lists.map((l) => (
            <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  const placeholder =
    step.action === 'add_tag' ? 'tag' : step.action === 'grant_reward' ? 'reward id' : 'message';
  return (
    <Input
      className="flex-1"
      placeholder={placeholder}
      value={step.param}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
