import { useState } from 'react';
import type { CertificateStatus, DocumentRequirement, PatientDocument } from '@/types';
import { patientPortalAPI, openDocument, apiErrorMessage, apiErrorCode } from '@/services/api';
import { CertificadoDialog } from '@/components/firma/CertificadoDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Upload,
  FileText,
  PenTool,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  ExternalLink,
  Loader2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatDateOnly, daysUntil } from '@/lib/format';

interface DocumentRequirementCardProps {
  requirement: DocumentRequirement;
  /** Documento más reciente del tipo requerido, si existe. */
  doc?: PatientDocument;
  /** Se llama después de subir, firmar o actualizar, para recargar el perfil. */
  onChanged: () => void;
}

type Estado = 'falta' | 'en_revision' | 'rechazado' | 'por_firmar' | 'firma_en_curso' | 'vencido' | 'completo';

function estadoDe(req: DocumentRequirement, doc?: PatientDocument): Estado {
  if (!doc) return 'falta';
  if (doc.estado === 'rechazado') return 'rechazado';
  if (req.requiereVencimiento) {
    const dias = daysUntil(doc.fechaVencimiento);
    if (dias !== null && dias < 0) return 'vencido';
  }
  if (req.requiereFirma && doc.firma?.estado !== 'firmado') {
    return doc.firma?.estado === 'enviado' ? 'firma_en_curso' : 'por_firmar';
  }
  if (doc.estado === 'pendiente') return 'en_revision';
  return 'completo';
}

