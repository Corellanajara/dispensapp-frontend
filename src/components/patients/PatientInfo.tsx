import { useState } from 'react';
import type { Patient } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdatePatient } from '@/hooks/use-patients';
import { formatDateOnly } from '@/lib/format';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

/** Datos personales, dirección, médico y límite mensual. */
export function PatientInfo({ patient }: { patient: Patient }) {
  const { hasRole } = useAuth();
  const puedeEditar = hasRole('admin', 'operador');
  const [editLimite, setEditLimite] = useState(false);
  const [limite, setLimite] = useState(String(patient.limiteMensualUnidades ?? 0));
  const update = useUpdatePatient();

  const guardarLimite = () => {
    const n = Math.max(parseInt(limite, 10) || 0, 0);
    update.mutate(
      { id: patient._id, data: { limiteMensualUnidades: n } },
      { onSuccess: () => setEditLimite(false) }
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Datos personales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="RUT">
            <span className="font-mono">{patient.rut}</span>
          </Row>
          {/* fechaNacimiento se guarda como fecha sin hora */}
          <Row label="Fecha de nacimiento">{formatDateOnly(patient.fechaNacimiento)}</Row>
          <Row label="Teléfono">{patient.telefono}</Row>
          <Row label="Email">{patient.email}</Row>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Límite de dispensación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {editLimite ? (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                value={limite}
                onChange={(e) => setLimite(e.target.value)}
                className="w-28"
                aria-label="Unidades por 30 días"
              />
              <span className="text-muted-foreground">unidades / 30 días</span>
              <Button size="sm" onClick={guardarLimite} disabled={update.isPending}>
                Guardar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditLimite(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">
                {patient.limiteMensualUnidades > 0
                  ? `${patient.limiteMensualUnidades} unidades cada 30 días`
                  : 'Sin límite'}
              </span>
              {puedeEditar && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setLimite(String(patient.limiteMensualUnidades ?? 0));
                    setEditLimite(true);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-1" /> Editar
                </Button>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Cuenta las unidades de las notas no anuladas de los últimos 30 días. 0 = sin límite.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dirección</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Calle">
            {patient.direccion?.calle} {patient.direccion?.numero}
          </Row>
          <Row label="Comuna">{patient.direccion?.comuna}</Row>
          <Row label="Ciudad">{patient.direccion?.ciudad}</Row>
          <Row label="Región">{patient.direccion?.region}</Row>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Médico tratante</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Nombre">{patient.medicoTratante?.nombre ?? '—'}</Row>
          {patient.medicoTratante?.especialidad && <Row label="Especialidad">{patient.medicoTratante.especialidad}</Row>}
          {patient.medicoTratante?.telefono && <Row label="Teléfono">{patient.medicoTratante.telefono}</Row>}
        </CardContent>
      </Card>

      {patient.observaciones && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Observaciones</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{patient.observaciones}</CardContent>
        </Card>
      )}
    </div>
  );
}
