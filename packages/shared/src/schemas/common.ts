import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants';

/** A MongoDB ObjectId rendered as a 24-char hex string. */
export const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const email = z.string().trim().toLowerCase().email();

/** Standard list query: page / pageSize / search / sort. */
export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
  search: z.string().trim().max(200).optional(),
  sort: z.string().max(50).optional(),
});
export type PaginationQuery = z.infer<typeof paginationQuery>;

/** Shape of a paginated API response. */
export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function paginatedResponse<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
  });
}
