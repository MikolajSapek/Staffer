import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as Danish Krone (DKK)
 * @param amount - The amount to format
 * @param options - Formatting options
 * @returns Formatted currency string (e.g., "1.250,00 kr." or "1,250.00 DKK")
 */
export function formatCurrency(
  amount: number,
  options: {
    locale?: 'da-DK' | 'en-US';
    showSymbol?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {}
): string {
  const {
    locale = 'da-DK',
    showSymbol = true,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options;

  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'DKK',
    minimumFractionDigits,
    maximumFractionDigits,
  });

  const formatted = formatter.format(amount);

  // For Danish locale, the formatter returns "1.250,00 kr."
  // For English locale, it returns "DKK 1,250.00" or "1,250.00 DKK"
  // We can customize the output if needed
  if (!showSymbol && locale === 'da-DK') {
    // Remove "kr." suffix for Danish if showSymbol is false
    return formatted.replace(/\s*kr\.?$/, '');
  }

  return formatted;
}

/**
 * Format a number as DKK with a simple format (no currency symbol, just number + "DKK")
 * Useful for displaying rates like "150 DKK/t"
 * @param amount - The amount to format
 * @param locale - Locale for number formatting
 * @returns Formatted string (e.g., "150,00 DKK" for da-DK or "150.00 DKK" for en-US)
 */
export function formatDKK(
  amount: number,
  locale: 'da-DK' | 'en-US' = 'da-DK'
): string {
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${formatter.format(amount)} DKK`;
}