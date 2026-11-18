import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  FileSignature,
  Info,
  Loader2,
  PenTool,
  RefreshCw,
  ShieldCheck,
  ThumbsDown,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { CertificadoDialog } from '@/components/firma/CertificadoDialog';
import { validacionAPI, openDocument, apiErrorMessage, apiErrorCode } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, formatRelativeTime } from '@/lib/format';
import type { CertificateStatus, ValidacionItem } from '@/types';

const CODIGOS_CERTIFICADO = ['REQUIERE_CERTIFICADO', 'CERTIFICADO_EN_CURSO'];

function abrir(item: ValidacionItem, version: 'paciente' | 'final') {
  openDocument(() => validacionAPI.archivo(item.paciente._id, item.documento._id, version)).catch((err) =>
    toast.error(apiErrorMessage(err, 'No se pudo abrir el documento'))
  );
}

/**
 * Bandeja del dispensario: lo que firman los pacientes llega aquí y queda pendiente hasta que un
 * responsable de firma lo revise y lo contrafirme con su certificado. Si algo no cumple, lo rechaza
 * con el motivo y el paciente debe subir una nueva versión y firmarla otra vez.
 */
export function ValidacionFirmasPage() {
  const { user, sucursalActiva } = useAuth();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [busy, setBusy] = useState<string | null>(null);
  const [rechazo, setRechazo] = useState<ValidacionItem | null>(null);
  const [motivo, setMotivo] = useState('');
  const [certOpen, setCertOpen] = useState(false);

  const bandejaKey = ['validacion-firmas', 'bandeja', sucursalActiva?._id ?? null];
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: bandejaKey,
    queryFn: () => validacionAPI.list().then((r) => r.data),
    refetchInterval: 60_000,
  });
  const responsable = !!data?.responsable;

  const { data: certificado, refetch: refetchCert, isLoading: cargandoCert } = useQuery<CertificateStatus>({
    queryKey: ['validacion-firmas', 'certificado'],
    queryFn: () => validacionAPI.certificado().then((r) => r.data),
    enabled: responsable,
    staleTime: 60_000,
  });

  const recargar = () => {
    void refetch();
    void queryClient.invalidateQueries({ queryKey: ['validacion-firmas', 'resumen'] });
  };

  // Al volver de Signapis: se consulta el estado de mis contrafirmas en curso (por si el webhook tarda).
  const revisado = useRef(false);
  useEffect(() => {
    if (!data || revisado.current) return;
    const vuelta = params.get('firma') === 'listo';
    const cert = params.get('certificado') === 'listo';
    if (!vuelta && !cert) return;
    revisado.current = true;
    if (cert) {
      toast.info('Revisando tu certificado de firma…');
      void refetchCert();
    }
    if (vuelta) {
      const mias = data.pendientes.filter(
        (i) => i.etapa === 'contrafirma_en_curso' && i.contrafirma?.responsableId === user?.id
      );
      void Promise.all(
        mias.map((i) => validacionAPI.estado(i.paciente._id, i.documento._id).then((r) => r.data.item).catch(() => null))
      ).then((items) => {
        const listos = items.filter((i) => i?.etapa === 'completo').length;
        if (listos > 0) toast.success(listos === 1 ? 'Documento validado y contrafirmado' : `${listos} documentos validados`);
        else if (mias.length > 0) toast.info('Signapis aún no confirma la firma. Se actualizará sola en unos segundos.');
        recargar();
      });
    }
    params.delete('firma');
    params.delete('certificado');
    setParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const contrafirmar = async (item: ValidacionItem, reiniciar = false) => {
    setBusy(`firmar-${item.documento._id}`);
    try {
      const { data: r } = await validacionAPI.firmar(item.paciente._id, item.documento._id, reiniciar);
      if (r.firma.signingUrl) {
        toast.success('Te llevamos a Signapis para contrafirmar…');
        window.location.assign(r.firma.signingUrl);
        return;
      }
      toast.success(r.firma.message || 'Contrafirma enviada');
      recargar();
    } catch (err) {
      if (CODIGOS_CERTIFICADO.includes(apiErrorCode(err) ?? '')) {
        toast.info(apiErrorMessage(err, 'Necesitas tu certificado de firma'));
        await refetchCert();
        setCertOpen(true);
      } else {
        toast.error(apiErrorMessage(err, 'No se pudo iniciar la contrafirma'));
      }
    } finally {
      setBusy(null);
    }
  };

  const actualizar = async (item: ValidacionItem) => {
    setBusy(`estado-${item.documento._id}`);
    try {
      const { data: r } = await validacionAPI.estado(item.paciente._id, item.documento._id);
      if (r.item.etapa === 'completo') toast.success('Documento validado y contrafirmado');
      else toast.info('La contrafirma sigue en curso');
      recargar();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo consultar la contrafirma'));
    } finally {
      setBusy(null);
    }
  };

  const confirmarRechazo = async () => {
    if (!rechazo) return;
    setBusy('rechazar');
    try {
      await validacionAPI.rechazar(rechazo.paciente._id, rechazo.documento._id, motivo.trim());
      toast.success('Documento devuelto al paciente con el motivo');
      setRechazo(null);
      setMotivo('');
      recargar();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo rechazar el documento'));
    } finally {
      setBusy(null);
    }
  };

  const pendientes = data?.pendientes ?? [];
  const validados = data?.validados ?? [];
  const certListo = certificado?.estado === 'activo' || certificado?.estado === 'no_aplica';

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Validación de firmas"
        description="Lo que firman los pacientes queda pendiente hasta que un responsable del dispensario lo revise y lo contrafirme."
      >
        <Button variant="outline" size="sm" onClick={recargar} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </PageHeader>

      {data && !data.activa && (
        <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <Info className="h-5 w-5 shrink-0 text-amber-600" />
          <p>
            La validación del dispensario está desactivada: lo que firma el paciente cuenta como completo sin contrafirma.
            {user?.role === 'admin' && (
              <>
                {' '}
                Puedes activarla en <Link to="/configuracion/firma" className="underline">Firma electrónica</Link>.
              </>
            )}
          </p>
        </div>
      )}

      {/* Mi firma como responsable */}
      <Card>
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                responsable && certListo ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'
              }`}
            >
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              {!data ? (
                <p className="text-sm text-muted-foreground">Cargando…</p>
              ) : !responsable ? (
                <>
                  <p className="text-sm font-medium">No eres responsable de firma</p>
                  <p className="text-xs text-muted-foreground">
                    Puedes ver la bandeja{user?.role === 'admin' ? ' y rechazar documentos' : ''}. Para contrafirmar, el
                    administrador debe marcarte como responsable de firma en Usuarios.
                  </p>
                </>
              ) : cargandoCert ? (
                <p className="text-sm text-muted-foreground">Consultando tu firma electrónica…</p>
              ) : certListo ? (
                <>
                  <p className="text-sm font-medium">Tu firma electrónica está lista</p>
                  <p className="text-xs text-muted-foreground">
                    Contrafirmas con tu clave de Signapis y el código que te llega. Queda registrado con tu nombre y RUT.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium">
                    {certificado?.estado === 'enrolando' ? 'Tu firma electrónica está en trámite' : 'Necesitas tu firma electrónica'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {certificado?.mensaje ??
                      'Para contrafirmar necesitas una firma electrónica avanzada propia (se obtiene una sola vez, validando tu identidad en Signapis).'}
                  </p>
                </>
              )}
            </div>
          </div>
          {responsable && !cargandoCert && !certListo && (
            <Button size="sm" onClick={() => setCertOpen(true)}>
              <ShieldCheck className="h-4 w-4 mr-1.5" />
              {certificado?.estado === 'enrolando' ? 'Continuar trámite' : 'Obtener mi firma electrónica'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Pendientes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-amber-600" />
            Por validar
            {pendientes.length > 0 && (
              <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 tabular-nums">
                {pendientes.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendientes.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Nada por validar"
              description="Cuando un paciente firme un documento, aparecerá aquí para que lo revises y lo contrafirmes."
            />
          ) : (
            <div className="space-y-3">
              {pendientes.map((item) => {
                const enCurso = item.etapa === 'contrafirma_en_curso';
                const mia = enCurso && item.contrafirma?.responsableId === user?.id;
                const deOtro = enCurso && !mia;
                const id = item.documento._id;
                return (
                  <div key={id} className="rounded-xl border p-4 space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{item.documento.etiqueta}</p>
                          {enCurso ? (
                            <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-700">
                              Contrafirma en curso{item.contrafirma?.responsable ? ` · ${item.contrafirma.responsable}` : ''}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700">
                              Esperando validación
                            </Badge>
                          )}
                        </div>
                        <p className="flex flex-wrap items-center gap-x-1.5 text-sm">
                          <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                          <Link to={`/pacientes/${item.paciente._id}`} className="hover:underline">
                            {item.paciente.nombre}
                          </Link>
                          <span className="font-mono text-xs text-muted-foreground">{item.paciente.rut}</span>
                          {item.paciente.sucursal && (
                            <span className="text-xs text-muted-foreground">· {item.paciente.sucursal.nombre}</span>
                          )}
                        </p>
                        <p className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                          <PenTool className="h-3 w-3" />
                          Firmado por el paciente
                          {item.firmaPaciente?.firmadoPor ? ` (${item.firmaPaciente.firmadoPor})` : ''}
                          {item.firmaPaciente?.fechaFirma &&
                            ` el ${formatDate(item.firmaPaciente.fechaFirma)} · espera desde ${formatRelativeTime(item.firmaPaciente.fechaFirma)}`}
                        </p>
                        {item.contrafirma?.mensaje && ['rechazado', 'error', 'expirado', 'cancelado'].includes(item.contrafirma.estado) && (
                          <p className="text-xs text-destructive">Contrafirma anterior: {item.contrafirma.mensaje}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => abrir(item, 'paciente')}>
                        <FileCheck2 className="h-4 w-4 mr-1.5" /> Revisar lo firmado
                      </Button>
                      {responsable && !enCurso && (
                        <Button size="sm" onClick={() => contrafirmar(item)} disabled={busy === `firmar-${id}`}>
                          {busy === `firmar-${id}` ? (
                            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                          ) : (
                            <FileSignature className="h-4 w-4 mr-1.5" />
                          )}
                          Validar y contrafirmar
                        </Button>
                      )}
                      {mia && item.contrafirma?.signingUrl && (
                        <Button size="sm" onClick={() => window.location.assign(item.contrafirma!.signingUrl!)}>
                          <ExternalLink className="h-4 w-4 mr-1.5" /> Continuar contrafirma
                        </Button>
                      )}
                      {enCurso && (
                        <Button variant="outline" size="sm" onClick={() => actualizar(item)} disabled={busy === `estado-${id}`}>
                          <RefreshCw className={`h-4 w-4 mr-1.5 ${busy === `estado-${id}` ? 'animate-spin' : ''}`} />
                          Actualizar estado
                        </Button>
                      )}
                      {responsable && enCurso && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => contrafirmar(item, true)}
                          disabled={busy === `firmar-${id}`}
                          title={deOtro ? 'Cancela la contrafirma del otro responsable y la tomas tú' : 'Genera un enlace nuevo'}
                        >
                          {deOtro ? 'Tomar y contrafirmar yo' : 'Nuevo enlace'}
                        </Button>
                      )}
                      {(responsable || user?.role === 'admin') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setMotivo('');
                            setRechazo(item);
                          }}
                        >
                          <ThumbsDown className="h-4 w-4 mr-1.5" /> Rechazar
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

      {/* Validados recientes */}
      {validados.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Validados recientemente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {validados.map((item) => (
                <div
                  key={item.documento._id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{item.documento.etiqueta}</span>
                      {' · '}
                      <Link to={`/pacientes/${item.paciente._id}`} className="hover:underline">
                        {item.paciente.nombre}
                      </Link>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Contrafirmado por {item.contrafirma?.firmadoPor ?? item.contrafirma?.responsable ?? 'el dispensario'}
                      {item.contrafirma?.fechaFirma && ` el ${formatDate(item.contrafirma.fechaFirma)}`}
                    </p>
                  </div>
                  {item.contrafirma?.tieneArchivo && (
                    <Button variant="outline" size="sm" onClick={() => abrir(item, 'final')}>
                      <FileCheck2 className="h-4 w-4 mr-1.5" /> Ver documento final
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!rechazo} onOpenChange={(o) => !o && setRechazo(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rechazar {rechazo?.documento.etiqueta.toLowerCase()}</DialogTitle>
            <DialogDescription>
              El documento vuelve a {rechazo?.paciente.nombre} con este motivo. Deberá subir una nueva versión y firmarla
              otra vez; luego volverá a esta bandeja.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="motivo-rechazo">Motivo (lo verá el paciente)</Label>
            <Textarea
              id="motivo-rechazo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej.: falta la página 2 con los datos del mandatario"
              rows={3}
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRechazo(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmarRechazo}
              disabled={busy === 'rechazar' || motivo.trim().length < 3}
            >
              {busy === 'rechazar' && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Rechazar y devolver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CertificadoDialog
        open={certOpen}
        onOpenChange={setCertOpen}
        estado={certificado ?? null}
        modo="paciente"
        onSubmit={(d) => validacionAPI.solicitarCertificado(d).then((r) => r.data)}
      />
    </div>
  );
}
