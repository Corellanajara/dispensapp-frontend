import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Sprout, ChevronRight } from 'lucide-react';
import { usePatientEspacios } from '@/hooks/use-patients';
import { ESPACIO_ESTADO_LABELS } from '@/lib/constants';
import { formatNumber } from '@/lib/format';
import { BADGE_COLORS } from './patient-helpers';

/** Espacios de cultivo cedidos al paciente. */
export function PatientEspaciosCard({ patientId }: { patientId: string }) {
  const { data: espacios = [], isLoading } = usePatientEspacios(patientId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sprout className="h-5 w-5 text-muted-foreground" />
          Espacios de cultivo
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
          </div>
        ) : espacios.length === 0 ? (
          <p className="text-sm text-muted-foreground/70 py-4">
            Sin espacios asignados. Se ceden desde la sección Cultivo, con el paciente activo.
          </p>
        ) : (
          <div className="space-y-2">
            {espacios.map((e) => {
              const ubic = typeof e.ubicacion === 'object' ? e.ubicacion : null;
              return (
                <Link
                  key={e._id}
                  to={`/cultivo/espacios/${e._id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium font-mono">{e.codigo}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {e.flor} · {formatNumber(e.metrosCuadrados)} m²{ubic ? ` · ${ubic.nombre} (${ubic.codigo})` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge
                      label={ESPACIO_ESTADO_LABELS[e.estado] ?? e.estado}
                      variant={e.estado === 'activo' ? BADGE_COLORS.GREEN : BADGE_COLORS.MUTED}
                    />
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
