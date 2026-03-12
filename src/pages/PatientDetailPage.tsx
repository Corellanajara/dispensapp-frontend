import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { patientsAPI } from '@/services/api';
import type { Patient } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, CheckCircle, XCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { hasRole } = useAuth();

  useEffect(() => {
    const fetchPatient = async () => {
      if (!id) return;
      try {
        const { data } = await patientsAPI.get(id);
        setPatient(data);
      } catch {
        toast.error('Error al cargar paciente');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPatient();
  }, [id]);

  const handleStatusChange = async (estado: string) => {
    if (!id) return;
    try {
      const { data } = await patientsAPI.updateStatus(id, { estado });
      setPatient(data);
      toast.success(`Estado actualizado a ${estado}`);
    } catch {
      toast.error('Error al actualizar estado');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!patient) {
    return <div className="text-center py-20 text-muted-foreground">Paciente no encontrado</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/pacientes">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">
          {patient.nombre} {patient.apellido}
        </h1>
        <Badge
          className={
            patient.estado === 'aprobado'
              ? 'bg-green-100 text-green-800'
              : patient.estado === 'pendiente'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
          }
        >
          {patient.estado.charAt(0).toUpperCase() + patient.estado.slice(1)}
        </Badge>
      </div>

      {hasRole('admin') && patient.estado === 'pendiente' && (
        <div className="flex gap-2">
          <Button onClick={() => handleStatusChange('aprobado')} className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="h-4 w-4 mr-2" />
            Aprobar
          </Button>
          <Button onClick={() => handleStatusChange('rechazado')} variant="destructive">
            <XCircle className="h-4 w-4 mr-2" />
            Rechazar
          </Button>
        </div>
      )}

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Datos Personales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">RUT:</span>
                  <span className="font-mono">{patient.rut}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha Nacimiento:</span>
                  <span>{new Date(patient.fechaNacimiento).toLocaleDateString('es-CL')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Teléfono:</span>
                  <span>{patient.telefono}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span>{patient.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Límite Compra:</span>
                  <span>
                    {new Intl.NumberFormat('es-CL', {
                      style: 'currency',
                      currency: 'CLP',
                      minimumFractionDigits: 0,
                    }).format(patient.limiteCompra)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dirección</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Calle:</span>
                  <span>{patient.direccion.calle} {patient.direccion.numero}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Comuna:</span>
                  <span>{patient.direccion.comuna}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ciudad:</span>
                  <span>{patient.direccion.ciudad}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Región:</span>
                  <span>{patient.direccion.region}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Médico Tratante</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nombre:</span>
                  <span>{patient.medicoTratante?.nombre ?? '—'}</span>
                </div>
                {patient.medicoTratante.especialidad && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Especialidad:</span>
                    <span>{patient.medicoTratante.especialidad}</span>
                  </div>
                )}
                {patient.medicoTratante.telefono && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Teléfono:</span>
                    <span>{patient.medicoTratante.telefono}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documentos">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Documentos</CardTitle>
            </CardHeader>
            <CardContent>
              {patient.documentos.length === 0 ? (
                <p className="text-center text-muted-foreground py-10">
                  No hay documentos registrados
                </p>
              ) : (
                <div className="space-y-3">
                  {patient.documentos.map((doc) => (
                    <div
                      key={doc._id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{doc.nombre}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {doc.tipo.replace(/_/g, ' ')} • {new Date(doc.fechaSubida).toLocaleDateString('es-CL')}
                          </p>
                        </div>
                      </div>
                      <Badge
                        className={
                          doc.estado === 'aprobado'
                            ? 'bg-green-100 text-green-800'
                            : doc.estado === 'pendiente'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }
                      >
                        {doc.estado}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
