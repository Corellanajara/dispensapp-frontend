import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Circle,
  Download,
  FileText,
  FlaskConical,
  Loader2,
  PenLine,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CertificadoDialog } from '@/components/firma/CertificadoDialog';
import { EnlaceFirmaDialog } from '@/components/firma/EnlaceFirmaDialog';
import { signaturesAPI, apiErrorMessage, apiErrorCode, openDocument, type FirmaDemo } from '@/services/api';
import type { CertificateStatus, SignatureProviderInfo } from '@/types';

const demosKey = ['firma', 'demos'] as const;

const ESTADO_FIRMA: Record<string, { label: string; className: string }> = {
  enviado: { label: 'Esperando firma', className: 'border-blue-500/30 bg-blue-500/10 text-blue-600' },
  firmado: { label: 'Firmado', className: 'border-success/30 bg-success/10 text-success' },
  rechazado: { label: 'Rechazado', className: 'border-destructive/30 bg-destructive/10 text-destructive' },
  cancelado: { label: 'Cancelado', className: 'border-muted-foreground/30 text-muted-foreground' },
  expirado: { label: 'Expirado', className: 'border-warning/30 bg-warning/10 text-warning' },
  error: { label: 'Error', className: 'border-destructive/30 bg-destructive/10 text-destructive' },
};

/**
 * Firma de prueba: el administrador sube un PDF y lo firma en Signapis igual que un paciente,
 * para ver el flujo completo y cómo queda la estampa. No toca fichas de pacientes.
 */
