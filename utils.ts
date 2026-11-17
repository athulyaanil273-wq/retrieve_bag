import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind CSS utility classes predictably without style conflicts.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes airline flight numbers (e.g., "ai 302" -> "AI 302") for consistent matching.
 */
export function formatFlightCode(raw: string): string {
  const cleaned = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const match = cleaned.match(/^([A-Z]{2,3})(\d{1,4}[A-Z]?)$/);
  if (!match) return raw.trim().toUpperCase();
  return `${match[1]} ${match[2]}`;
}

/**
 * Formats airport baggage tag numbers into readable 10-digit groups if applicable.
 */
export function formatBaggageTag(raw: string): string {
  const digits = raw.replace(/\s+/g, '').toUpperCase();
  if (/^\d{10}$/.test(digits)) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return digits;
}
