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

/**
 * Fecha "solo día" guardada a medianoche UTC (ej. vencimiento de receta).
 * Usa los componentes UTC para no mostrar el día anterior en Chile.
 * @example formatDateOnly("2027-01-15T00:00:00.000Z") → "15/01/2027"
 */
export function formatDateOnly(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '—';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

/** Días desde hoy hasta una fecha "solo día" (negativo si ya pasó). */
export function daysUntil(date: string | Date | null | undefined): number | null {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return null;
  const hoy = new Date();
  const hoyUTC = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const objetivo = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((objetivo - hoyUTC) / 86400000);
}

/** Valor para <input type="date"> a partir de una fecha "solo día". */
export function toDateInputValue(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/** Nombre de un usuario poblado o "—". */
export function personName(u: unknown): string {
  if (!u || typeof u !== 'object') return '—';
  const p = u as { nombre?: string; apellido?: string };
  return `${p.nombre ?? ''} ${p.apellido ?? ''}`.trim() || '—';
}