export function FirmaPruebaCard({ proveedor }: { proveedor: SignatureProviderInfo }) {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [nueva, setNueva] = useState(false);

  const lista = useQuery({
    queryKey: demosKey,
    queryFn: () => signaturesAPI.listDemos().then((r) => r.data.demos),
    enabled: proveedor.configurado,
  });
  const demos = lista.data ?? [];
  const actualId = demos[0]?._id;

  // Estado al día de la prueba actual (consulta a Signapis). Se repite mientras algo está en curso.
  const actual = useQuery({
    queryKey: ['firma', 'demo', actualId],
    queryFn: () => signaturesAPI.getDemo(actualId!).then((r) => r.data),
    enabled: !!actualId,
    initialData: demos[0],
    initialDataUpdatedAt: 0,
    refetchInterval: (q) => {
      const d = q.state.data;
      const enCurso = d?.firma?.estado === 'enviado' || d?.certificado.estado === 'enrolando';
      return enCurso ? 5000 : false;
    },
  });

  // Vuelta desde Signapis (?prueba=listo): actualizar el estado.
  useEffect(() => {
    if (searchParams.get('prueba') !== 'listo') return;
    toast.info('Volviste de Signapis. Actualizando el estado de la prueba…');
    setSearchParams({}, { replace: true });
    qc.invalidateQueries({ queryKey: ['firma'] });
  }, [searchParams, setSearchParams, qc]);

  if (!proveedor.configurado) return null;

  const mostrarFormulario = nueva || (!lista.isLoading && demos.length === 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <FlaskConical className="h-5 w-5" /> Firma de prueba
            </CardTitle>
            <CardDescription>
              Sube un PDF y fírmalo tú mismo en Signapis, igual que lo haría un paciente. Usa la estampa guardada más
              abajo. No afecta a ningún paciente.
            </CardDescription>
          </div>
          {!mostrarFormulario && (
            <Button size="sm" variant="outline" onClick={() => setNueva(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Nueva prueba
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {proveedor.ambiente === 'produccion' && (
          <p className="rounded-lg bg-warning/10 p-3 text-xs text-warning">
            Estás en producción: la prueba emite un certificado real (con costo) y la firma tiene validez legal.
          </p>
        )}

        {lista.isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : mostrarFormulario ? (
          <FormularioPrueba
            sandbox={proveedor.ambiente !== 'produccion'}
            puedeCancelar={demos.length > 0}
            onCancel={() => setNueva(false)}
            onCreada={(demo) => {
              setNueva(false);
              qc.setQueryData(demosKey, [demo, ...demos]);
              qc.setQueryData(['firma', 'demo', demo._id], demo);
            }}
          />
        ) : actual.data ? (
          <PruebaActual
            demo={actual.data}
            actualizando={actual.isFetching}
            onRefrescar={() => actual.refetch()}
            requiereCertificado={proveedor.requiereCertificado}
          />
        ) : null}

        {!mostrarFormulario && demos.length > 1 && <Historial demos={demos.slice(1)} />}
      </CardContent>
    </Card>
  );
}

// ─── Formulario ────────────────────────────────────────────

function FormularioPrueba({
  sandbox,
  puedeCancelar,
  onCancel,
  onCreada,
}: {
  sandbox: boolean;
  puedeCancelar: boolean;
  onCancel: () => void;
  onCreada: (demo: FirmaDemo) => void;
}) {
  const [nombre, setNombre] = useState(sandbox ? 'Firmante de prueba' : '');
  const [rut, setRut] = useState(sandbox ? '44444444-4' : '');
  const [email, setEmail] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);

  const crear = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('nombre', nombre);
      fd.append('rut', rut);
      fd.append('email', email);
      if (archivo) fd.append('archivo', archivo);
      return signaturesAPI.createDemo(fd).then((r) => r.data);
    },
    onSuccess: (demo) => {
      toast.success('Prueba creada');
      onCreada(demo);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'No se pudo crear la prueba')),
  });

  const elegirArchivo = (f: File | undefined) => {
    if (!f) return setArchivo(null);
    if (f.type !== 'application/pdf') return toast.error('El archivo debe ser un PDF');
    if (f.size > 5 * 1024 * 1024) return toast.error('El PDF no puede pesar más de 5 MB');
    setArchivo(f);
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        crear.mutate();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="demo-nombre">Nombre de quien firma</Label>
          <Input id="demo-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="demo-rut">RUT</Label>
          <Input id="demo-rut" value={rut} onChange={(e) => setRut(e.target.value)} required />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="demo-email">Correo</Label>
          <Input
            id="demo-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.cl"
            required
          />
          <p className="text-xs text-muted-foreground">
            Signapis envía a este correo los códigos para firmar. Usa uno al que tengas acceso.
          </p>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="demo-pdf">PDF a firmar (máx. 5 MB)</Label>
          <Input
            id="demo-pdf"
            type="file"
            accept="application/pdf"
            onChange={(e) => elegirArchivo(e.target.files?.[0])}
            required
          />
        </div>
      </div>
      {sandbox && (
        <p className="text-xs text-muted-foreground">
          En pruebas, deja el RUT 44444444-4: al validar identidad entra con Clave Única usando la clave
          <span className="font-mono"> testing</span>, o usa "Simular NFC".
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={crear.isPending || !archivo}>
          {crear.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
          Crear prueba
        </Button>
        {puedeCancelar && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}

// ─── Prueba en curso ───────────────────────────────────────

function Paso({ listo, titulo, children }: { listo: boolean; titulo: string; children?: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      {listo ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
      ) : (
        <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
      )}
      <div className="flex-1 space-y-2">
        <p className="text-sm font-medium">{titulo}</p>
        {children}
      </div>
    </div>
  );
}

function PruebaActual({
  demo,
  actualizando,
  onRefrescar,
  requiereCertificado,
}: {
  demo: FirmaDemo;
  actualizando: boolean;
  onRefrescar: () => void;
  requiereCertificado: boolean;
}) {
  const qc = useQueryClient();
  const [certOpen, setCertOpen] = useState(false);
  const [enlace, setEnlace] = useState<{ url: string; tipo: 'certificado' | 'firma' } | null>(null);

  const cert = demo.certificado;
  const certListo = !requiereCertificado || cert.estado === 'activo' || cert.estado === 'no_aplica';
  const firma = demo.firma;
  const firmado = firma?.estado === 'firmado';

  const firmar = useMutation({
    mutationFn: () => signaturesAPI.signDemo(demo._id).then((r) => r.data),
    onSuccess: (r) => {
      onRefrescar();
      if (r.signingUrl) setEnlace({ url: r.signingUrl, tipo: 'firma' });
      else toast.success(r.message);
    },
    onError: (err) => {
      const codigo = apiErrorCode(err);
      if (codigo === 'REQUIERE_CERTIFICADO') setCertOpen(true);
      toast.error(apiErrorMessage(err, 'No se pudo enviar a firmar'));
      onRefrescar();
    },
  });

  const estadoCert: CertificateStatus = {
    requiere: cert.requiere,
    estado: cert.estado,
    mensaje: cert.mensaje,
    enrolamientoUrl: cert.enrolamientoUrl,
    datos: { comuna: null, telefono: null, email: demo.email },
  };

  const abrir = (firmadoPdf: boolean) =>
    openDocument(() => signaturesAPI.demoFile(demo._id, firmadoPdf)).catch((err) =>
      toast.error(apiErrorMessage(err, 'No se pudo abrir el PDF'))
    );

  const estadoFirma = firma ? ESTADO_FIRMA[firma.estado] : undefined;

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5">
          <p className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4" /> {demo.nombreArchivo}
          </p>
          <p className="text-xs text-muted-foreground">
            {demo.nombre} · {demo.rut} · {demo.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {estadoFirma && (
            <Badge variant="outline" className={estadoFirma.className}>
              {estadoFirma.label}
            </Badge>
          )}
          <Button size="sm" variant="ghost" onClick={onRefrescar} disabled={actualizando} title="Actualizar estado">
            <RefreshCw className={`h-4 w-4 ${actualizando ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {requiereCertificado && (
        <Paso listo={certListo} titulo="1. Certificado de firma (se obtiene una vez por correo)">
          {cert.estado === 'activo' ? (
            <p className="text-xs text-success">{demo.email} ya tiene firma electrónica avanzada.</p>
          ) : (
            <>
              {cert.mensaje && (
                <p className={`text-xs ${cert.estado === 'fallido' ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {cert.mensaje}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {cert.estado === 'enrolando' && cert.enrolamientoUrl && (
                  <Button size="sm" onClick={() => setEnlace({ url: cert.enrolamientoUrl!, tipo: 'certificado' })}>
                    Continuar validación
                  </Button>
                )}
                <Button
                  size="sm"
                  variant={cert.estado === 'enrolando' ? 'outline' : 'default'}
                  onClick={() => setCertOpen(true)}
                >
                  <ShieldCheck className="h-4 w-4 mr-1.5" />
                  {cert.estado === 'enrolando' ? 'Pedir de nuevo' : 'Obtener certificado'}
                </Button>
              </div>
              {cert.estado === 'enrolando' && (
                <p className="text-xs text-muted-foreground">
                  Aún faltan pasos en Signapis: completa todas las validaciones y crea tu clave de firma. Cuando
                  Signapis emita el certificado, esta tarjeta se actualiza sola. El enlace dura 1 hora después de
                  Clave Única; si venció, usa "Pedir de nuevo".
                </p>
              )}
            </>
          )}
        </Paso>
      )}

      <Paso listo={firmado} titulo={`${requiereCertificado ? '2' : '1'}. Firmar el documento`}>
        {firma?.mensaje && !firmado && <p className="text-xs text-muted-foreground">{firma.mensaje}</p>}
        {!firmado && (
          <div className="flex flex-wrap gap-2">
            {firma?.estado === 'enviado' && firma.signingUrl ? (
              <Button size="sm" onClick={() => setEnlace({ url: firma.signingUrl!, tipo: 'firma' })}>
                <PenLine className="h-4 w-4 mr-1.5" /> Ir a firmar
              </Button>
            ) : (
              <Button size="sm" onClick={() => firmar.mutate()} disabled={!certListo || firmar.isPending}>
                {firmar.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <PenLine className="h-4 w-4 mr-1.5" />
                )}
                {firma && firma.estado !== 'enviado' ? 'Enviar a firmar de nuevo' : 'Enviar a firmar'}
              </Button>
            )}
          </div>
        )}
        {firmado && (
          <p className="text-xs text-success">
            Firmado{firma?.firmadoPor ? ` por ${firma.firmadoPor}` : ''}
            {firma?.fechaFirma ? ` el ${new Date(firma.fechaFirma).toLocaleString('es-CL')}` : ''}.
          </p>
        )}
      </Paso>

      <div className="flex flex-wrap gap-2 border-t pt-3">
        <Button size="sm" variant="outline" onClick={() => abrir(false)}>
          <FileText className="h-4 w-4 mr-1.5" /> Ver original
        </Button>
        {firmado && (
          <Button size="sm" onClick={() => abrir(true)} disabled={!firma?.tieneArchivoFirmado}>
            <Download className="h-4 w-4 mr-1.5" />
            {firma?.tieneArchivoFirmado ? 'Ver PDF firmado' : 'Descargando PDF firmado…'}
          </Button>
        )}
      </div>

      <CertificadoDialog
        open={certOpen}
        onOpenChange={setCertOpen}
        estado={estadoCert}
        modo="personal"
        onSubmit={(data) => signaturesAPI.demoCertificate(demo._id, data).then((r) => r.data)}
        onEnlace={(url) => {
          onRefrescar();
          setEnlace({ url, tipo: 'certificado' });
        }}
      />
      <EnlaceFirmaDialog
        url={enlace?.url ?? null}
        titulo={enlace?.tipo === 'certificado' ? 'Validar identidad en Signapis' : 'Firmar en Signapis'}
        descripcion={
          enlace?.tipo === 'certificado'
            ? 'Ábrelo para validar la identidad y crear la clave de firma. Al terminar, vuelve a esta pestaña: se actualiza sola.'
            : 'Ábrelo para firmar el PDF. Signapis enviará un código al correo. Al terminar, vuelve a esta pestaña: se actualiza sola.'
        }
        onClose={() => {
          setEnlace(null);
          onRefrescar();
          qc.invalidateQueries({ queryKey: demosKey });
        }}
      />
    </div>
  );
}

