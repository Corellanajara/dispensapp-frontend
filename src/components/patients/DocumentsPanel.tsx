import { useState } from 'react';
import type { DocumentType, Patient, PatientDocument } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  CheckCircle2,
  Circle,
  Eye,
  FileCheck2,
  FileText,
  PenTool,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
  Upload,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { patientsAPI, openDocument, apiErrorMessage } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useAppConfig } from '@/hooks/use-app-config';
import {
  useReviewDocument,
  useUploadPatientDocument,
  useRequestPatientSignature,
  useRefreshSignature,
} from '@/hooks/use-patients';
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_VARIANTS,
  SIGNATURE_STATUS_LABELS,
  SIGNATURE_STATUS_VARIANTS,
} from '@/lib/constants';
import { formatDate, formatDateOnly, daysUntil, personName, toDateInputValue } from '@/lib/format';
import { BADGE_COLORS } from './patient-helpers';

const ALL_TYPES = Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[];

function ver(patientId: string, docId: string, firmado = false) {
  openDocument(() => patientsAPI.documentUrl(patientId, docId, firmado)).catch((err) =>
    toast.error(apiErrorMessage(err, 'No se pudo abrir el documento'))
  );
}

export function DocumentsPanel({ patient }: { patient: Patient }) {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const { documentosRequeridos } = useAppConfig();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTipo, setUploadTipo] = useState<DocumentType | ''>('');
  const [review, setReview] = useState<{ doc: PatientDocument; estado: 'aprobado' | 'rechazado' } | null>(null);

  const requestSignature = useRequestPatientSignature();
  const refreshSignature = useRefreshSignature();

  const docs = [...(patient.documentos ?? [])].sort(
    (a, b) => new Date(b.fechaSubida).getTime() - new Date(a.fechaSubida).getTime()
  );

  const abrirSubida = (tipo: DocumentType | '' = '') => {
    setUploadTipo(tipo);
    setUploadOpen(true);
  };

  return (
    <div className="space-y-5">
      {documentosRequeridos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Documentos exigidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {documentosRequeridos.map((req) => {
              const ok = cumple(patient, req.tipo, req.requiereFirma);
              return (
                <div key={req.tipo} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {ok ? (
                      <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                    ) : (
                      <Circle className={`h-5 w-5 shrink-0 ${req.bloqueaActivacion ? 'text-destructive' : 'text-muted-foreground'}`} />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {req.label}
                        {req.bloqueaActivacion && <span className="ml-2 text-xs text-destructive">obligatorio para activar</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {req.descripcion}
                        {req.requiereFirma && ' Requiere firma electrónica.'}
                      </p>
                    </div>
                  </div>
                  {!ok && (
                    <Button variant="outline" size="sm" onClick={() => abrirSubida(req.tipo)}>
                      <Upload className="h-4 w-4 mr-1" /> Subir
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Documentos subidos</CardTitle>
          <Button size="sm" onClick={() => abrirSubida()}>
            <Upload className="h-4 w-4 mr-2" />
            Subir documento
          </Button>
        </CardHeader>
        <CardContent>
          {docs.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground/70 py-12">No hay documentos registrados</p>
          ) : (
            <div className="space-y-3">
              {docs.map((doc) => {
                const req = documentosRequeridos.find((r) => r.tipo === doc.tipo);
                const firmable = !!req?.requiereFirma;
                const firmaEstado = doc.firma?.estado;
                const puedeEnviarFirma = firmable && firmaEstado !== 'enviado' && firmaEstado !== 'firmado';
                const dias = doc.tipo === 'receta_medica' ? daysUntil(doc.fechaVencimiento) : null;
                return (
                  <div key={doc._id} className="rounded-lg border p-3 space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3 min-w-0">
                        <FileText className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="min-w-0 space-y-0.5">
                          <p className="font-medium text-sm break-words">{doc.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {DOCUMENT_TYPE_LABELS[doc.tipo] ?? doc.tipo} · subido el {formatDate(doc.fechaSubida)}
                            {doc.subidoPor && typeof doc.subidoPor === 'object' && ` por ${personName(doc.subidoPor)}`}
                          </p>
                          {doc.tipo === 'receta_medica' && (
                            <p className={`text-xs ${dias !== null && dias < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                              Vence: {formatDateOnly(doc.fechaVencimiento)}
                              {dias !== null && dias < 0 && ' (vencida)'}
                            </p>
                          )}
                          {doc.revisadoPor && (
                            <p className="text-xs text-muted-foreground">
                              Revisado por {personName(doc.revisadoPor)}
                              {doc.fechaRevision && ` el ${formatDate(doc.fechaRevision)}`}
                            </p>
                          )}
                          {doc.observaciones && <p className="text-xs italic text-muted-foreground">“{doc.observaciones}”</p>}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 sm:justify-end shrink-0">
                        <StatusBadge
                          label={DOCUMENT_STATUS_LABELS[doc.estado] || doc.estado}
                          variant={DOCUMENT_STATUS_VARIANTS[doc.estado] || ''}
                        />
                        {firmable && (
                          <StatusBadge
                            label={firmaEstado ? `Firma: ${SIGNATURE_STATUS_LABELS[firmaEstado]}` : 'Sin firma'}
                            variant={firmaEstado ? SIGNATURE_STATUS_VARIANTS[firmaEstado] : BADGE_COLORS.MUTED}
                          />
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => ver(patient._id, doc._id)}>
                        <Eye className="h-4 w-4 mr-1" /> Ver
                      </Button>
                      {doc.firma?.archivoFirmado && (
                        <Button variant="outline" size="sm" onClick={() => ver(patient._id, doc._id, true)}>
                          <FileCheck2 className="h-4 w-4 mr-1" /> Ver firmado
                        </Button>
                      )}
                      {isAdmin && doc.estado !== 'aprobado' && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => setReview({ doc, estado: 'aprobado' })}
                        >
                          <ThumbsUp className="h-4 w-4 mr-1" /> Aprobar
                        </Button>
                      )}
                      {isAdmin && doc.estado !== 'rechazado' && (
                        <Button variant="outline" size="sm" onClick={() => setReview({ doc, estado: 'rechazado' })}>
                          <ThumbsDown className="h-4 w-4 mr-1" /> Rechazar
                        </Button>
                      )}
                      {isAdmin && doc.estado === 'aprobado' && doc.tipo === 'receta_medica' && (
                        <Button variant="ghost" size="sm" onClick={() => setReview({ doc, estado: 'aprobado' })}>
                          Corregir vencimiento
                        </Button>
                      )}
                      {puedeEnviarFirma && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={requestSignature.isPending}
                          onClick={() => requestSignature.mutate({ id: patient._id, docId: doc._id })}
                        >
                          <PenTool className="h-4 w-4 mr-1" /> Enviar a firma
                        </Button>
                      )}
                      {firmaEstado === 'enviado' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={refreshSignature.isPending}
                          onClick={() => refreshSignature.mutate({ id: patient._id, docId: doc._id })}
                        >
                          <RefreshCw className={`h-4 w-4 mr-1 ${refreshSignature.isPending ? 'animate-spin' : ''}`} />
                          Actualizar estado
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <UploadDialog
        patientId={patient._id}
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        initialTipo={uploadTipo}
      />
      <ReviewDialog patientId={patient._id} review={review} onClose={() => setReview(null)} />
    </div>
  );
}

/** true si hay un documento aprobado (y firmado si corresponde) de ese tipo. */
function cumple(patient: Patient, tipo: DocumentType, requiereFirma: boolean): boolean {
  if (tipo === 'receta_medica') return !!patient.recetaVigente;
  return (patient.documentos ?? []).some(
    (d) => d.tipo === tipo && d.estado === 'aprobado' && (!requiereFirma || d.firma?.estado === 'firmado')
  );
}

function UploadDialog({
  patientId,
  open,
  onOpenChange,
  initialTipo,
}: {
  patientId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialTipo: DocumentType | '';
}) {
  const { documentosRequeridos } = useAppConfig();
  const upload = useUploadPatientDocument();
  const [tipo, setTipo] = useState<DocumentType | ''>(initialTipo);
  const [nombre, setNombre] = useState('');
  const [vence, setVence] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [lastOpen, setLastOpen] = useState(open);

  // Reinicia el formulario cada vez que se abre
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setTipo(initialTipo);
      setNombre(initialTipo ? DOCUMENT_TYPE_LABELS[initialTipo] : '');
      setVence('');
      setFile(null);
    }
  }

  const req = documentosRequeridos.find((r) => r.tipo === tipo);
  const pideVencimiento = !!req?.requiereVencimiento;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipo || !nombre || !file) {
      toast.error('Completa tipo, nombre y archivo');
      return;
    }
    if (pideVencimiento && !vence) {
      toast.error('Indica la fecha de vencimiento');
      return;
    }
    const fd = new FormData();
    fd.append('archivo', file);
    fd.append('tipo', tipo);
    fd.append('nombre', nombre);
    if (vence) fd.append('fechaVencimiento', vence);
    upload.mutate({ id: patientId, formData: fd }, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Subir documento</DialogTitle>
          <DialogDescription>PDF, JPG o PNG de hasta 10 MB. Queda pendiente de revisión.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={tipo || null}
              onValueChange={(v: string | null) => {
                const t = (v || '') as DocumentType | '';
                setTipo(t);
                if (t && !nombre) setNombre(DOCUMENT_TYPE_LABELS[t]);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona el tipo">
                  {(v: string | null) => (v ? DOCUMENT_TYPE_LABELS[v as DocumentType] : 'Selecciona el tipo')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ALL_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {DOCUMENT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-nombre">Nombre</Label>
            <Input id="doc-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>
          {(pideVencimiento || tipo === 'receta_medica') && (
            <div className="space-y-2">
              <Label htmlFor="doc-vence">Fecha de vencimiento</Label>
              <Input id="doc-vence" type="date" value={vence} onChange={(e) => setVence(e.target.value)} required />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="doc-file">Archivo</Label>
            <Input
              id="doc-file"
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={upload.isPending}>
              {upload.isPending ? 'Subiendo…' : 'Subir'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReviewDialog({
  patientId,
  review,
  onClose,
}: {
  patientId: string;
  review: { doc: PatientDocument; estado: 'aprobado' | 'rechazado' } | null;
  onClose: () => void;
}) {
  const reviewDoc = useReviewDocument();
  const [observaciones, setObservaciones] = useState('');
  const [vence, setVence] = useState('');
  const [lastDoc, setLastDoc] = useState<string | null>(null);

  const key = review ? `${review.doc._id}-${review.estado}` : null;
  if (key !== lastDoc) {
    setLastDoc(key);
    if (review) {
      setObservaciones(review.doc.observaciones ?? '');
      setVence(toDateInputValue(review.doc.fechaVencimiento));
    }
  }

  const esReceta = review?.doc.tipo === 'receta_medica';
  const aprobar = review?.estado === 'aprobado';
  const vencida = esReceta && vence && daysUntil(vence) !== null && (daysUntil(vence) as number) < 0;

  const submit = () => {
    if (!review) return;
    if (aprobar && esReceta && !vence) {
      toast.error('Indica la fecha de vencimiento de la receta');
      return;
    }
    reviewDoc.mutate(
      {
        id: patientId,
        docId: review.doc._id,
        data: {
          estado: review.estado,
          observaciones: observaciones.trim() || undefined,
          fechaVencimiento: esReceta && vence ? vence : undefined,
        },
      },
      { onSuccess: onClose }
    );
  };

  return (
    <Dialog open={!!review} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{aprobar ? 'Aprobar documento' : 'Rechazar documento'}</DialogTitle>
          <DialogDescription>
            {review?.doc.nombre} · {review ? DOCUMENT_TYPE_LABELS[review.doc.tipo] : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {review && (
            <Button variant="outline" size="sm" onClick={() => ver(patientId, review.doc._id)}>
              <Eye className="h-4 w-4 mr-1" /> Ver documento antes de decidir
            </Button>
          )}
          {esReceta && (
            <div className="space-y-2">
              <Label htmlFor="rev-vence">Fecha de vencimiento</Label>
              <Input id="rev-vence" type="date" value={vence} onChange={(e) => setVence(e.target.value)} />
              {vencida && (
                <p className="flex items-center gap-1 text-xs text-warning">
                  <AlertTriangle className="h-3.5 w-3.5" /> Esta fecha ya pasó: la receta no quedará vigente.
                </p>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="rev-obs">Observaciones {aprobar ? '(opcional)' : ''}</Label>
            <Textarea
              id="rev-obs"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder={aprobar ? '' : 'Explica qué falta o qué hay que corregir'}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant={aprobar ? 'default' : 'destructive'}
            className={aprobar ? 'bg-green-600 hover:bg-green-700' : undefined}
            onClick={submit}
            disabled={reviewDoc.isPending}
          >
            {reviewDoc.isPending ? 'Guardando…' : aprobar ? 'Aprobar' : 'Rechazar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
