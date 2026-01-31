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
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    
    // Formatowanie 'sv-SE' daje format ISO (YYYY-MM-DD HH:mm) w czasie LOKALNYM przeglądarki
    // Zamieniamy spację na 'T' i mamy gotowe value dla inputa.
    return date.toLocaleString('sv-SE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: undefined // Bez sekund, żeby input nie krzyczał o walidację
    }).replace(' ', 'T');
  } catch (err) {
    console.error('Error converting UTC to local datetime:', err);
    return '';
  }
}

/**
 * Convert local datetime-local format (YYYY-MM-DDTHH:mm) to UTC ISO string
 * Used for converting form input values back to UTC for database storage
 * @param localDateTimeStr - Local datetime string from datetime-local input (YYYY-MM-DDTHH:mm)
 * @returns ISO string in UTC format
 */
export function fromLocalISO(localDateTimeStr: string): string {
  if (!localDateTimeStr) return '';
  try {
    // Create Date object from local datetime string
    // JavaScript Date constructor interprets YYYY-MM-DDTHH:mm as local time
    const localDate = new Date(localDateTimeStr);
    if (isNaN(localDate.getTime())) return '';
    // Convert to ISO string (UTC)
    return localDate.toISOString();
  } catch (err) {
    console.error('Error converting local datetime to UTC ISO:', err);
    return '';
  }
}

/**
 * Get current time in local datetime-local format (YYYY-MM-DDTHH:mm)
 * Used for min/max attributes in datetime-local input fields
 * @returns Formatted string in YYYY-MM-DDTHH:mm format (local time)
 */
export function getCurrentLocalISO(): string {
  return toLocalISO(new Date().toISOString());
}

const MINUTE_OPTIONS = [0, 10, 20, 30, 40, 50];

/**
 * Round local datetime string to nearest 10-minute boundary (00, 10, 20, 30, 40, 50).
 * Used when loading existing shift times into the Time Picker (10-min interval).
 * @param localISO - Local datetime string (YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss)
 * @returns Local datetime string with minutes rounded, format YYYY-MM-DDTHH:mm:00
 */
export function roundLocalISOTo10Min(localISO: string | null | undefined): string {
  if (!localISO) return '';
  try {
    const date = new Date(localISO);
    if (isNaN(date.getTime())) return '';
    const min = date.getMinutes();
    const rounded = MINUTE_OPTIONS.reduce((prev, curr) =>
      Math.abs(curr - min) < Math.abs(prev - min) ? curr : prev
    );
    date.setMinutes(rounded, 0, 0);
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    const h = date.getHours().toString().padStart(2, '0');
    const mm = date.getMinutes().toString().padStart(2, '0');
    return `${y}-${m}-${d}T${h}:${mm}:00`;
  } catch (err) {
    console.error('Error rounding local datetime to 10 min:', err);
    return '';
  }
}

