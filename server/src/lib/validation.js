import { z } from 'zod';

export const emailField = z
  .string({ required_error: 'Please enter an email address.' })
  .trim()
  .toLowerCase()
  .email('Please enter a valid email address.')
  .max(200);

export const passwordField = z
  .string({ required_error: 'Please enter a password.' })
  .min(8, 'Password must be at least 8 characters long.')
  .max(200, 'Password is too long.')
  .refine((p) => /[A-Za-z]/.test(p) && /[0-9]/.test(p), 'Password must include at least one letter and one number.');

export const nameField = z
  .string({ required_error: 'Please enter a name.' })
  .trim()
  .min(2, 'Please enter a name (at least 2 letters).')
  .max(100, 'Name is too long.');

/** Optional free text: empty string becomes null. */
export const optionalText = (max, label = 'This field') =>
  z
    .string()
    .trim()
    .max(max, `${label} is too long (maximum ${max} characters).`)
    .nullish()
    .transform((v) => (v ? v : null));

export const phoneField = optionalText(30, 'Phone number').refine(
  (v) => v === null || /^[0-9+\-() ]{6,30}$/.test(v),
  'Phone number can only contain digits, spaces and + - ( ).',
);

export const idList = z.array(z.string().min(1).max(50)).max(100).default([]);
