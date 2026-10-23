import type { Patient, PatientDocument, SucursalStock, Product } from '@/types';
import { daysUntil } from '@/lib/format';

/** Dispensario del paciente tal como lo devuelve GET /patients/me (poblado). */
export interface SucursalDetalle {
  _id: string;
  nombre: string;
  codigo: string;
  direccion?: { calle?: string; numero?: string; comuna?: string; ciudad?: string; region?: string };
  telefono?: string;
  horarioAtencion?: string;
}

export function sucursalDe(patient: Patient | null | undefined): SucursalDetalle | null {
  const s = patient?.sucursal;
  if (!s || typeof s !== 'object') return null;
  return s as SucursalDetalle;
}

export type EstadoReceta =
  | { tipo: 'vigente'; fecha: string; dias: number }
  | { tipo: 'por_vencer'; fecha: string; dias: number }
  | { tipo: 'sin_receta' };

/** Estado de la receta vigente del paciente, según los días de aviso configurados. */
export function estadoReceta(patient: Patient | null | undefined, diasAviso: number): EstadoReceta {
  const fecha = patient?.recetaVigente?.fechaVencimiento;
  const dias = daysUntil(fecha);
  if (!fecha || dias === null || dias < 0) return { tipo: 'sin_receta' };
  if (dias <= diasAviso) return { tipo: 'por_vencer', fecha, dias };
  return { tipo: 'vigente', fecha, dias };
}

/**
 * Motivo por el que el paciente no puede pedir una dispensación, o null si puede.
 * Es solo una guía: la API valida lo mismo al crear la solicitud.
 */
export function motivoBloqueoSolicitud(patient: Patient | null | undefined): string | null {
  if (!patient) return null;
  if (patient.estado === 'pendiente') {
    return 'Tu ficha está en revisión. El dispensario debe revisar tus documentos y activar tu cuenta.';
  }
  if (patient.estado === 'rechazado') {
    return 'Tu registro fue rechazado. Contacta al dispensario para más información.';
  }
  if (patient.estado === 'suspendido') {
    return patient.motivoSuspension === 'receta_vencida'
      ? 'Tu receta venció. Sube una receta nueva en Mi perfil para volver a retirar.'
      : 'Tu cuenta está suspendida. Contacta al dispensario.';
  }
  if (!patient.recetaVigente) {
    return 'No tienes una receta aprobada y vigente. Sube tu receta en Mi perfil; el dispensario debe aprobarla.';
  }
  if (!patient.sucursal) {
    return 'Tu ficha no tiene dispensario asignado. Contacta al dispensario.';
  }
  return null;
}

/** Documento más reciente de un tipo. */
export function documentoPara(patient: Patient, tipo: string): PatientDocument | undefined {
  const docs = (patient.documentos || [])
    .filter((d) => d.tipo === tipo)
    .sort((a, b) => new Date(b.fechaSubida).getTime() - new Date(a.fechaSubida).getTime());
  return docs[0];
}

/** Producto poblado de una entrada del catálogo. */
export function productoDe(item: SucursalStock): Product | null {
  return item.producto && typeof item.producto === 'object' ? (item.producto as Product) : null;
}

/** Precio a mostrar de una entrada del catálogo (solo si los pagos están habilitados). */
export function precioDe(item: SucursalStock): number {
  return item.precioLocal ?? productoDe(item)?.precio ?? 0;
}
