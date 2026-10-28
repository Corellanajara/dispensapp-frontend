import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  PlugZap,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Webhook,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { signaturesAPI, apiErrorMessage } from '@/services/api';
import { DOCUMENT_TYPE_LABELS } from '@/lib/constants';
import type { DocumentType, SignatureAdminConfig, SignatureSettings } from '@/types';

/** Documentos que el paciente puede firmar (la receta la emite el médico, no se firma aquí). */
const TIPOS_FIRMABLES: DocumentType[] = ['reglamento_interno', 'mandato_contrato', 'certificado_antecedentes', 'otro'];

const ESTAMPAS: { value: 1 | 2 | 5; label: string; detalle: string }[] = [
  { value: 1, label: 'Sello estándar', detalle: 'Muestra nombre, RUT, fecha y hora del firmante.' },
  { value: 2, label: 'Texto personalizado', detalle: 'Muestra el texto que escribas (máx. 120 caracteres).' },
  { value: 5, label: 'Sin estampa visible', detalle: 'El PDF queda firmado pero la firma no se ve en la hoja.' },
];

const configKey = ['firma', 'config'] as const;

export function FirmaConfigPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: configKey,
    queryFn: () => signaturesAPI.getConfig().then((r) => r.data),
  });

  const [draft, setDraft] = useState<SignatureSettings | null>(null);
  const [base, setBase] = useState<SignatureSettings | null>(null);
  if (data && data.firma !== base) {
    setBase(data.firma);
    setDraft(data.firma);
  }

  const guardar = useMutation({
    mutationFn: (firma: SignatureSettings) => signaturesAPI.updateConfig(firma).then((r) => r.data),
    onSuccess: (resp) => {
      qc.setQueryData(configKey, resp);
      qc.invalidateQueries({ queryKey: ['app-config'] });
      qc.invalidateQueries({ queryKey: ['patients'] });
      toast.success(resp.firma.habilitada ? 'Configuración de firma guardada' : 'Firma electrónica desactivada');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'No se pudo guardar')),
  });

  if (isLoading || !draft || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Firma electrónica" />
        {error ? (
          <p className="text-sm text-destructive">{apiErrorMessage(error, 'No se pudo cargar la configuración')}</p>
        ) : (
          <Skeleton className="h-64 w-full" />
        )}
      </div>
    );
  }

  const cambiado = JSON.stringify(draft) !== JSON.stringify(data.firma);
  const set = (cambios: Partial<SignatureSettings>) => setDraft({ ...draft, ...cambios });
  const toggleTipo = (tipo: DocumentType, on: boolean) =>
    set({
      tiposConFirma: on ? [...draft.tiposConFirma, tipo] : draft.tiposConFirma.filter((t) => t !== tipo),
    });
  const sinTipos = draft.habilitada && draft.tiposConFirma.length === 0;

  const submit = () => {
    if (draft.tipoEstampa === 2 && !draft.textoEstampa?.trim()) {
      toast.error('Escribe el texto de la estampa');
      return;
    }
    guardar.mutate(draft);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Firma electrónica"
        description="Decide si los pacientes firman sus documentos con firma electrónica avanzada (Signapis) y cuáles."
      >
        <Button onClick={submit} disabled={!cambiado || guardar.isPending}>
          {guardar.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Guardar cambios
        </Button>
      </PageHeader>

      {data.almacenamiento && !data.almacenamiento.persistente && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div className="space-y-1">
            <p className="font-medium">Los documentos se borrarán en el próximo deploy</p>
            <p>{data.almacenamiento.detalle}</p>
          </div>
        </div>
      )}

      <ProveedorCard data={data} />

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-lg">¿Se firman los documentos?</CardTitle>
              <CardDescription>
                Si la apagas, ningún documento pide firma y los pacientes pueden activarse sin documentos firmados. Las
                firmas ya hechas se conservan.
              </CardDescription>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer shrink-0">
              <Switch checked={draft.habilitada} onCheckedChange={(v: boolean) => set({ habilitada: v })} />
              {draft.habilitada ? 'Con firma' : 'Sin firma'}
            </label>
          </div>
        </CardHeader>
        {draft.habilitada && (
          <CardContent className="space-y-3">
            <p className="text-sm font-medium">Documentos que firma el paciente</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {TIPOS_FIRMABLES.map((tipo) => (
                <label
                  key={tipo}
                  className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/40"
                >
                  <Checkbox
                    checked={draft.tiposConFirma.includes(tipo)}
                    onCheckedChange={(v) => toggleTipo(tipo, !!v)}
                  />
                  <span className="text-sm">{DOCUMENT_TYPE_LABELS[tipo]}</span>
                </label>
              ))}
            </div>
            {sinTipos && (
              <p className="flex items-center gap-1.5 text-xs text-warning">
                <AlertTriangle className="h-3.5 w-3.5" /> Con ningún documento marcado, nadie firmará nada.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Los documentos que se firman deben subirse en PDF (máximo 5 MB). La firma del reglamento y del mandato es
              advertencia al activar al paciente, no lo bloquea.
            </p>
          </CardContent>
        )}
      </Card>

      {draft.habilitada && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cómo se ve la firma</CardTitle>
            <CardDescription>Estampa que Signapis agrega al PDF firmado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup
              value={String(draft.tipoEstampa)}
              onValueChange={(v: string) => set({ tipoEstampa: Number(v) as 1 | 2 | 5 })}
              className="gap-3"
            >
              {ESTAMPAS.map((e) => (
                <label key={e.value} className="flex items-start gap-3 cursor-pointer">
                  <RadioGroupItem value={String(e.value)} className="mt-0.5" />
                  <span>
                    <span className="text-sm font-medium">{e.label}</span>
                    <span className="block text-xs text-muted-foreground">{e.detalle}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>
            {draft.tipoEstampa === 2 && (
              <div className="space-y-1.5 max-w-md">
                <Label htmlFor="texto-estampa">Texto de la estampa</Label>
                <Input
                  id="texto-estampa"
                  maxLength={120}
                  value={draft.textoEstampa ?? ''}
                  onChange={(e) => set({ textoEstampa: e.target.value })}
                  placeholder="Firmado electrónicamente por el paciente"
                />
              </div>
            )}

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Switch
                  checked={!!draft.posicion}
                  onCheckedChange={(v: boolean) => set({ posicion: v ? { pagina: 1, x: 100, y: 650 } : null })}
                />
                Ubicar la firma en una posición fija
              </label>
              {draft.posicion ? (
                <div className="grid grid-cols-3 gap-3 max-w-md">
                  {(['pagina', 'x', 'y'] as const).map((k) => (
                    <div key={k} className="space-y-1.5">
                      <Label className="text-xs">{k === 'pagina' ? 'Página' : `${k.toUpperCase()} (px)`}</Label>
                      <Input
                        type="number"
                        min={k === 'pagina' ? 1 : 0}
                        value={draft.posicion![k]}
                        onChange={(e) => set({ posicion: { ...draft.posicion!, [k]: Number(e.target.value) } })}
                      />
                    </div>
                  ))}
                  <p className="col-span-3 text-xs text-muted-foreground">
                    Se mide desde la esquina superior izquierda de la hoja.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Sin posición fija, Signapis decide dónde poner la firma.</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Switch checked={draft.conQR} onCheckedChange={(v: boolean) => set({ conQR: v })} />
                Agregar código QR de validación
              </label>
              {draft.conQR && (
                <p className="flex items-start gap-1.5 text-xs text-warning">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  Con QR, Signapis deja el documento público: cualquiera con el código puede descargarlo. No se recomienda
                  para documentos de pacientes.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Vigencia de la firma electrónica del paciente</Label>
              <RadioGroup
                value={String(draft.vigenciaCertificadoAnios)}
                onValueChange={(v: string) => set({ vigenciaCertificadoAnios: Number(v) as 1 | 2 | 3 })}
                className="flex gap-6"
              >
                {[1, 2, 3].map((n) => (
                  <label key={n} className="flex items-center gap-2 text-sm cursor-pointer">
                    <RadioGroupItem value={String(n)} />
                    {n} año{n > 1 ? 's' : ''}
                  </label>
                ))}
              </RadioGroup>
              <p className="text-xs text-muted-foreground">
                Se aplica a los certificados que se pidan desde ahora. Revisa con Signapis el costo de cada opción.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ProveedorCard({ data }: { data: SignatureAdminConfig }) {
  const { proveedor, webhookUrl, produccion } = data;
  const esSignapis = proveedor.name === 'signapis';

  const webhook = useQuery({
    queryKey: ['firma', 'webhook'],
    queryFn: () => signaturesAPI.getWebhook().then((r) => r.data),
    enabled: esSignapis && proveedor.configurado,
    retry: false,
  });

  const probar = useMutation({
    mutationFn: () => signaturesAPI.testConnection().then((r) => r.data),
    onSuccess: (r) => toast.success(r.message),
    onError: (err) => toast.error(apiErrorMessage(err, 'Falló la conexión')),
  });
  const registrar = useMutation({
    mutationFn: () => signaturesAPI.registerWebhook().then((r) => r.data),
    onSuccess: (r) => {
      toast.success(r.message);
      webhook.refetch();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'No se pudo registrar el webhook')),
  });
  const probarWebhook = useMutation({
    mutationFn: () => signaturesAPI.testWebhook().then((r) => r.data),
    onSuccess: (r) => toast.success(r.message),
    onError: (err) => toast.error(apiErrorMessage(err, 'Falló la prueba del webhook')),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Proveedor: {esSignapis ? 'Signapis' : proveedor.name}
          </CardTitle>
          <div className="flex gap-2">
            {proveedor.ambiente && (
              <Badge
                variant="outline"
                className={
                  proveedor.ambiente === 'produccion'
                    ? 'border-success/30 bg-success/10 text-success'
                    : 'border-warning/30 bg-warning/10 text-warning'
                }
              >
                {proveedor.ambiente === 'produccion' ? 'Producción' : 'Pruebas (sandbox)'}
              </Badge>
            )}
            <Badge
              variant="outline"
              className={
                proveedor.configurado
                  ? 'border-success/30 bg-success/10 text-success'
                  : 'border-destructive/30 bg-destructive/10 text-destructive'
              }
            >
              {proveedor.configurado ? 'Configurado' : 'Sin configurar'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {!proveedor.validezLegal && (
          <p className="flex items-start gap-2 rounded-lg bg-warning/10 p-3 text-warning">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            Proveedor de prueba: las firmas se completan solas y no tienen validez legal
            {produccion ? ' (bloqueado en producción)' : ''}. Configura SIGNATURE_PROVIDER=signapis.
          </p>
        )}
        {proveedor.faltantes.length > 0 && (
          <p className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-destructive">
            <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
            Faltan variables de entorno en el backend: {proveedor.faltantes.join(', ')}.
          </p>
        )}
        {data.almacenamiento?.persistente && (
          <p className="flex items-center gap-1.5 text-xs text-success">
            <CheckCircle2 className="h-3.5 w-3.5" /> PDF guardados de forma permanente: {data.almacenamiento.detalle}
          </p>
        )}
        {proveedor.ambiente === 'pruebas' && (
          <p className="text-xs text-muted-foreground">
            En pruebas usa RUT 44444444-4 (Clave Única: testing), el botón "Simular NFC" o las respuestas 1-1 … 5-5 del
            desafío. Para pasar a producción cambia SIGNAPIS_AMBIENTE=produccion y las credenciales de producción, y
            registra el webhook de nuevo.
          </p>
        )}

        {esSignapis && (
          <>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => probar.mutate()}
                disabled={probar.isPending || !proveedor.configurado}
              >
                {probar.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <PlugZap className="h-4 w-4 mr-1.5" />}
                Probar conexión
              </Button>
            </div>

            <div className="rounded-lg border p-3 space-y-2">
              <p className="flex items-center gap-2 font-medium">
                <Webhook className="h-4 w-4" /> Notificaciones (webhook)
              </p>
              <p className="text-xs text-muted-foreground">
                Signapis avisa aquí cuando un paciente firma u obtiene su firma electrónica:{' '}
                <span className="font-mono break-all">{webhookUrl}</span>
              </p>
              {webhook.data && (
                <p className={`flex items-center gap-1.5 text-xs ${webhook.data.coincide ? 'text-success' : 'text-warning'}`}>
                  {webhook.data.coincide ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  {webhook.data.coincide
                    ? 'Registrado correctamente en Signapis.'
                    : webhook.data.actual?.url
                      ? `Signapis tiene otra URL registrada: ${webhook.data.actual.url}`
                      : 'Aún no está registrado en Signapis.'}
                </p>
              )}
              {webhook.error && (
                <p className="text-xs text-destructive">{apiErrorMessage(webhook.error, 'No se pudo consultar el webhook')}</p>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={() => registrar.mutate()}
                  disabled={registrar.isPending || !proveedor.configurado}
                >
                  {registrar.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Webhook className="h-4 w-4 mr-1.5" />}
                  Registrar webhook
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => probarWebhook.mutate()}
                  disabled={probarWebhook.isPending || !proveedor.configurado}
                >
                  {probarWebhook.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
                  Enviar prueba
                </Button>
                <Button size="sm" variant="ghost" onClick={() => webhook.refetch()} disabled={!proveedor.configurado}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
