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

/**
 * Convert UTC date string to local datetime-local format (YYYY-MM-DDTHH:mm)
 * Fixes timezone shift bug where DB UTC '22:00' shows as '21:00' in UI
 * Used for datetime-local input fields in forms
 * @param dateStr - UTC date string from database
 * @returns Formatted string in YYYY-MM-DDTHH:mm format (no seconds/milliseconds)
 */
export function toLocalISO(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  } catch (err) {
    console.error('Error converting UTC to local datetime:', err);
    return '';
  }
}

