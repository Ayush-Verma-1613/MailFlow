/**
 * Contact list management + CSV import. Owns dedupe, validation, and the
 * dry-run/commit split used by the import wizard.
 */
import 'server-only';
import Papa from 'papaparse';
import { Contact, List, mongoose } from '@mailflow/db';
import { CSV_IMPORT_MAX_ROWS, type CsvImportMapping } from '@mailflow/shared';

import { randomToken } from './slug';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function newUnsubscribeToken(): string {
  return randomToken(20);
}

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

/** Parse CSV text into headered row objects (server-side). */
export function parseCsv(text: string): ParsedCsv {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  const headers = result.meta.fields ?? [];
  return { headers, rows: result.data.slice(0, CSV_IMPORT_MAX_ROWS) };
}

export interface ImportSummary {
  totalRows: number;
  valid: number;
  invalid: number;
  duplicatesInFile: number;
  toCreate: number;
  toUpdate: number;
  /** Up to 10 example invalid rows (1-based line numbers). */
  invalidSamples: Array<{ line: number; reason: string }>;
}

export interface ImportResult extends ImportSummary {
  committed: boolean;
  listId?: string;
}

interface PreparedContact {
  email: string;
  firstName?: string;
  lastName?: string;
  customFields: Record<string, string>;
}

/** Map raw CSV rows → validated, de-duplicated contact records. */
function prepareRows(
  rows: Record<string, string>[],
  mapping: CsvImportMapping['mapping'],
  customFieldMap: Record<string, string>,
): { prepared: PreparedContact[]; invalid: ImportSummary['invalidSamples']; duplicatesInFile: number } {
  const byEmail = new Map<string, PreparedContact>();
  const invalid: ImportSummary['invalidSamples'] = [];
  let duplicatesInFile = 0;

  rows.forEach((row, idx) => {
    const line = idx + 2; // +1 header, +1 to 1-base
    const email = (row[mapping.email] ?? '').trim().toLowerCase();
    if (!email) {
      if (invalid.length < 10) invalid.push({ line, reason: 'missing email' });
      return;
    }
    if (!EMAIL_RE.test(email)) {
      if (invalid.length < 10) invalid.push({ line, reason: `invalid email "${email}"` });
      return;
    }

    const customFields: Record<string, string> = {};
    for (const [csvHeader, fieldName] of Object.entries(customFieldMap)) {
      const value = row[csvHeader]?.trim();
      if (value) customFields[fieldName] = value;
    }

    const record: PreparedContact = {
      email,
      firstName: mapping.firstName ? row[mapping.firstName]?.trim() : undefined,
      lastName: mapping.lastName ? row[mapping.lastName]?.trim() : undefined,
      customFields,
    };

    if (byEmail.has(email)) duplicatesInFile++;
    byEmail.set(email, record); // last wins
  });

  return { prepared: [...byEmail.values()], invalid, duplicatesInFile };
}

/**
 * Import contacts from CSV. When `dryRun` is true, only computes the summary;
 * otherwise upserts (dedupe by org+email) and attaches them to a list.
 */
export async function importContacts(
  orgId: string,
  csvText: string,
  config: CsvImportMapping,
): Promise<ImportResult> {
  const { rows } = parseCsv(csvText);
  const { prepared, invalid, duplicatesInFile } = prepareRows(
    rows,
    config.mapping,
    config.customFields,
  );

  const emails = prepared.map((p) => p.email);
  const existing = await Contact.find({ orgId, email: { $in: emails } })
    .select('email')
    .lean();
  const existingSet = new Set(existing.map((c) => c.email));

  const toUpdate = prepared.filter((p) => existingSet.has(p.email)).length;
  const toCreate = prepared.length - toUpdate;

  const summary: ImportSummary = {
    totalRows: rows.length,
    valid: prepared.length,
    invalid: rows.length - prepared.length,
    duplicatesInFile,
    toCreate,
    toUpdate,
    invalidSamples: invalid,
  };

  if (config.dryRun) {
    return { ...summary, committed: false };
  }

  // Resolve the target list (create one if requested).
  let listId = config.listId;
  if (!listId && config.createList) {
    const list = await List.create({ orgId, name: config.createList });
    listId = list._id.toString();
  }
  const listObjectId = listId ? new mongoose.Types.ObjectId(listId) : undefined;

  if (prepared.length > 0) {
    const ops = prepared.map((p) => {
      const set: Record<string, unknown> = {};
      if (p.firstName) set.firstName = p.firstName;
      if (p.lastName) set.lastName = p.lastName;
      for (const [k, v] of Object.entries(p.customFields)) set[`customFields.${k}`] = v;

      return {
        updateOne: {
          filter: { orgId: new mongoose.Types.ObjectId(orgId), email: p.email },
          update: {
            $set: set,
            $setOnInsert: {
              orgId: new mongoose.Types.ObjectId(orgId),
              email: p.email,
              status: 'active' as const,
              unsubscribeToken: newUnsubscribeToken(),
            },
            ...(listObjectId ? { $addToSet: { listIds: listObjectId } } : {}),
          },
          upsert: true,
        },
      };
    });
    await Contact.bulkWrite(ops, { ordered: false });
  }

  if (listObjectId) await recomputeListCount(orgId, listObjectId.toString());

  return { ...summary, committed: true, listId };
}

/** Recompute and persist a list's denormalized contactCount. */
export async function recomputeListCount(orgId: string, listId: string): Promise<void> {
  const count = await Contact.countDocuments({ orgId, listIds: listId });
  await List.updateOne({ _id: listId, orgId }, { $set: { contactCount: count } });
}
