import type { Patient } from '@/types';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDateOnly, daysUntil } from '@/lib/format';
import { PATIENT_STATUS_LABELS, PATIENT_STATUS_VARIANTS, SUSPENSION_REASON_LABELS } from '@/lib/constants';
import { BADGE_COLORS, patientSucursal } from './patient-helpers';

export function SucursalBadge({ patient }: { patient: Pick<Patient, 'sucursal'> }) {
  const s = patientSucursal(patient);
  if (!patient.sucursal) return <StatusBadge label="Sin asignar" variant={BADGE_COLORS.AMBER} />;
  if (!s) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <span className="text-sm">
      {s.nombre} <span className="text-muted-foreground font-mono text-xs">({s.codigo})</span>
    </span>
  );
}

/** Estado del paciente; si está suspendido muestra el motivo. */
export function PatientStatusBadge({ patient }: { patient: Pick<Patient, 'estado' | 'motivoSuspension'> }) {
  const label =
    patient.estado === 'suspendido' && patient.motivoSuspension
      ? `Suspendido · ${SUSPENSION_REASON_LABELS[patient.motivoSuspension] ?? patient.motivoSuspension}`
      : PATIENT_STATUS_LABELS[patient.estado];
  return <StatusBadge label={label} variant={PATIENT_STATUS_VARIANTS[patient.estado]} />;
}

/**
 * Estado de la receta: vigente (verde), por vencer en ≤ diasAviso (ámbar), vencida o sin receta (rojo).
 */
export function RecetaBadge({
  patient,
  diasAviso = 30,
}: {
  patient: Pick<Patient, 'recetaVigente' | 'documentos'>;
  diasAviso?: number;
}) {
  const receta = patient.recetaVigente;
  if (!receta) {
    const vencida = (patient.documentos || []).some(
      (d) => d.tipo === 'receta_medica' && d.estado === 'aprobado' && d.fechaVencimiento
    );
    return (
      <StatusBadge
        label={vencida ? 'Receta vencida' : 'Sin receta vigente'}
        variant={BADGE_COLORS.RED}
      />
    );
  }
  const dias = daysUntil(receta.fechaVencimiento);
  const porVencer = dias !== null && dias <= diasAviso;
  const sufijo = porVencer ? ` (${dias === 0 ? 'hoy' : `${dias} d`})` : '';
  return (
    <StatusBadge
      label={`Vence ${formatDateOnly(receta.fechaVencimiento)}${sufijo}`}
      variant={porVencer ? BADGE_COLORS.AMBER : BADGE_COLORS.GREEN}
    />
  );
}
