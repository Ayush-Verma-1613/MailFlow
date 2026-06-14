'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ROTATION_STRATEGIES, type RotationStrategy } from '@mailflow/shared';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { cn } from '@/lib/utils';

interface Option {
  id: string;
  name: string;
  meta?: string;
}

interface WizardProps {
  lists: Option[];
  senders: Option[];
  templates: Option[];
}

const STEPS = ['Name', 'Lists', 'Senders', 'Template', 'Schedule'] as const;

export function CampaignWizard({ lists, senders, templates }: WizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [listIds, setListIds] = useState<string[]>([]);
  const [senderPoolIds, setSenderPoolIds] = useState<string[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [rotation, setRotation] = useState<RotationStrategy>('round-robin');
  const [startAt, setStartAt] = useState('');

  function toggle(arr: string[], set: (v: string[]) => void, id: string) {
    set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  }

  const canNext =
    (step === 0 && name.trim().length > 0) ||
    (step === 1 && listIds.length > 0) ||
    (step === 2 && senderPoolIds.length > 0) ||
    (step === 3 && templateId !== '') ||
    step === 4;

  async function create(launch: boolean) {
    setSubmitting(true);
    try {
      const payload = {
        name,
        listIds,
        senderPoolIds,
        templateId,
        rotation,
        schedule: {
          ...(startAt ? { startAt: new Date(startAt).toISOString() } : {}),
          sendWindow: { tz: 'UTC', hours: [0, 24] as [number, number] },
          perRecipientCap: 1,
        },
      };
      const { id } = await apiRequest<{ id: string }>('/api/campaigns', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (launch) {
        await apiRequest(`/api/campaigns/${id}/launch`, { method: 'POST' });
        toast.success('Campaign launched');
      } else {
        toast.success('Campaign saved as draft');
      }
      router.push(`/dashboard/campaigns/${id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create campaign');
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Stepper */}
      <ol className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium',
                i < step && 'bg-primary text-primary-foreground border-primary',
                i === step && 'border-primary text-primary',
                i > step && 'text-muted-foreground',
              )}
            >
              {i < step ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                'hidden text-sm sm:inline',
                i === step ? 'font-medium' : 'text-muted-foreground',
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="bg-border h-px flex-1" />}
          </li>
        ))}
      </ol>

      <Card>
        <CardContent className="pt-6">
          {step === 0 && (
            <div className="space-y-2">
              <Label htmlFor="c-name">Campaign name</Label>
              <Input
                id="c-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Q2 cold outreach"
                autoFocus
              />
            </div>
          )}

          {step === 1 && (
            <CheckboxGroup
              title="Target lists"
              empty="No lists yet — create one in Contacts."
              options={lists}
              selected={listIds}
              onToggle={(id) => toggle(listIds, setListIds, id)}
            />
          )}

          {step === 2 && (
            <CheckboxGroup
              title="Sender mailboxes"
              empty="No mailboxes connected — add one in Accounts."
              options={senders}
              selected={senderPoolIds}
              onToggle={(id) => toggle(senderPoolIds, setSenderPoolIds, id)}
            />
          )}

          {step === 3 && (
            <div className="space-y-2">
              <Label>Template</Label>
              {templates.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No templates yet — create one in Templates.
                </p>
              ) : (
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Sender rotation</Label>
                <Select
                  value={rotation}
                  onValueChange={(v) => setRotation(v as RotationStrategy)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROTATION_STRATEGIES.map((r) => (
                      <SelectItem key={r} value={r} className="capitalize">
                        {r.replace('-', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-start">Start at (optional)</Label>
                <Input
                  id="c-start"
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                />
                <p className="text-muted-foreground text-xs">
                  Leave blank to start sending immediately on launch.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0 || submitting}
        >
          <ChevronLeft className="size-4" /> Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
            Next <ChevronRight className="size-4" />
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => create(false)} disabled={submitting}>
              Save draft
            </Button>
            <Button onClick={() => create(true)} disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Launch
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckboxGroup({
  title,
  empty,
  options,
  selected,
  onToggle,
}: {
  title: string;
  empty: string;
  options: Option[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{title}</Label>
      {options.length === 0 ? (
        <p className="text-muted-foreground text-sm">{empty}</p>
      ) : (
        <div className="space-y-1.5">
          {options.map((o) => (
            <label
              key={o.id}
              className="hover:bg-accent flex cursor-pointer items-center gap-3 rounded-md border p-3"
            >
              <input
                type="checkbox"
                className="size-4"
                checked={selected.includes(o.id)}
                onChange={() => onToggle(o.id)}
              />
              <span className="flex-1 text-sm font-medium">{o.name}</span>
              {o.meta && <span className="text-muted-foreground text-xs">{o.meta}</span>}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
