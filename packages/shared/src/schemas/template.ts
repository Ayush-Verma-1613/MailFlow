import { z } from 'zod';

export const templateVariantSchema = z.object({
  name: z.string().trim().min(1).max(60),
  subject: z.string().trim().min(1).max(300),
  bodyHtml: z.string().min(1),
});

export const templateCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  subject: z.string().trim().min(1).max(300),
  bodyHtml: z.string().min(1),
  bodyText: z.string().optional(),
  category: z.string().trim().max(60).optional(),
  variants: z.array(templateVariantSchema).max(10).default([]),
});
export type TemplateCreateInput = z.infer<typeof templateCreateSchema>;

export const templateUpdateSchema = templateCreateSchema.partial();
export type TemplateUpdateInput = z.infer<typeof templateUpdateSchema>;

/** Merge-tag pattern: {{firstName}}. Extracted for preview + validation. */
export const MERGE_TAG_RE = /\{\{\s*([\w.]+)\s*\}\}/g;

export function extractMergeTags(...parts: string[]): string[] {
  const tags = new Set<string>();
  for (const part of parts) {
    for (const match of part.matchAll(MERGE_TAG_RE)) {
      if (match[1]) tags.add(match[1]);
    }
  }
  return [...tags];
}

/**
 * Render `{{tag}}` merge tags against a data map. Supports dotted paths
 * (`{{contact.firstName}}`). Unknown tags fall back to `fallback` (default '').
 * Client-safe — used for live preview and (in the worker) for actual sends.
 */
export function renderMergeTags(
  template: string,
  data: Record<string, unknown>,
  fallback = '',
): string {
  return template.replace(MERGE_TAG_RE, (_match, rawPath: string) => {
    const value = rawPath
      .split('.')
      .reduce<unknown>(
        (acc, key) =>
          acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined,
        data,
      );
    if (value === undefined || value === null || value === '') return fallback;
    return String(value);
  });
}
