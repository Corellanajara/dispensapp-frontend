import type { UbicacionRef, SucursalRef } from '@/types';
import { UBICACION_TIPO_LABELS } from '@/lib/constants';

/** Campo poblado o id: devuelve el objeto si viene poblado, si no null. */
export function populated<T extends object>(v: string | T | null | undefined): T | null {
  return v && typeof v === 'object' ? v : null;
}

/** "Bodega principal · BOD-1" o "Stock general" si no hay ubicación. */
export function ubicacionLabel(u: string | UbicacionRef | null | undefined): string {
  const p = populated(u);
  if (!p) return u ? 'Ubicación' : 'Stock general';
  return `${p.nombre} · ${p.codigo}`;
}

export function ubicacionTipoLabel(u: string | UbicacionRef | null | undefined): string {
  const p = populated(u);
  return p?.tipo ? UBICACION_TIPO_LABELS[p.tipo] : '';
}

export function sucursalLabel(s: string | Pick<SucursalRef, 'nombre' | 'codigo'> | null | undefined): string {
  const p = populated(s);
  return p ? `${p.nombre} (${p.codigo})` : '—';
}

export function nombreDe(v: unknown, fallback = '—'): string {
  if (!v || typeof v !== 'object') return fallback;
  return (v as { nombre?: string }).nombre ?? fallback;
}
