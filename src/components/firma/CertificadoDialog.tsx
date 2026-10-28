import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  signaturesAPI,
  apiErrorMessage,
  type CertificateRequestData,
  type CertificateRequestResult,
} from '@/services/api';
import type { CertificateStatus } from '@/types';

interface CertificadoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Estado actual del certificado (para precargar comuna/teléfono y ofrecer continuar). */
  estado?: CertificateStatus | null;
  /** paciente: se le lleva directo a Signapis. personal: recibe el enlace para abrirlo o enviarlo. */
  modo: 'paciente' | 'personal';
  onSubmit: (data: CertificateRequestData) => Promise<CertificateRequestResult>;
  /** Solo modo personal: se llama con el enlace de validación. */
  onEnlace?: (url: string) => void;
}

/**
 * Pide el certificado de firma electrónica avanzada del paciente.
 * Signapis lo exige una vez por persona: valida la identidad (Clave Única, preguntas o
 * transferencia) y luego el paciente firma con su clave y un código.
 */
export function CertificadoDialog({ open, onOpenChange, estado, modo, onSubmit, onEnlace }: CertificadoDialogProps) {
  const [serie, setSerie] = useState('');
  const [telefono, setTelefono] = useState('');
  const [comuna, setComuna] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [lastOpen, setLastOpen] = useState(open);

  const { data: comunas = [] } = useQuery({
    queryKey: ['firma', 'comunas'],
    queryFn: () => signaturesAPI.comunas().then((r) => r.data.comunas),
    enabled: open,
    staleTime: Infinity,
  });

  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setSerie('');
      setTelefono(estado?.datos.telefono ?? '');
      setComuna(estado?.datos.comuna ?? '');
    }
  }

  const paciente = modo === 'paciente';
  const enCurso = estado?.estado === 'enrolando' && !!estado.enrolamientoUrl;
  const comunaValida = !comuna || comunas.length === 0 || comunas.includes(comuna);

  const continuar = () => {
    if (!estado?.enrolamientoUrl) return;
    if (paciente) window.location.assign(estado.enrolamientoUrl);
    else onEnlace?.(estado.enrolamientoUrl);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comunaValida) {
      toast.error('Elige la comuna desde la lista');
      return;
    }
    setEnviando(true);
    try {
      const result = await onSubmit({
        serieCedula: serie.trim(),
        telefono: telefono.trim() || undefined,
        comuna: comuna || undefined,
      });
      if (paciente) {
        toast.success('Te llevamos a Signapis para validar tu identidad…');
        window.location.assign(result.enrollUrl);
      } else {
        onOpenChange(false);
        onEnlace?.(result.enrollUrl);
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo solicitar el certificado'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {paciente ? 'Obtén tu firma electrónica' : 'Certificado de firma del paciente'}
          </DialogTitle>
          <DialogDescription>
            {paciente
              ? 'Para firmar necesitas una firma electrónica avanzada (se obtiene una sola vez). Validarás tu identidad en Signapis con tu Clave Única u otro método y crearás una clave para firmar.'
              : 'El paciente necesita una firma electrónica avanzada (una sola vez). Debe validar su identidad en Signapis con su Clave Única u otro método, en este equipo o en el suyo.'}
          </DialogDescription>
        </DialogHeader>

        {enCurso && (
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 space-y-2">
            <p className="text-sm">
              {paciente ? 'Ya empezaste la validación.' : 'El paciente ya empezó la validación.'}
              {estado?.mensaje ? ` ${estado.mensaje}` : ''}
            </p>
            <Button size="sm" onClick={continuar}>
              <ExternalLink className="h-4 w-4 mr-1.5" />
              {paciente ? 'Continuar validación' : 'Ver enlace de validación'}
            </Button>
            <p className="text-xs text-muted-foreground">Si el enlace ya no funciona, solicítalo de nuevo abajo.</p>
          </div>
        )}
        {estado?.estado === 'fallido' && estado.mensaje && (
          <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{estado.mensaje}</p>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cert-serie">Número de documento de la cédula</Label>
            <Input
              id="cert-serie"
              value={serie}
              onChange={(e) => setSerie(e.target.value)}
              placeholder="123.456.789"
              autoComplete="off"
              required
            />
            <p className="text-xs text-muted-foreground">
              Es el número de serie impreso en la cédula ("Número documento"), no el RUT.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cert-tel">Teléfono celular</Label>
            <Input
              id="cert-tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="+56912345678"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cert-comuna">Comuna de residencia</Label>
            <Input
              id="cert-comuna"
              list="comunas-signapis"
              value={comuna}
              onChange={(e) => setComuna(e.target.value)}
              placeholder="Escribe y elige de la lista"
              required
            />
            <datalist id="comunas-signapis">
              {comunas.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            {!comunaValida && <p className="text-xs text-destructive">Elige una comuna de la lista.</p>}
          </div>
          {estado?.datos.email && (
            <p className="text-xs text-muted-foreground">
              La firma quedará asociada al correo <span className="font-medium">{estado.datos.email}</span>.
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={enviando || !serie.trim()}>
              {enviando && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {paciente ? 'Ir a validar mi identidad' : 'Generar enlace de validación'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
