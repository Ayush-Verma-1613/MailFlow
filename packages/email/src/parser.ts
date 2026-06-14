/** Normalize a raw RFC822 message into the fields we persist + thread on. */
import { simpleParser } from 'mailparser';

export interface ParsedEmail {
  messageId?: string;
  inReplyTo?: string;
  references: string[];
  from?: string;
  fromName?: string;
  to: string[];
  cc: string[];
  subject?: string;
  html?: string;
  text?: string;
  date?: Date;
  snippet: string;
}

function addresses(field: { value?: Array<{ address?: string }> } | undefined): string[] {
  return (field?.value ?? [])
    .map((v) => v.address?.toLowerCase())
    .filter((a): a is string => Boolean(a));
}

export async function parseRawEmail(raw: Buffer | string): Promise<ParsedEmail> {
  const p = await simpleParser(raw);

  const references = Array.isArray(p.references)
    ? p.references
    : p.references
      ? [p.references]
      : [];

  const fromAddr = p.from?.value?.[0];
  const text = p.text ?? undefined;
  const html = typeof p.html === 'string' ? p.html : undefined;

  return {
    messageId: p.messageId,
    inReplyTo: p.inReplyTo,
    references,
    from: fromAddr?.address?.toLowerCase(),
    fromName: fromAddr?.name || undefined,
    to: addresses(p.to as never),
    cc: addresses(p.cc as never),
    subject: p.subject,
    html,
    text,
    date: p.date ?? undefined,
    snippet: (text ?? '').replace(/\s+/g, ' ').trim().slice(0, 200),
  };
}

/** Strip Re:/Fwd: prefixes for subject-based thread matching. */
export function normalizeSubject(subject?: string): string {
  return (subject ?? '')
    .replace(/^(\s*(re|fwd|fw)\s*:\s*)+/i, '')
    .trim()
    .toLowerCase();
}
