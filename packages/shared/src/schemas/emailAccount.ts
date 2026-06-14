import { z } from 'zod';
import { email } from './common';

/** SMTP credentials submitted from the connect form. Password is encrypted server-side. */
export const smtpConnectSchema = z
  .object({
    displayName: z.string().trim().min(1).max(120),
    fromName: z.string().trim().min(1).max(120),
    fromEmail: email,
    host: z.string().trim().min(1),
    port: z.coerce.number().int().min(1).max(65535).default(587),
    user: z.string().trim().min(1),
    pass: z.string().min(1),
    secure: z.coerce.boolean().default(false),
    // Optional DKIM signing. Supply the selector you published in DNS plus the
    // matching PEM private key; both or neither. The key is encrypted at rest.
    dkimSelector: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9._-]+$/i, 'Selector may only contain letters, digits, dot, dash, underscore')
      .optional(),
    dkimPrivateKey: z
      .string()
      .trim()
      .regex(/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'Must be a PEM-encoded private key')
      .optional(),
  })
  .refine((v) => Boolean(v.dkimSelector) === Boolean(v.dkimPrivateKey), {
    message: 'Provide both a DKIM selector and a private key, or neither',
    path: ['dkimPrivateKey'],
  });
export type SmtpConnectInput = z.infer<typeof smtpConnectSchema>;

export const accountLimitsSchema = z.object({
  dailyCap: z.coerce.number().int().min(1).max(100_000),
  hourlyCap: z.coerce.number().int().min(1).max(10_000),
  warmupDay: z.coerce.number().int().min(0).optional(),
});
export type AccountLimitsInput = z.infer<typeof accountLimitsSchema>;

export const testSendSchema = z.object({
  to: email,
});
export type TestSendInput = z.infer<typeof testSendSchema>;
