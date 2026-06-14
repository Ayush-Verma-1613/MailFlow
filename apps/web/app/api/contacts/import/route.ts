import { CSV_UPLOAD_MAX_BYTES, csvImportMappingSchema } from '@mailflow/shared';
import { rateLimit } from '@mailflow/queue';

import { badRequest, ok, serverError, tooManyRequests } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';
import { audit } from '@/lib/audit';
import { importContacts } from '@/lib/contacts-service';

/**
 * Import contacts from an uploaded CSV.
 * Multipart body: `file` (the CSV) + `payload` (JSON: column mapping + options).
 * Set `dryRun:true` in the payload to preview counts without writing.
 */
export const POST = withOrg(
  async (req, ctx) => {
    // CSV imports are heavy (parse + bulk upsert); cap per org.
    const limited = await rateLimit(`import:${ctx.orgId}`, { limit: 10, windowSec: 3600 });
    if (!limited.allowed) {
      return tooManyRequests('Too many imports. Try again later.', limited.retryAfterMs);
    }

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return badRequest('Expected multipart/form-data');
    }

    const file = form.get('file');
    const payloadRaw = form.get('payload');
    if (!(file instanceof File)) return badRequest('Missing CSV file');
    if (typeof payloadRaw !== 'string') return badRequest('Missing import payload');

    // Validate the upload by type and size BEFORE reading it into memory —
    // `file.text()` would otherwise buffer an arbitrarily large body, and the
    // row cap only applies after a full parse.
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return badRequest('Only .csv files are accepted');
    }
    if (file.size > CSV_UPLOAD_MAX_BYTES) {
      return badRequest(`CSV exceeds the ${CSV_UPLOAD_MAX_BYTES / (1024 * 1024)} MB limit`);
    }

    let payloadJson: unknown;
    try {
      payloadJson = JSON.parse(payloadRaw);
    } catch {
      return badRequest('Invalid payload JSON');
    }
    const parsed = csvImportMappingSchema.safeParse(payloadJson);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? 'Invalid mapping');
    }

    try {
      const csvText = await file.text();
      const result = await importContacts(ctx.orgId, csvText, parsed.data);

      if (result.committed) {
        await audit({
          orgId: ctx.orgId,
          actorId: ctx.userId,
          action: 'contacts.import',
          meta: { created: result.toCreate, updated: result.toUpdate, listId: result.listId },
        });
      }
      return ok(result);
    } catch (error) {
      console.error('[contacts.import] error:', error);
      return serverError('Import failed');
    }
  },
  { role: 'member' },
);
