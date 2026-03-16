import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

// ── Currency ──

const clpFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  minimumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('es-CL');

/**
 * Format a number as CLP currency.
 * @example formatCurrency(15000) → "$15.000"
 */
export function formatCurrency(amount: number): string {
  return clpFormatter.format(amount);
}

/**
 * Format a number with thousand separators.
 * @example formatNumber(15000) → "15.000"
 */
export function formatNumber(amount: number): string {
  return numberFormatter.format(amount);
}

// ── Dates ──

function safeParse(date: string | Date): Date | null {
  if (date instanceof Date) return isValid(date) ? date : null;
  try {
    const parsed = parseISO(date);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Format a date as "13 mar 2026".
 */
export function formatDate(date: string | Date): string {
  const d = safeParse(date);
  if (!d) return '—';
  return format(d, "d MMM yyyy", { locale: es });
}

/**
 * Format a date as "13/03/2026".
 */
export function formatDateShort(date: string | Date): string {
  const d = safeParse(date);
  if (!d) return '—';
  return format(d, 'dd/MM/yyyy');
}

/**
 * Format a date with time as "13 mar 2026, 14:30".
 */
export function formatDateTime(date: string | Date): string {
  const d = safeParse(date);
  if (!d) return '—';
  return format(d, "d MMM yyyy, HH:mm", { locale: es });
}

/**
 * Format a date as relative time: "hace 3 horas", "hace 2 días".
 */
export function formatRelativeTime(date: string | Date): string {
  const d = safeParse(date);
  if (!d) return '—';
  return formatDistanceToNow(d, { addSuffix: true, locale: es });
}

// ── Misc ──

/**
 * Truncate text to a max length with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}

/**
 * Capitalize first letter.
 */
export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Format RUT with dots and dash: "12345678-9" → "12.345.678-9".
 */
export function formatRut(rut: string): string {
  const clean = rut.replace(/[^0-9kK]/g, '');
  if (clean.length < 2) return rut;
  const body = clean.slice(0, -1);
  const verifier = clean.slice(-1).toUpperCase();
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formatted}-${verifier}`;
}
