import { z } from 'zod';
import { email } from './common';

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long');

export const signUpSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  email,
  password: passwordSchema,
  /**
   * Optional org name; defaults to "<name>'s workspace" server-side. An empty
   * string (untouched form field) is coerced to undefined so it doesn't trip the
   * min-length check and block signup.
   */
  orgName: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().trim().min(1).max(120).optional(),
  ),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const verifyResendSchema = z.object({ email });
export type VerifyResendInput = z.infer<typeof verifyResendSchema>;

export const verifyOtpSchema = z.object({
  email,
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