// ─── Pruebas anteriores ────────────────────────────────────

function Historial({ demos }: { demos: FirmaDemo[] }) {
  const qc = useQueryClient();
  const borrar = useMutation({
    mutationFn: (id: string) => signaturesAPI.deleteDemo(id),
    onSuccess: () => {
      toast.success('Prueba eliminada');
      qc.invalidateQueries({ queryKey: demosKey });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'No se pudo eliminar')),
  });

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Pruebas anteriores</p>
      <ul className="divide-y rounded-lg border">
        {demos.map((d) => {
          const estado = d.firma ? ESTADO_FIRMA[d.firma.estado] : undefined;
          return (
            <li key={d._id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="truncate">
                {d.nombreArchivo}{' '}
                <span className="text-xs text-muted-foreground">
                  · {new Date(d.createdAt).toLocaleDateString('es-CL')}
                </span>
              </span>
              <span className="flex items-center gap-1">
                <Badge variant="outline" className={estado?.className}>
                  {estado?.label ?? 'Sin firmar'}
                </Badge>
                {d.firma?.tieneArchivoFirmado && (
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Ver PDF firmado"
                    onClick={() =>
                      openDocument(() => signaturesAPI.demoFile(d._id, true)).catch((err) =>
                        toast.error(apiErrorMessage(err, 'No se pudo abrir el PDF'))
                      )
                    }
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  title="Eliminar prueba"
                  onClick={() => borrar.mutate(d._id)}
                  disabled={borrar.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