const BADGES: Record<Estado, { label: string; className: string }> = {
  falta: { label: 'Falta subir', className: 'border-muted-foreground/30 text-muted-foreground' },
  en_revision: { label: 'En revisión', className: 'border-blue-500/30 text-blue-600 bg-blue-500/10' },
  rechazado: { label: 'Rechazado', className: 'border-destructive/30 text-destructive bg-destructive/10' },
  por_firmar: { label: 'Falta firmar', className: 'border-amber-500/30 text-amber-600 bg-amber-500/10' },
  firma_en_curso: { label: 'Firma en curso', className: 'border-blue-500/30 text-blue-600 bg-blue-500/10' },
  vencido: { label: 'Vencido', className: 'border-destructive/30 text-destructive bg-destructive/10' },
  completo: { label: 'Aprobado', className: 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10' },
};

export function DocumentRequirementCard({ requirement, doc, onChanged }: DocumentRequirementCardProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [busy, setBusy] = useState<null | 'upload' | 'sign' | 'refresh' | 'view' | 'restart'>(null);
  const [certOpen, setCertOpen] = useState(false);
  const [certEstado, setCertEstado] = useState<CertificateStatus | null>(null);

  const estado = estadoDe(requirement, doc);
  const badge = BADGES[estado];
  const completo = estado === 'completo';
  const firma = doc?.firma;
  const puedeFirmar =
    requirement.requiereFirma &&
    !!doc &&
    doc.estado !== 'rechazado' &&
    (!firma || ['rechazado', 'expirado', 'cancelado', 'error', 'pendiente'].includes(firma.estado));

  const handleUpload = async () => {
    if (!file) {
      toast.error('Selecciona un archivo');
      return;
    }
    if (requirement.requiereVencimiento && !fechaVencimiento) {
      toast.error('Indica la fecha de vencimiento');
      return;
    }
    setBusy('upload');
    try {
      const fd = new FormData();
      fd.append('archivo', file);
      fd.append('tipo', requirement.tipo);
      fd.append('nombre', requirement.label);
      if (fechaVencimiento) fd.append('fechaVencimiento', fechaVencimiento);
      await patientPortalAPI.uploadDocument(fd);
      toast.success(`${requirement.label} subido. El dispensario lo revisará.`);
      setShowUpload(false);
      setFile(null);
      setFechaVencimiento('');
      onChanged();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error al subir el documento'));
    } finally {
      setBusy(null);
    }
  };

  /** Pide la firma y lleva al paciente a Signapis. Si aún no tiene firma electrónica, abre el paso previo. */
  const handleSign = async (reiniciar = false) => {
    if (!doc) return;
    setBusy(reiniciar ? 'restart' : 'sign');
    try {
      const { data } = await patientPortalAPI.requestSignature(doc._id, reiniciar);
      if (data.firma?.signingUrl) {
        toast.success('Te llevamos a Signapis para firmar…');
        window.location.assign(data.firma.signingUrl);
        return;
      }
      toast.success(data.firma?.message || 'Solicitud de firma enviada');
      onChanged();
    } catch (err) {
      const codigo = apiErrorCode(err);
      if (codigo === 'REQUIERE_CERTIFICADO' || codigo === 'CERTIFICADO_EN_CURSO') {
        try {
          const { data } = await patientPortalAPI.certificate();
          setCertEstado(data);
        } catch {
          setCertEstado(null);
        }
        setCertOpen(true);
      } else {
        toast.error(apiErrorMessage(err, 'Error al solicitar la firma'));
      }
    } finally {
      setBusy(null);
    }
  };

  const handleRefresh = async () => {
    if (!doc) return;
    setBusy('refresh');
    try {
      const { data } = await patientPortalAPI.signatureStatus(doc._id);
      if (data.documento.firma?.estado === 'firmado') toast.success('Documento firmado');
      else toast.info('La firma sigue en curso');
      onChanged();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error al consultar la firma'));
    } finally {
      setBusy(null);
    }
  };

  const handleView = async (firmado = false) => {
    if (!doc) return;
    setBusy('view');
    try {
      await openDocument(() => patientPortalAPI.documentUrl(doc._id, firmado));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo abrir el documento'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        completo
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : estado === 'rechazado' || estado === 'vencido'
            ? 'border-destructive/30 bg-destructive/5'
            : doc
              ? 'border-amber-500/30 bg-amber-500/5'
              : 'border-muted-foreground/20 bg-muted/30'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              completo
                ? 'bg-emerald-500/10 text-emerald-600'
                : estado === 'rechazado' || estado === 'vencido'
                  ? 'bg-destructive/10 text-destructive'
                  : doc
                    ? 'bg-amber-500/10 text-amber-600'
                    : 'bg-muted text-muted-foreground'
            }`}
          >
            {completo ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : estado === 'rechazado' || estado === 'vencido' ? (
              <XCircle className="h-5 w-5" />
            ) : doc ? (
              <FileText className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 space-y-1">
            <h4 className="font-medium text-sm">{requirement.label}</h4>
            <p className="text-xs text-muted-foreground">{requirement.descripcion}</p>
            {doc && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileText className="h-3 w-3" />
                Subido el {formatDate(doc.fechaSubida)}
                {doc.fechaVencimiento && <> · vence el {formatDateOnly(doc.fechaVencimiento)}</>}
              </p>
            )}
            {doc?.estado === 'rechazado' && (
              <p className="text-xs text-destructive">
                Rechazado{doc.observaciones ? `: ${doc.observaciones}` : ''}. Sube una nueva versión.
              </p>
            )}
            {doc?.estado !== 'rechazado' && doc?.observaciones && (
              <p className="text-xs text-muted-foreground italic">Nota del dispensario: {doc.observaciones}</p>
            )}
            {firma?.estado === 'firmado' && (
              <p className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                <PenTool className="h-3 w-3" />
                Firmado{firma.firmadoPor ? ` por ${firma.firmadoPor}` : ''}
                {firma.fechaFirma ? ` el ${formatDate(firma.fechaFirma)}` : ''}
              </p>
            )}
            {firma && ['rechazado', 'expirado', 'cancelado', 'error'].includes(firma.estado) && (
              <p className="text-xs text-destructive">
                La firma no se completó{firma.mensaje ? `: ${firma.mensaje}` : ` (${firma.estado})`}. Puedes intentarlo de nuevo.
              </p>
            )}
            {firma?.estado === 'enviado' && (
              <p className="text-xs text-muted-foreground">
                Firma en curso: entra a Signapis, revisa el documento y fírmalo con tu clave y el código que te llega.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap sm:flex-col sm:items-end gap-2 shrink-0">
          <Badge variant="outline" className={badge.className}>
            {badge.label}
          </Badge>

          <div className="flex flex-wrap gap-2 sm:justify-end">
            {doc && (
              <Button size="sm" variant="ghost" onClick={() => handleView()} disabled={busy === 'view'}>
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                Ver
              </Button>
            )}
            {firma?.estado === 'firmado' && firma.archivoFirmado && (
              <Button size="sm" variant="ghost" onClick={() => handleView(true)} disabled={busy === 'view'}>
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                Ver firmado
              </Button>
            )}
            {puedeFirmar && (
              <Button size="sm" onClick={() => handleSign()} disabled={busy === 'sign'}>
                {busy === 'sign' ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <PenTool className="mr-1.5 h-3.5 w-3.5" />
                )}
                Firmar electrónicamente
              </Button>
            )}
            {firma?.estado === 'enviado' && (
              <>
                {firma.signingUrl && (
                  <Button size="sm" onClick={() => window.location.assign(firma.signingUrl!)}>
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    Continuar firma
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={handleRefresh} disabled={busy === 'refresh'}>
                  <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${busy === 'refresh' ? 'animate-spin' : ''}`} />
                  Actualizar estado
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleSign(true)} disabled={busy === 'restart'}>
                  {busy === 'restart' && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Nuevo enlace
                </Button>
              </>
            )}
            {!showUpload && (
              <Button size="sm" variant="outline" onClick={() => setShowUpload(true)}>
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                {doc ? 'Subir nueva versión' : 'Subir'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {showUpload && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-border/50 pt-4">
          <div className="space-y-1.5">
            <Label className="text-xs">{requirement.requiereFirma ? 'Archivo (PDF)' : 'Archivo (PDF, JPG o PNG)'}</Label>
            <Input
              type="file"
              accept={requirement.requiereFirma ? '.pdf,application/pdf' : '.pdf,.jpg,.jpeg,.png'}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="rounded-xl"
            />
          </div>
          {requirement.requiereVencimiento && (
            <div className="space-y-1.5">
              <Label className="text-xs">Fecha de vencimiento (obligatoria)</Label>
              <Input
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
                className="rounded-xl"
              />
            </div>
          )}
          <div className="flex gap-2 sm:col-span-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setShowUpload(false)} disabled={busy === 'upload'}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleUpload}
              disabled={busy === 'upload' || !file || (requirement.requiereVencimiento && !fechaVencimiento)}
            >
              {busy === 'upload' ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="mr-1.5 h-3.5 w-3.5" />
              )}
              Subir
            </Button>
          </div>
          {requirement.requiereFirma && (
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Súbelo en PDF. Después usa "Firmar electrónicamente" para completar este documento.
            </p>
          )}
        </div>
      )}

      <CertificadoDialog
        open={certOpen}
        onOpenChange={setCertOpen}
        estado={certEstado}
        modo="paciente"
        onSubmit={(data) => patientPortalAPI.requestCertificate(data).then((r) => r.data)}
      />
    </div>
  );
}
