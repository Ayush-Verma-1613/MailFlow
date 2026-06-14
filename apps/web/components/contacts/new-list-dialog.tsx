'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
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
import { apiRequest } from '@/lib/client-api';

/** Create an (empty) contact list. Add contacts to it via Add contact / Import. */
export function NewListDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await apiRequest('/api/lists', { method: 'POST', body: JSON.stringify({ name: trimmed }) });
      toast.success(`List “${trimmed}” created`);
      setName('');
      setOpen(false);
      onCreated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create list');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setName('');
      }}
    >
      <DialogTrigger asChild>
        <button
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[11px]"
          aria-label="Create a new list"
        >
          <Plus className="size-3" /> New
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New list</DialogTitle>
          <DialogDescription>
            Lists are the audiences you target in a campaign. Add contacts to it from “Add contact”
            or by importing a CSV.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="listName">List name</Label>
            <Input
              id="listName"
              autoFocus
              placeholder="Q2 cold outreach"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy || !name.trim()}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Create list
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
