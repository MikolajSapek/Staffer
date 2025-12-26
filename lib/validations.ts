import { z } from 'zod';

// Danish phone number validation (8 digits)
export const phoneSchema = z
  .string()
  .regex(/^\d{8}$/, 'Telefonnummer skal være 8 cifre');

// Danish CPR number validation (10 digits, DDMMYY-XXXX)
export const cprSchema = z
  .string()
  .regex(/^\d{6}-\d{4}$/, 'CPR skal være i formatet DDMMYY-XXXX');

// CVR number validation (8 digits)
export const cvrSchema = z
  .string()
  .regex(/^\d{8}$/, 'CVR nummer skal være 8 cifre');

// EAN number validation (13 digits)
export const eanSchema = z
  .string()
  .regex(/^\d{13}$/, 'EAN nummer skal være 13 cifre');

// Bank account validation (Danish format: 4 digits + account number)
export const bankAccountSchema = z.object({
  regNumber: z.string().regex(/^\d{4}$/, 'Registreringsnummer skal være 4 cifre'),
  accountNumber: z.string().min(1, 'Kontonummer er påkrævet'),
});

// Tax card type
export const taxCardTypeSchema = z.enum(['Hovedkort', 'Bikort', 'Frikort']);

// User role
export const roleSchema = z.enum(['worker', 'company', 'admin']);

// Shift status
export const shiftStatusSchema = z.enum([
  'published',
  'full',
  'completed',
  'cancelled',
]);

// Application status
export const applicationStatusSchema = z.enum([
  'pending',
  'accepted',
  'rejected',
  'waitlist',
]);

// Timesheet status
export const timesheetStatusSchema = z.enum([
  'pending',
  'approved',
  'disputed',
  'paid',
]);

