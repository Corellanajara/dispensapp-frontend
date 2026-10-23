import type { Patient, SucursalRef } from '@/types';

export const BADGE_COLORS = {
  RED: 'bg-destructive/15 text-destructive border-destructive/25',
  AMBER: 'bg-warning/15 text-warning border-warning/25',
  GREEN: 'bg-success/15 text-success border-success/25',
  MUTED: 'bg-muted text-muted-foreground border-border',
  INFO: 'bg-info/15 text-info border-info/25',
};

/** Dispensario poblado ({nombre, codigo}) o null. */
export function patientSucursal(p: Pick<Patient, 'sucursal'>): SucursalRef | null {
  if (p.sucursal && typeof p.sucursal === 'object') return p.sucursal;
  return null;
}
