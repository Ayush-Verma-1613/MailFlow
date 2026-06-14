/**
 * Asynchronous bounce (DSN) parsing. Mail servers report failed delivery with a
 * Delivery Status Notification — an RFC 3464 `multipart/report; report-type=
 * delivery-status` message from MAILER-DAEMON. We detect those and pull out the
 * failed recipient(s) so the contact can be suppressed.
 */
import { simpleParser } from 'mailparser';

export interface BounceReport {
  /** Lowercased addresses that failed. */
  recipients: string[];
  /** Permanent (hard) failure — i.e. suppress the contact. 4.x = transient. */
  permanent: boolean;
  /** RFC 3463 status code of the last failed recipient (e.g. "5.1.1"). */
  status?: string;
  /** Human-readable diagnostic (e.g. the SMTP 550 line). */
  diagnostic?: string;
}

const MAILER_DAEMON = /(mailer-daemon|postmaster)@/i;

function stripAngles(addr: string): string {
  return addr.replace(/^<|>$/g, '').trim().toLowerCase();
}

/**
 * Parse a `message/delivery-status` body into failed recipients. The body is a
 * per-message field block followed by one block per recipient, blank-line
 * separated; we only care about blocks whose `Action: failed`.
 */
function parseDeliveryStatus(
  body: string,
): Omit<BounceReport, 'recipients'> & { recipients: string[] } {
  const recipients: string[] = [];
  let permanent = false;
  let status: string | undefined;
  let diagnostic: string | undefined;

  for (const block of body.split(/\r?\n\r?\n/)) {
    const fields = new Map<string, string>();
    for (const line of block.split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z-]+):\s*(.*)$/);
      const key = m?.[1];
      if (key) fields.set(key.toLowerCase(), (m?.[2] ?? '').trim());
    }
    if (fields.get('action')?.toLowerCase() !== 'failed') continue;

    const fr = fields.get('final-recipient') ?? fields.get('original-recipient');
    const addr = fr?.split(';').pop();
    if (addr) recipients.push(stripAngles(addr));

    const st = fields.get('status');
    if (st) status = st;
    // `failed` is permanent unless the status explicitly says 4.x (transient).
    if (!st || !st.trim().startsWith('4')) permanent = true;
    diagnostic = fields.get('diagnostic-code') ?? diagnostic;
  }

  return { recipients: [...new Set(recipients)], permanent, status, diagnostic };
}

/**
 * Parse a raw RFC822 message as a bounce. Returns `null` when it isn't a DSN.
 * Gated on a delivery-status report content-type or a MAILER-DAEMON sender, so
 * an ordinary email that happens to quote "Action: failed" won't trip it.
 */
export async function parseBounce(raw: Buffer | string): Promise<BounceReport | null> {
  const p = await simpleParser(raw);

  const ct = p.headers.get('content-type') as
    | { value?: string; params?: Record<string, string> }
    | undefined;
  const isReport =
    ct?.value?.toLowerCase() === 'multipart/report' &&
    ct.params?.['report-type']?.toLowerCase() === 'delivery-status';
  const fromDaemon = MAILER_DAEMON.test(p.from?.text ?? '');
  if (!isReport && !fromDaemon) return null;

  // Prefer the structured delivery-status part; fall back to scanning the raw
  // body (some servers don't surface it as a clean MIME part).
  const dsPart = (p.attachments ?? []).find(
    (a) => (a.contentType ?? '').toLowerCase() === 'message/delivery-status',
  );
  const body = dsPart?.content ? dsPart.content.toString('utf8') : raw.toString();

  const report = parseDeliveryStatus(body);
  if (report.recipients.length === 0) return null;
  return report;
}
