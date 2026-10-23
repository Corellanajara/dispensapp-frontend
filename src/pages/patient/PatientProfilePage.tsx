import { useEffect, useState, useCallback } from 'react';
import { patientPortalAPI, openDocument, apiErrorMessage } from '@/services/api';
import type { DocumentType, Patient, PatientDocument } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Edit,
  Save,
  X,
  Upload,
  FileText,
  Loader2,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Eye,
  CalendarClock,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  PATIENT_STATUS_LABELS,
  PATIENT_STATUS_VARIANTS,
  SUSPENSION_REASON_LABELS,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_VARIANTS,
} from '@/lib/constants';
import { formatDateShort, formatDateOnly } from '@/lib/format';
import { useAppConfig } from '@/hooks/use-app-config';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DocumentRequirementCard } from '@/components/shared/DocumentRequirementCard';
import { PatientQRCode } from '@/components/shared/PatientQRCode';
import { PatientStatusBanner } from '@/components/portal/PatientStatusBanner';
import { sucursalDe, documentoPara, estadoReceta } from '@/components/portal/portal-helpers';
import { Badge } from '@/components/ui/badge';

const TIPOS_DOCUMENTO = Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[];

export function PatientProfilePage() {
  const config = useAppConfig();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Edición
  const [editingPhone, setEditingPhone] = useState(false);
  const [telefono, setTelefono] = useState('');
  const [editingAddress, setEditingAddress] = useState(false);
  const [direccion, setDireccion] = useState({ calle: '', numero: '', comuna: '', ciudad: '', region: '' });
  const [editingDoctor, setEditingDoctor] = useState(false);
  const [medicoTratante, setMedicoTratante] = useState({ nombre: '', especialidad: '', telefono: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Subida genérica
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadTipo, setUploadTipo] = useState<DocumentType | ''>('');
  const [uploadNombre, setUploadNombre] = useState('');
  const [uploadVencimiento, setUploadVencimiento] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const resetForms = (data: Patient) => {
    setTelefono(data.telefono || '');
    setDireccion({
      calle: data.direccion?.calle || '',
      numero: data.direccion?.numero || '',
      comuna: data.direccion?.comuna || '',
      ciudad: data.direccion?.ciudad || '',
      region: data.direccion?.region || '',
    });
    setMedicoTratante({
      nombre: data.medicoTratante?.nombre || '',
      especialidad: data.medicoTratante?.especialidad || '',
      telefono: data.medicoTratante?.telefono || '',
    });
  };

  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await patientPortalAPI.getProfile();
      setPatient(data);
      resetForms(data);
    } catch {
      toast.error('Error al cargar perfil');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const saveProfile = async (data: Record<string, unknown>, done: () => void, msg: string) => {
    setIsSaving(true);
    try {
      await patientPortalAPI.updateProfile(data);
      // PUT /me no devuelve el dispensario poblado: se recarga el perfil completo
      await fetchProfile();
      done();
      toast.success(msg);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error al actualizar'));
    } finally {
      setIsSaving(false);
    }
  };

  const requiereVencimientoGenerico =
    !!uploadTipo && config.documentosRequeridos.some((r) => r.tipo === uploadTipo && r.requiereVencimiento);

  const handleUpload = async () => {
    if (!uploadFile || !uploadTipo || !uploadNombre) {
      toast.error('Completa todos los campos');
      return;
    }
    if (requiereVencimientoGenerico && !uploadVencimiento) {
      toast.error('Indica la fecha de vencimiento');
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('archivo', uploadFile);
      formData.append('tipo', uploadTipo);
      formData.append('nombre', uploadNombre);
      if (uploadVencimiento) formData.append('fechaVencimiento', uploadVencimiento);
      await patientPortalAPI.uploadDocument(formData);
      await fetchProfile();
      setIsUploadOpen(false);
      setUploadTipo('');
      setUploadNombre('');
      setUploadVencimiento('');
      setUploadFile(null);
      toast.success('Documento subido. El dispensario lo revisará.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error al subir documento'));
    } finally {
      setIsUploading(false);
    }
  };

  const verDocumento = async (doc: PatientDocument) => {
    try {
      await openDocument(() => patientPortalAPI.documentUrl(doc._id));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo abrir el documento'));
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
    return <div className="text-center py-20 text-muted-foreground">No se encontró el perfil</div>;
  }

  const requeridos = config.documentosRequeridos;
  const tiposRequeridos = new Set(requeridos.map((r) => r.tipo));
  const requisitos = patient.requisitosActivacion;
  const faltantes = [...(requisitos?.bloqueantes ?? []), ...(requisitos?.advertencias ?? [])];
  const otrosDocumentos = (patient.documentos || []).filter((d) => !tiposRequeridos.has(d.tipo));
  const sucursal = sucursalDe(patient);
  const receta = estadoReceta(patient, config.diasAvisoReceta);

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader title="Mi Perfil" />

      <PatientStatusBanner patient={patient} diasAviso={config.diasAvisoReceta} sinEnlacePerfil />

      <Card>
        <CardHeader>
          <CardTitle>Estado de tu cuenta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge label={PATIENT_STATUS_LABELS[patient.estado]} variant={PATIENT_STATUS_VARIANTS[patient.estado]} />
            {patient.estado === 'suspendido' && patient.motivoSuspension && (
              <span className="text-sm text-muted-foreground">
                Motivo: {SUSPENSION_REASON_LABELS[patient.motivoSuspension] ?? patient.motivoSuspension}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-sm">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5" /> Receta vigente
              </p>
              {receta.tipo === 'sin_receta' ? (
                <p className="font-medium text-destructive">Sin receta vigente</p>
              ) : (
                <p className={`font-medium ${receta.tipo === 'por_vencer' ? 'text-amber-600' : ''}`}>
                  Hasta el {formatDateOnly(receta.fecha)}
                  {receta.tipo === 'por_vencer' && ` (${receta.dias} día${receta.dias === 1 ? '' : 's'})`}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Límite de retiro</p>
              <p className="font-medium">
                {patient.limiteMensualUnidades > 0
                  ? `${patient.limiteMensualUnidades} unidades cada 30 días`
                  : 'Sin límite'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Mi dispensario
              </p>
              {sucursal ? (
                <div>
                  <p className="font-medium">{sucursal.nombre}</p>
                  {sucursal.direccion && (
                    <p className="text-xs text-muted-foreground">
                      {[sucursal.direccion.calle, sucursal.direccion.numero].filter(Boolean).join(' ')}
                      {sucursal.direccion.comuna ? `, ${sucursal.direccion.comuna}` : ''}
                    </p>
                  )}
                  {sucursal.horarioAtencion && (
                    <p className="text-xs text-muted-foreground">{sucursal.horarioAtencion}</p>
                  )}
                  {sucursal.telefono && <p className="text-xs text-muted-foreground">{sucursal.telefono}</p>}
                </div>
              ) : (
                <p className="font-medium text-muted-foreground">Sin asignar. Contacta al dispensario.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-500" />
              Documentos requeridos
            </CardTitle>
            {requisitos && (
              <Badge
                variant="outline"
                className={
                  faltantes.length === 0
                    ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10'
                    : 'border-amber-500/30 text-amber-600 bg-amber-500/10'
                }
              >
                {faltantes.length === 0 ? 'Completos' : `${faltantes.length} pendiente${faltantes.length === 1 ? '' : 's'}`}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Sube cada documento. El reglamento interno y el mandato o contrato se firman electrónicamente. El
            administrador del dispensario revisa y aprueba cada uno.
          </p>
          {faltantes.length > 0 ? (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Falta: {faltantes.join(', ')}.</span>
            </div>
          ) : requisitos ? (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Todos tus documentos están aprobados.</span>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {config.isLoading && requeridos.length === 0 ? (
            <div className="h-24 animate-pulse bg-muted rounded-xl" />
          ) : (
            requeridos.map((req) => (
              <DocumentRequirementCard
                key={req.tipo}
                requirement={req}
                doc={documentoPara(patient, req.tipo)}
                onChanged={fetchProfile}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Otros documentos</CardTitle>
          <Button size="sm" onClick={() => setIsUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Subir documento
          </Button>
        </CardHeader>
        <CardContent>
          {otrosDocumentos.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">No tienes otros documentos subidos</p>
          ) : (
            <div className="space-y-3">
              {otrosDocumentos.map((doc) => (
                <div key={doc._id} className="flex items-center justify-between gap-3 p-4 border border-border/60 rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{doc.nombre}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{DOCUMENT_TYPE_LABELS[doc.tipo] || doc.tipo}</span>
                        <span>•</span>
                        <span>{formatDateShort(doc.fechaSubida)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge
                      label={DOCUMENT_STATUS_LABELS[doc.estado] || doc.estado}
                      variant={DOCUMENT_STATUS_VARIANTS[doc.estado] || ''}
                    />
                    <Button size="sm" variant="ghost" onClick={() => verDocumento(doc)}>
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mi código QR</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Muestra este código en el dispensario para que puedan identificarte y ver tus solicitudes rápidamente.
          </p>
          <PatientQRCode patient={patient} size={200} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Datos personales</CardTitle>
          {!editingPhone && (
            <Button variant="ghost" size="sm" onClick={() => setEditingPhone(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar teléfono
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Nombre</Label>
              <p className="font-medium">{patient.nombre}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Apellido</Label>
              <p className="font-medium">{patient.apellido}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">RUT</Label>
              <p className="font-medium">{patient.rut}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Email</Label>
              <p className="font-medium">{patient.email}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Fecha de nacimiento</Label>
              <p className="font-medium">{formatDateOnly(patient.fechaNacimiento)}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Teléfono</Label>
              {editingPhone ? (
                <div className="flex items-center gap-2">
                  <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} className="h-9 rounded-xl" />
                  <Button
                    size="sm"
                    className="h-9"
                    disabled={isSaving}
                    onClick={() => saveProfile({ telefono }, () => setEditingPhone(false), 'Teléfono actualizado')}
                  >
                    <Save className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9"
                    onClick={() => {
                      setEditingPhone(false);
                      setTelefono(patient.telefono || '');
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <p className="font-medium">{patient.telefono}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Dirección</CardTitle>
          {!editingAddress ? (
            <Button variant="ghost" size="sm" onClick={() => setEditingAddress(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={isSaving}
                onClick={() => saveProfile({ direccion }, () => setEditingAddress(false), 'Dirección actualizada')}
              >
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingAddress(false);
                  resetForms(patient);
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {editingAddress ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {(['calle', 'numero', 'comuna', 'ciudad', 'region'] as const).map((campo) => (
                <div key={campo} className={`space-y-2 ${campo === 'region' ? 'md:col-span-2' : ''}`}>
                  <Label>
                    {{ calle: 'Calle', numero: 'Número', comuna: 'Comuna', ciudad: 'Ciudad', region: 'Región' }[campo]}
                  </Label>
                  <Input
                    value={direccion[campo]}
                    onChange={(e) => setDireccion({ ...direccion, [campo]: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Calle:</span>
                <span>
                  {patient.direccion?.calle} {patient.direccion?.numero}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Comuna:</span>
                <span>{patient.direccion?.comuna}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ciudad:</span>
                <span>{patient.direccion?.ciudad}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Región:</span>
                <span>{patient.direccion?.region}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Médico tratante</CardTitle>
          {!editingDoctor ? (
            <Button variant="ghost" size="sm" onClick={() => setEditingDoctor(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={isSaving}
                onClick={() =>
                  saveProfile({ medicoTratante }, () => setEditingDoctor(false), 'Médico tratante actualizado')
                }
              >
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingDoctor(false);
                  resetForms(patient);
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {editingDoctor ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2 md:col-span-2">
                <Label>Nombre</Label>
                <Input
                  value={medicoTratante.nombre}
                  onChange={(e) => setMedicoTratante({ ...medicoTratante, nombre: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Especialidad</Label>
                <Input
                  value={medicoTratante.especialidad}
                  onChange={(e) => setMedicoTratante({ ...medicoTratante, especialidad: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={medicoTratante.telefono}
                  onChange={(e) => setMedicoTratante({ ...medicoTratante, telefono: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nombre:</span>
                <span>{patient.medicoTratante?.nombre}</span>
              </div>
              {patient.medicoTratante?.especialidad && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Especialidad:</span>
                  <span>{patient.medicoTratante.especialidad}</span>
                </div>
              )}
              {patient.medicoTratante?.telefono && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Teléfono:</span>
                  <span>{patient.medicoTratante.telefono}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Subir documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de documento</Label>
              <Select value={uploadTipo} onValueChange={(v: string | null) => setUploadTipo((v as DocumentType) || '')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar tipo...">
                    {(v: string) => (v ? DOCUMENT_TYPE_LABELS[v as DocumentType] ?? v : 'Seleccionar tipo...')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_DOCUMENTO.map((k) => (
                    <SelectItem key={k} value={k}>
                      {DOCUMENT_TYPE_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nombre del documento</Label>
              <Input
                value={uploadNombre}
                onChange={(e) => setUploadNombre(e.target.value)}
                placeholder="Ej: Cédula de identidad"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha de vencimiento {requiereVencimientoGenerico ? '(obligatoria)' : '(opcional)'}</Label>
              <Input
                type="date"
                value={uploadVencimiento}
                onChange={(e) => setUploadVencimiento(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Archivo</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="rounded-xl"
              />
            </div>
            <Separator />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleUpload}
                disabled={
                  isUploading ||
                  !uploadFile ||
                  !uploadTipo ||
                  !uploadNombre ||
                  (requiereVencimientoGenerico && !uploadVencimiento)
                }
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Subir
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
