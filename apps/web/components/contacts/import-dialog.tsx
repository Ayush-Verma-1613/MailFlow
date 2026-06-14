'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import type { ImportResult } from '@/lib/contacts-service';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const NONE = '__none__';

interface ListOption {
  id: string;
  name: string;
}

export function ImportDialog({
  lists,
  onImported,
}: {
  lists: ListOption[];
  onImported: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [emailCol, setEmailCol] = useState('');
  const [firstNameCol, setFirstNameCol] = useState(NONE);
  const [lastNameCol, setLastNameCol] = useState(NONE);
  const [listId, setListId] = useState(NONE);
  const [newListName, setNewListName] = useState('');
  const [summary, setSummary] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setFile(null);
    setHeaders([]);
    setEmailCol('');
    setFirstNameCol(NONE);
    setLastNameCol(NONE);
    setListId(NONE);
    setNewListName('');
    setSummary(null);
  }

  function onFile(f: File | null) {
    setSummary(null);
    setFile(f);
    if (!f) return setHeaders([]);
    Papa.parse(f, {
      header: true,
      preview: 1,
      skipEmptyLines: true,
      complete: (res) => {
        const fields = (res.meta.fields ?? []).map((h) => h.trim());
        setHeaders(fields);
        // Best-effort auto-map an email column.
        const guess = fields.find((h) => /e-?mail/i.test(h));
        if (guess) setEmailCol(guess);
      },
    });
  }

  function buildPayload(dryRun: boolean) {
    return {
      ...(listId !== NONE ? { listId } : {}),
      ...(listId === NONE && newListName.trim() ? { createList: newListName.trim() } : {}),
      mapping: {
        email: emailCol,
        ...(firstNameCol !== NONE ? { firstName: firstNameCol } : {}),
        ...(lastNameCol !== NONE ? { lastName: lastNameCol } : {}),
      },
      customFields: {},
      dryRun,
    };
  }

  async function run(dryRun: boolean) {
    if (!file || !emailCol) {
      toast.error('Pick a file and map the email column');
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('payload', JSON.stringify(buildPayload(dryRun)));
      const res = await fetch('/api/contacts/import', { method: 'POST', body: form });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message ?? 'Import failed');

      if (dryRun) {
        setSummary(body as ImportResult);
      } else {
        toast.success(
          `Imported ${body.toCreate} new, updated ${body.toUpdate} contact(s)`,
        );
        setOpen(false);
        reset();
        onImported();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="size-4" /> Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import contacts from CSV</DialogTitle>
          <DialogDescription>
            Map your columns, preview the result, then import. Existing contacts (by
            email) are updated, not duplicated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="csv">CSV file</Label>
            <Input
              id="csv"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {headers.length > 0 && (
            <div className="space-y-3">
              <ColumnSelect
                label="Email column (required)"
                value={emailCol}
                onChange={setEmailCol}
                headers={headers}
              />
              <div className="grid grid-cols-2 gap-3">
                <ColumnSelect
                  label="First name"
                  value={firstNameCol}
                  onChange={setFirstNameCol}
                  headers={headers}
                  allowNone
                />
                <ColumnSelect
                  label="Last name"
                  value={lastNameCol}
                  onChange={setLastNameCol}
                  headers={headers}
                  allowNone
                />
              </div>

              <div className="space-y-1.5">
                <Label>Add to list</Label>
                <Select value={listId} onValueChange={setListId}>
                  <SelectTrigger>
                    <SelectValue placeholder="No list / create new" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No list / create new</SelectItem>
                    {lists.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {listId === NONE && (
                  <Input
                    placeholder="New list name (optional)"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                  />
                )}
              </div>
            </div>
          )}

          {summary && (
            <div className="bg-muted/50 rounded-md border p-3 text-sm">
              <div className="grid grid-cols-2 gap-y-1">
                <span className="text-muted-foreground">Total rows</span>
                <span className="text-right font-medium">{summary.totalRows}</span>
                <span className="text-muted-foreground">New contacts</span>
                <span className="text-right font-medium">{summary.toCreate}</span>
                <span className="text-muted-foreground">Updated</span>
                <span className="text-right font-medium">{summary.toUpdate}</span>
                <span className="text-muted-foreground">Invalid</span>
                <span className="text-right font-medium">{summary.invalid}</span>
                <span className="text-muted-foreground">Duplicates in file</span>
                <span className="text-right font-medium">{summary.duplicatesInFile}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => run(true)} disabled={busy || !file}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Preview
          </Button>
          <Button onClick={() => run(false)} disabled={busy || !emailCol}>
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ColumnSelect({
  label,
  value,
  onChange,
  headers,
  allowNone,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  headers: string[];
  allowNone?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select column" />
        </SelectTrigger>
        <SelectContent>
          {allowNone && <SelectItem value={NONE}>— None —</SelectItem>}
          {headers.map((h) => (
            <SelectItem key={h} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
