'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { apiRequest } from '@/lib/client-api';
import { TemplateEditorDialog } from './template-editor-dialog';

export interface TemplateListItem {
  id: string;
  name: string;
  subject: string;
  category?: string;
  mergeTags: string[];
  updatedAt: string;
}

export function TemplatesView({ templates }: { templates: TemplateListItem[] }) {
  const router = useRouter();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>();

  function openNew() {
    setEditingId(undefined);
    setEditorOpen(true);
  }
  function openEdit(id: string) {
    setEditingId(id);
    setEditorOpen(true);
  }

  async function remove(id: string) {
    if (!confirm('Delete this template?')) return;
    try {
      await apiRequest(`/api/templates/${id}`, { method: 'DELETE' });
      toast.success('Template deleted');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew}>
          <Plus className="size-4" /> New template
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="text-muted-foreground flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-xl border border-dashed text-center">
          <FileText className="size-8" />
          <div>
            <p className="text-foreground font-medium">No templates yet</p>
            <p className="text-sm">Create one with {'{{merge}}'} tags to personalize sends.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id} className="gap-3">
              <CardHeader className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-medium">{t.name}</p>
                  {t.category && <Badge variant="secondary">{t.category}</Badge>}
                </div>
                <p className="text-muted-foreground truncate text-sm">{t.subject}</p>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">
                  {t.mergeTags.length} merge tag{t.mergeTags.length === 1 ? '' : 's'}
                </span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(t.id)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive size-8"
                    onClick={() => remove(t.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TemplateEditorDialog
        templateId={editingId}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
