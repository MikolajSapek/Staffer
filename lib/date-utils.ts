import { format } from 'date-fns';
import { da } from 'date-fns/locale/da';

/**
 * Format time from date string (HH:mm)
 */
export function formatTime(dateString: string): string {
  return format(new Date(dateString), 'HH:mm', { locale: da });
}

/**
 * Format date with day name (EEEE d. MMMM yyyy)
 */
export function formatDateLong(dateString: string): string {
  return format(new Date(dateString), 'EEEE d. MMMM yyyy', { locale: da });
}

/**
 * Format date without day name (d. MMMM yyyy)
 */
export function formatDateShort(dateString: string): string {
  return format(new Date(dateString), 'd. MMMM yyyy', { locale: da });
}

/**
 * Format date and time (d. MMMM yyyy HH:mm)
 */
export function formatDateTime(dateString: string | null): string {
  if (!dateString) return 'Ikke registreret';
  return format(new Date(dateString), 'd. MMMM yyyy HH:mm', { locale: da });
}

