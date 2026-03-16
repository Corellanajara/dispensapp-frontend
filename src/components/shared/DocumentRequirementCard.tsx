import type { RequiredDocument } from '@/lib/patient-documents';
import type { PatientDocument } from '@/types';
import type { SignatureData } from '@/lib/signatures';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  FileText,
  PenTool,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { formatDate } from '@/lib/format';

interface DocumentRequirementCardProps {
  requirement: RequiredDocument;
  uploadedDoc?: PatientDocument;
  signatureData?: SignatureData | null;
  onUpload: () => void;
  onSign: () => void;
  isUploading?: boolean;
}

export function DocumentRequirementCard({
  requirement,
  uploadedDoc,
  signatureData,
  onUpload,
  onSign,
  isUploading,
}: DocumentRequirementCardProps) {
  const isUploaded = !!uploadedDoc;
  const isSigned = !!signatureData;
  const isComplete = isUploaded && isSigned;

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        isComplete
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : isUploaded
            ? 'border-amber-500/30 bg-amber-500/5'
            : 'border-muted-foreground/20 bg-muted/30'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              isComplete
                ? 'bg-emerald-500/10 text-emerald-600'
                : isUploaded
                  ? 'bg-amber-500/10 text-amber-600'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {isComplete ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : isUploaded ? (
              <FileText className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="font-medium text-sm">{requirement.label}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {requirement.description}
            </p>
            {uploadedDoc && (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3 w-3" />
                <span>Subido el {formatDate(uploadedDoc.fechaSubida)}</span>
              </div>
            )}
            {signatureData && (
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <PenTool className="h-3 w-3" />
                <span>
                  Firmado por {signatureData.nombre} —{' '}
                  {formatDate(signatureData.fecha)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {isComplete ? (
            <Badge
              variant="outline"
              className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
            >
              Firmado
            </Badge>
          ) : isUploaded ? (
            <Badge
              variant="outline"
              className="border-amber-500/30 text-amber-600 bg-amber-500/10"
            >
              Por Firmar
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-muted-foreground/30 text-muted-foreground"
            >
              Pendiente
            </Badge>
          )}

          {!isUploaded && (
            <Button
              size="sm"
              variant="outline"
              onClick={onUpload}
              disabled={isUploading}
            >
              {isUploading ? (
                <Clock className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="mr-1.5 h-3.5 w-3.5" />
              )}
              Subir
            </Button>
          )}

          {isUploaded && !isSigned && (
            <Button size="sm" onClick={onSign}>
              <PenTool className="mr-1.5 h-3.5 w-3.5" />
              Firmar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
