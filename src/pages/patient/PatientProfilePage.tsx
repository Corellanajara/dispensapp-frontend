import { useEffect, useState, useCallback, useRef } from 'react';
import { patientPortalAPI } from '@/services/api';
import type { Patient, PatientDocument } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Edit, Save, X, Upload, FileText, Loader2, Shield, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { PATIENT_STATUS_LABELS, PATIENT_STATUS_VARIANTS, DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_VARIANTS } from '@/lib/constants';
import { REQUIRED_PATIENT_DOCUMENTS } from '@/lib/patient-documents';
import { getSignatureData, saveSignature, isDocumentSigned } from '@/lib/signatures';
import { formatCurrency, formatDateShort } from '@/lib/format';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SignatureModal } from '@/components/shared/SignatureModal';
import { DocumentRequirementCard } from '@/components/shared/DocumentRequirementCard';
import { Badge } from '@/components/ui/badge';

export function PatientProfilePage() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Edit states
  const [editingPhone, setEditingPhone] = useState(false);
  const [telefono, setTelefono] = useState('');
  const [editingAddress, setEditingAddress] = useState(false);
  const [direccion, setDireccion] = useState({
    calle: '',
    numero: '',
    comuna: '',
    ciudad: '',
    region: '',
  });
  const [editingDoctor, setEditingDoctor] = useState(false);
  const [medicoTratante, setMedicoTratante] = useState({
    nombre: '',
    especialidad: '',
    telefono: '',
  });

  // Upload dialog
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadTipo, setUploadTipo] = useState('');
  const [uploadNombre, setUploadNombre] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [signingDoc, setSigningDoc] = useState<string | null>(null);
  const [uploadingLegalDoc, setUploadingLegalDoc] = useState<string | null>(null);
  const [pendingRequirementId, setPendingRequirementId] = useState<string | null>(null);
  const legalFileRef = useRef<HTMLInputElement>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await patientPortalAPI.getProfile();
      setPatient(data);
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
    } catch {
      toast.error('Error al cargar perfil');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSavePhone = async () => {
    setIsSaving(true);
    try {
      const { data } = await patientPortalAPI.updateProfile({ telefono });
      setPatient(data);
      setEditingPhone(false);
      toast.success('Teléfono actualizado');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Error al actualizar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAddress = async () => {
    setIsSaving(true);
    try {
      const { data } = await patientPortalAPI.updateProfile({ direccion });
      setPatient(data);
      setEditingAddress(false);
      toast.success('Dirección actualizada');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Error al actualizar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDoctor = async () => {
    setIsSaving(true);
    try {
      const { data } = await patientPortalAPI.updateProfile({ medicoTratante });
      setPatient(data);
      setEditingDoctor(false);
      toast.success('Médico tratante actualizado');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Error al actualizar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadTipo || !uploadNombre) {
      toast.error('Completa todos los campos');
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('archivo', uploadFile);
      formData.append('tipo', uploadTipo);
      formData.append('nombre', uploadNombre);
      const { data } = await patientPortalAPI.uploadDocument(formData);
      setPatient(data);
      setIsUploadOpen(false);
      setUploadTipo('');
      setUploadNombre('');
      setUploadFile(null);
      toast.success('Documento subido exitosamente');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Error al subir documento');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLegalUpload = (requirementId: string) => {
    setPendingRequirementId(requirementId);
    legalFileRef.current?.click();
  };

  const handleLegalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingRequirementId) return;

    setUploadingLegalDoc(pendingRequirementId);
    try {
      const formData = new FormData();
      formData.append('archivo', file);
      formData.append('tipo', 'otro');
      formData.append('nombre', pendingRequirementId);
      const { data } = await patientPortalAPI.uploadDocument(formData);
      setPatient(data);
      toast.success('Documento subido correctamente');
    } catch {
      toast.error('Error al subir el documento');
    } finally {
      setUploadingLegalDoc(null);
      setPendingRequirementId(null);
      e.target.value = '';
    }
  };

  const handleLegalSign = (data: { nombre: string; rut: string }) => {
    if (!signingDoc) return;
    saveSignature(signingDoc, data);
    setSigningDoc(null);
    toast.success('Documento firmado correctamente');
  };

  const completedLegalDocs = patient
    ? REQUIRED_PATIENT_DOCUMENTS.filter((req) => {
        const uploaded = patient.documentos?.find((d) => d.nombre === req.id);
        return uploaded && isDocumentSigned(req.id);
      })
    : [];
  const totalRequired = REQUIRED_PATIENT_DOCUMENTS.length;
  const allLegalComplete = completedLegalDocs.length === totalRequired;

  const signingDocLabel = signingDoc
    ? REQUIRED_PATIENT_DOCUMENTS.find((r) => r.id === signingDoc)?.label ?? ''
    : '';

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

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader title="Mi Perfil" />

      <Card>
        <CardHeader>
          <CardTitle>Estado de Cuenta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <StatusBadge label={PATIENT_STATUS_LABELS[patient.estado]} variant={PATIENT_STATUS_VARIANTS[patient.estado]} />
          </div>
          <p className="text-sm text-muted-foreground">
            {patient.estado === 'aprobado'
              ? 'Tu cuenta está activa. Puedes realizar pedidos.'
              : patient.estado === 'pendiente'
                ? 'Tu cuenta está siendo revisada por nuestro equipo.'
                : patient.estado === 'rechazado'
                  ? 'Tu cuenta ha sido rechazada. Contacta al dispensario para más información.'
                  : 'Tu cuenta está suspendida. Contacta al dispensario para más información.'}
          </p>
          {patient.limiteCompra > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Límite de compra:</span>
              <span className="font-medium">{formatCurrency(patient.limiteCompra)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Datos Personales</CardTitle>
          {!editingPhone && (
            <Button variant="ghost" size="sm" onClick={() => setEditingPhone(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar Teléfono
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
              <Label className="text-muted-foreground text-xs">Fecha de Nacimiento</Label>
              <p className="font-medium">{formatDateShort(patient.fechaNacimiento)}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Teléfono</Label>
              {editingPhone ? (
                <div className="flex items-center gap-2">
                  <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} className="h-9 rounded-xl" />
                  <Button size="sm" className="h-9" onClick={handleSavePhone} disabled={isSaving}>
                    <Save className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-9" onClick={() => { setEditingPhone(false); setTelefono(patient.telefono || ''); }}>
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
              <Button size="sm" onClick={handleSaveAddress} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => {
                setEditingAddress(false);
                setDireccion({
                  calle: patient.direccion?.calle || '',
                  numero: patient.direccion?.numero || '',
                  comuna: patient.direccion?.comuna || '',
                  ciudad: patient.direccion?.ciudad || '',
                  region: patient.direccion?.region || '',
                });
              }}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {editingAddress ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label>Calle</Label>
                <Input value={direccion.calle} onChange={(e) => setDireccion({ ...direccion, calle: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Número</Label>
                <Input value={direccion.numero} onChange={(e) => setDireccion({ ...direccion, numero: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Comuna</Label>
                <Input value={direccion.comuna} onChange={(e) => setDireccion({ ...direccion, comuna: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Ciudad</Label>
                <Input value={direccion.ciudad} onChange={(e) => setDireccion({ ...direccion, ciudad: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Región</Label>
                <Input value={direccion.region} onChange={(e) => setDireccion({ ...direccion, region: e.target.value })} className="rounded-xl" />
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Calle:</span>
                <span>{patient.direccion?.calle} {patient.direccion?.numero}</span>
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
          <CardTitle>Médico Tratante</CardTitle>
          {!editingDoctor ? (
            <Button variant="ghost" size="sm" onClick={() => setEditingDoctor(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveDoctor} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => {
                setEditingDoctor(false);
                setMedicoTratante({
                  nombre: patient.medicoTratante?.nombre || '',
                  especialidad: patient.medicoTratante?.especialidad || '',
                  telefono: patient.medicoTratante?.telefono || '',
                });
              }}>
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
                <Input value={medicoTratante.nombre} onChange={(e) => setMedicoTratante({ ...medicoTratante, nombre: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Especialidad</Label>
                <Input value={medicoTratante.especialidad} onChange={(e) => setMedicoTratante({ ...medicoTratante, especialidad: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={medicoTratante.telefono} onChange={(e) => setMedicoTratante({ ...medicoTratante, telefono: e.target.value })} className="rounded-xl" />
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-500" />
              Documentos Legales
            </CardTitle>
            <Badge
              variant="outline"
              className={
                allLegalComplete
                  ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10'
                  : 'border-amber-500/30 text-amber-600 bg-amber-500/10'
              }
            >
              {completedLegalDocs.length} de {totalRequired} completados
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Debes subir y firmar los siguientes documentos para realizar pedidos
          </p>
          {!allLegalComplete && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Completa todos los documentos legales para poder realizar pedidos.</span>
            </div>
          )}
          {allLegalComplete && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Todos los documentos están completos. Puedes realizar pedidos.</span>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-5">
          {REQUIRED_PATIENT_DOCUMENTS.map((req) => {
            const uploadedDoc = patient.documentos?.find((d) => d.nombre === req.id);
            const sigData = getSignatureData(req.id);
            return (
              <DocumentRequirementCard
                key={req.id}
                requirement={req}
                uploadedDoc={uploadedDoc}
                signatureData={sigData}
                onUpload={() => handleLegalUpload(req.id)}
                onSign={() => setSigningDoc(req.id)}
                isUploading={uploadingLegalDoc === req.id}
              />
            );
          })}
        </CardContent>
      </Card>

      <input
        ref={legalFileRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        onChange={handleLegalFileChange}
      />

      <SignatureModal
        open={!!signingDoc}
        onOpenChange={(open) => { if (!open) setSigningDoc(null); }}
        documentLabel={signingDocLabel}
        onSign={handleLegalSign}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Documentos</CardTitle>
          <Button size="sm" onClick={() => setIsUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Subir Documento
          </Button>
        </CardHeader>
        <CardContent>
          {patient.documentos.filter((d) => !REQUIRED_PATIENT_DOCUMENTS.some((r) => r.id === d.nombre)).length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">No tienes documentos subidos</p>
          ) : (
            <div className="space-y-3">
              {patient.documentos.filter((d) => !REQUIRED_PATIENT_DOCUMENTS.some((r) => r.id === d.nombre)).map((doc: PatientDocument) => (
                <div key={doc._id} className="flex items-center justify-between p-4 border border-border/60 rounded-xl">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="font-medium text-sm">{doc.nombre}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{DOCUMENT_TYPE_LABELS[doc.tipo] || doc.tipo}</span>
                        <span>•</span>
                        <span>{formatDateShort(doc.fechaSubida)}</span>
                      </div>
                    </div>
                  </div>
                  <StatusBadge label={DOCUMENT_STATUS_LABELS[doc.estado] || doc.estado} variant={DOCUMENT_STATUS_VARIANTS[doc.estado] || ''} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Subir Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Documento</Label>
              <Select value={uploadTipo} onValueChange={(v: string | null) => setUploadTipo(v || '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nombre del Documento</Label>
              <Input
                value={uploadNombre}
                onChange={(e) => setUploadNombre(e.target.value)}
                placeholder="Ej: Receta Dr. Pérez - Marzo 2026"
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
              <Button variant="outline" onClick={() => setIsUploadOpen(false)}>Cancelar</Button>
              <Button onClick={handleUpload} disabled={isUploading || !uploadFile || !uploadTipo || !uploadNombre}>
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
