import { z } from 'zod';
import { CONTACT_STATUSES } from '../constants';
import { email, objectId } from './common';

export const contactCreateSchema = z.object({
  email,
  firstName: z.string().trim().max(120).optional(),
  lastName: z.string().trim().max(120).optional(),
  tags: z.array(z.string().trim().max(60)).max(50).default([]),
  listIds: z.array(objectId).max(50).default([]),
  customFields: z.record(z.string(), z.string()).default({}),
  source: z.string().trim().max(120).optional(),
});
export type ContactCreateInput = z.infer<typeof contactCreateSchema>;

export const contactUpdateSchema = contactCreateSchema
  .partial()
  .extend({ status: z.enum(CONTACT_STATUSES).optional() });
export type ContactUpdateInput = z.infer<typeof contactUpdateSchema>;

export const contactQuerySchema = z.object({
  listId: objectId.optional(),
  status: z.enum(CONTACT_STATUSES).optional(),
  tag: z.string().trim().max(60).optional(),
});

/** Maps CSV column headers → Contact fields for the import column-mapper. */
export const csvImportMappingSchema = z.object({
  listId: objectId.optional(),
  createList: z.string().trim().max(120).optional(),
  mapping: z.object({
    email: z.string().min(1),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  }),
  /** Extra columns mapped into customFields: { csvHeader: fieldName }. */
  customFields: z.record(z.string(), z.string()).default({}),
  dryRun: z.boolean().default(false),
});
export type CsvImportMapping = z.infer<typeof csvImportMappingSchema>;

export const listCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
});
export type ListCreateInput = z.infer<typeof listCreateSchema>;
