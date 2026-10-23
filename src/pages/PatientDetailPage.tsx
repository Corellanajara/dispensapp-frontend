import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, QrCode, FolderOpen, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppConfig } from '@/hooks/use-app-config';
import { usePatient } from '@/hooks/use-patients';
import { PatientQRCode } from '@/components/shared/PatientQRCode';
import { PatientStatusBadge, RecetaBadge, SucursalBadge } from '@/components/patients/PatientBadges';
import { ActivationPanel } from '@/components/patients/ActivationPanel';
import { DocumentsPanel } from '@/components/patients/DocumentsPanel';
import { StatusHistory } from '@/components/patients/StatusHistory';
import { PatientOrdersList } from '@/components/patients/PatientOrdersList';
import { PatientEspaciosCard } from '@/components/patients/PatientEspaciosCard';
import { PatientInfo } from '@/components/patients/PatientInfo';
import { SucursalAssign } from '@/components/patients/SucursalAssign';
import { ORDERS_LABEL } from '@/lib/constants';

export function PatientDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { data: patient, isLoading, isError } = usePatient(id);
  const [isQROpen, setIsQROpen] = useState(false);
  const { hasRole } = useAuth();
  const { diasAvisoReceta } = useAppConfig();
  const isAdmin = hasRole('admin');

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (isError || !patient) {
    return <div className="text-center py-20 text-muted-foreground">Paciente no encontrado o sin acceso</div>;
  }

  const pendientesRevision = patient.documentos.filter((d) => d.estado === 'pendiente').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/pacientes">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold">
            {patient.nombre} {patient.apellido}
          </h1>
          <PatientStatusBadge patient={patient} />
          <div className="flex gap-2 sm:ml-auto">
            <Link to={`/pacientes/${patient._id}/expediente`}>
              <Button variant="outline" size="sm">
                <FolderOpen className="h-4 w-4 mr-2" />
                Expediente
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => setIsQROpen(true)}>
              <QrCode className="h-4 w-4 mr-2" />
              Código QR
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="flex items-center gap-2">
            <span className="text-muted-foreground">RUT</span>
            <span className="font-mono">{patient.rut}</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="text-muted-foreground">Dispensario</span>
            <SucursalBadge patient={patient} />
          </span>
          <span className="flex items-center gap-2">
            <span className="text-muted-foreground">Receta</span>
            <RecetaBadge patient={patient} diasAviso={diasAvisoReceta} />
          </span>
          {isAdmin && patient.sucursal && <SucursalAssign patient={patient} />}
        </div>
      </div>

      {!patient.sucursal &&
        (isAdmin ? (
          <SucursalAssign patient={patient} />
        ) : (
          <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/5 p-4 text-sm">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
            Este paciente no tiene dispensario asignado. Pide a un administrador que lo asigne.
          </div>
        ))}

      {patient.estado === 'suspendido' && patient.motivoSuspension === 'receta_vencida' && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <span>
            Suspendido automáticamente porque su receta venció. Al aprobar una receta nueva y vigente se reactiva solo.
          </span>
        </div>
      )}

      <Dialog open={isQROpen} onOpenChange={setIsQROpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Código QR del paciente</DialogTitle>
            <DialogDescription>
              Al escanearlo, el personal del dispensario abre esta ficha. Los espacios de cultivo tienen su propio QR.
            </DialogDescription>
          </DialogHeader>
          <PatientQRCode patient={patient} />
        </DialogContent>
      </Dialog>

      {isAdmin && <ActivationPanel patient={patient} />}

      <Tabs defaultValue={pendientesRevision > 0 && isAdmin ? 'documentos' : 'info'}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="documentos">
            Documentos{pendientesRevision > 0 ? ` (${pendientesRevision} por revisar)` : ''}
          </TabsTrigger>
          <TabsTrigger value="notas">{ORDERS_LABEL}</TabsTrigger>
          <TabsTrigger value="cultivo">Cultivo</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-5">
          <PatientInfo patient={patient} />
        </TabsContent>

        <TabsContent value="documentos">
          <DocumentsPanel patient={patient} />
        </TabsContent>

        <TabsContent value="notas">
          <PatientOrdersList patientId={patient._id} />
        </TabsContent>

        <TabsContent value="cultivo">
          <PatientEspaciosCard patientId={patient._id} />
        </TabsContent>

        <TabsContent value="historial">
          <StatusHistory patient={patient} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
