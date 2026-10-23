import type { Patient } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PATIENT_STATUS_LABELS, PATIENT_STATUS_VARIANTS } from '@/lib/constants';
import { formatDateTime, personName } from '@/lib/format';

/** Línea de tiempo de cambios de estado del paciente (más reciente arriba). */
export function StatusHistory({ patient }: { patient: Patient }) {
  const historial = [...(patient.historialEstados ?? [])].reverse();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Historial de estados</CardTitle>
      </CardHeader>
      <CardContent>
        {historial.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground/70 py-12">Sin cambios registrados</p>
        ) : (
          <ol className="relative border-l border-border ml-2 space-y-5">
            {historial.map((h, i) => (
              <li key={i} className="ml-5">
                <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary/60" />
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge label={PATIENT_STATUS_LABELS[h.estado] ?? h.estado} variant={PATIENT_STATUS_VARIANTS[h.estado] ?? ''} />
                  <span className="text-xs text-muted-foreground">{formatDateTime(h.fecha)}</span>
                </div>
                <p className="text-sm mt-1">
                  {h.usuario ? personName(h.usuario) : <span className="text-muted-foreground">Sistema (automático)</span>}
                </p>
                {h.motivo && <p className="text-sm text-muted-foreground">{h.motivo}</p>}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
