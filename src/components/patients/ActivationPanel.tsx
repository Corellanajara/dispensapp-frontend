import { useState } from 'react';
import type { Patient, PatientStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, CheckCircle2, XCircle, PauseCircle, PlayCircle, ShieldCheck } from 'lucide-react';
import { useUpdatePatientStatus } from '@/hooks/use-patients';
import { formatDate, personName } from '@/lib/format';

interface Accion {
  estado: PatientStatus;
  titulo: string;
  descripcion: string;
  boton: string;
  destructiva?: boolean;
}

const ACCIONES: Record<string, Accion> = {
  activar: {
    estado: 'aprobado',
    titulo: 'Activar paciente',
    descripcion: 'El paciente podrá recibir dispensaciones. Quedará registrado que tú lo activaste.',
    boton: 'Activar',
  },
  rechazar: {
    estado: 'rechazado',
    titulo: 'Rechazar paciente',
    descripcion: 'El paciente no podrá recibir dispensaciones.',
    boton: 'Rechazar',
    destructiva: true,
  },
  suspender: {
    estado: 'suspendido',
    titulo: 'Suspender paciente',
    descripcion: 'Se bloquean las dispensaciones hasta que lo reactives.',
    boton: 'Suspender',
    destructiva: true,
  },
};

/** Requisitos de activación y acciones de estado. Solo para administradores. */
export function ActivationPanel({ patient }: { patient: Patient }) {
  const [accion, setAccion] = useState<Accion | null>(null);
  const [motivo, setMotivo] = useState('');
  const updateStatus = useUpdatePatientStatus();

  const bloqueantes = patient.requisitosActivacion?.bloqueantes ?? [];
  const advertencias = patient.requisitosActivacion?.advertencias ?? [];
  const sinSucursal = !patient.sucursal;
  const puedeActivar = bloqueantes.length === 0 && !sinSucursal;

  const abrir = (a: Accion) => {
    setMotivo('');
    setAccion(a);
  };

  const confirmar = () => {
    if (!accion) return;
    updateStatus.mutate(
      { id: patient._id, data: { estado: accion.estado, motivo: motivo.trim() || undefined } },
      { onSuccess: () => setAccion(null) }
    );
  };

  const activo = patient.estado === 'aprobado';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          Activación
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {patient.activadoPor && patient.fechaActivacion && (
          <p className="text-sm text-muted-foreground">
            Activado por <span className="text-foreground font-medium">{personName(patient.activadoPor)}</span> el{' '}
            {formatDate(patient.fechaActivacion)}
          </p>
        )}

        {!activo && (
          <div className="space-y-2">
            {sinSucursal && (
              <Requisito tipo="bloqueante" texto="Asignar un dispensario al paciente" />
            )}
            {bloqueantes.map((b) => (
              <Requisito key={b} tipo="bloqueante" texto={b} />
            ))}
            {advertencias.map((a) => (
              <Requisito key={a} tipo="advertencia" texto={a} />
            ))}
            {puedeActivar && advertencias.length === 0 && (
              <p className="flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" /> Todos los documentos están en regla.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {!activo && (
            <Button
              onClick={() => abrir(ACCIONES.activar)}
              disabled={!puedeActivar}
              className="bg-green-600 hover:bg-green-700"
              title={puedeActivar ? undefined : 'Faltan requisitos obligatorios'}
            >
              {patient.estado === 'suspendido' ? (
                <PlayCircle className="h-4 w-4 mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              {patient.estado === 'suspendido' ? 'Reactivar' : 'Activar'}
            </Button>
          )}
          {patient.estado === 'pendiente' && (
            <Button variant="destructive" onClick={() => abrir(ACCIONES.rechazar)}>
              <XCircle className="h-4 w-4 mr-2" />
              Rechazar
            </Button>
          )}
          {activo && (
            <Button variant="outline" onClick={() => abrir(ACCIONES.suspender)}>
              <PauseCircle className="h-4 w-4 mr-2" />
              Suspender
            </Button>
          )}
        </div>
        {!activo && !puedeActivar && (
          <p className="text-xs text-muted-foreground">
            Para activar, resuelve los puntos en rojo. Los puntos en ámbar solo son advertencias.
          </p>
        )}
      </CardContent>

      <Dialog open={!!accion} onOpenChange={(o) => !o && setAccion(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {accion?.estado === 'aprobado' && patient.estado === 'suspendido' ? 'Reactivar paciente' : accion?.titulo}
            </DialogTitle>
            <DialogDescription>{accion?.descripcion}</DialogDescription>
          </DialogHeader>
          {accion?.estado === 'aprobado' && advertencias.length > 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm">
              <p className="font-medium mb-1">Quedan advertencias:</p>
              <ul className="list-disc pl-5 text-muted-foreground">
                {advertencias.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo (opcional)</Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Queda en el historial del paciente"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccion(null)}>
              Cancelar
            </Button>
            <Button
              variant={accion?.destructiva ? 'destructive' : 'default'}
              onClick={confirmar}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending
                ? 'Guardando…'
                : accion?.estado === 'aprobado' && patient.estado === 'suspendido'
                  ? 'Reactivar'
                  : accion?.boton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Requisito({ tipo, texto }: { tipo: 'bloqueante' | 'advertencia'; texto: string }) {
  const bloq = tipo === 'bloqueante';
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
        bloq ? 'border-destructive/30 bg-destructive/5 text-destructive' : 'border-warning/30 bg-warning/5 text-warning'
      }`}
    >
      {bloq ? <XCircle className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />}
      <span>
        <span className="font-medium">{bloq ? 'Falta: ' : 'Advertencia: '}</span>
        {texto}
      </span>
    </div>
  );
}
