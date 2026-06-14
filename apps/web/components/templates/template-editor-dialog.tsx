'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { extractMergeTags, renderMergeTags } from '@mailflow/shared';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/client-api';

/** Reasonable sample values for previewing merge tags. */
function sampleFor(tag: string): string {
  const key = tag.split('.').pop()?.toLowerCase() ?? tag;
  const map: Record<string, string> = {
    firstname: 'Jane',
    lastname: 'Doe',
    name: 'Jane Doe',
    email: 'jane@example.com',
    company: 'Acme Inc.',
  };
  return map[key] ?? `[${tag}]`;
}

interface TemplateEditorDialogProps {
  templateId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function TemplateEditorDialog({
  templateId,
  open,
  onOpenChange,
  onSaved,
}: TemplateEditorDialogProps) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load the full template when editing.
  useEffect(() => {
    if (!open) return;
    if (!templateId) {
      setName('');
      setSubject('');
      setBodyHtml('<p>Hi {{firstName}},</p>\n<p>...</p>');
      setCategory('');
      return;
    }
    setLoading(true);
    apiRequest<{ template: { name: string; subject: string; bodyHtml: string; category?: string } }>(
      `/api/templates/${templateId}`,
    )
      .then(({ template }) => {
        setName(template.name);
        setSubject(template.subject);
        setBodyHtml(template.bodyHtml);
        setCategory(template.category ?? '');
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [open, templateId]);

  const sampleData = useMemo(() => {
    const tags = extractMergeTags(subject, bodyHtml);
    return Object.fromEntries(tags.map((t) => [t, sampleFor(t)]));
  }, [subject, bodyHtml]);

  const previewSubject = renderMergeTags(subject, sampleData);
  const previewBody = renderMergeTags(bodyHtml, sampleData);

  async function save() {
    if (!name.trim() || !subject.trim() || !bodyHtml.trim()) {
      toast.error('Name, subject and body are required');
      return;
    }
    setSaving(true);
    try {
      const payload = { name, subject, bodyHtml, category: category || undefined };
      if (templateId) {
        await apiRequest(`/api/templates/${templateId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/api/templates', {
          method: 'POST',
          body: JSON.stringify({ ...payload, variants: [] }),
        });
      }
      toast.success(templateId ? 'Template updated' : 'Template created');
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{templateId ? 'Edit template' : 'New template'}</DialogTitle>
          <DialogDescription>
            Use <code className="text-xs">{'{{firstName}}'}</code> merge tags — preview
            shows them filled with sample data.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10 text-center">
            <Loader2 className="text-muted-foreground mx-auto size-5 animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="edit">
            <TabsList>
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="t-name">Name</Label>
                  <Input
                    id="t-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Cold intro v1"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="t-cat">Category</Label>
                  <Input
                    id="t-cat"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Outreach"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-subject">Subject</Label>
                <Input
                  id="t-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Quick question, {{firstName}}"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-body">Body (HTML)</Label>
                <Textarea
                  id="t-body"
                  className="min-h-48 font-mono text-xs"
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                />
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-3 pt-4">
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground text-xs">Subject</p>
                <p className="font-medium">{previewSubject || '—'}</p>
              </div>
              {/* Sandboxed render so template HTML can't touch the app. */}
              <iframe
                title="Email preview"
                sandbox=""
                srcDoc={previewBody}
                className="bg-background h-64 w-full rounded-md border"
              />
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || loading}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {templateId ? 'Save changes' : 'Create template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
