import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import type { PatientRef, Product } from '@/types';
import { cultivoAPI, apiErrorMessage } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Pencil, Lock, RefreshCw, Wheat, MapPin } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { NativeSelect } from '@/components/inventory/NativeSelect';
import { populated, ubicacionLabel, sucursalLabel, nombreDe } from '@/components/inventory/helpers';
import { Spinner } from '@/components/inventory/Spinner';
import { EspacioQRCode } from '@/components/cultivo/EspacioQRCode';
import { RegistrarCosechaDialog } from '@/components/cultivo/CultivoDialogs';
import { ESPACIO_ESTADO_LABELS, COSECHA_ESTADO_LABELS, PATIENT_STATUS_LABELS } from '@/lib/constants';
import { formatDateOnly, formatNumber, personName } from '@/lib/format';
import { useAuth } from '@/contexts/AuthContext';
import { useEspacio, useCultivoMutation } from '@/hooks/use-cultivo';
import { useUbicaciones } from '@/hooks/use-ubicaciones';

export function EspacioDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  const puedeOperar = hasRole('admin', 'operador', 'cultivo');
  const esAdmin = hasRole('admin');

  const { data, isLoading, error } = useEspacio(id);
  const [editOpen, setEditOpen] = useState(false);
  const [cerrarOpen, setCerrarOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  // ?cosecha=1 abre el registro de cosecha directo (lo usa el botón de la pantalla del QR)
  const [searchParams] = useSearchParams();
  const [cosechaOpen, setCosechaOpen] = useState(searchParams.get('cosecha') === '1');

  const actualizar = useCultivoMutation(
    (vars: Parameters<typeof cultivoAPI.actualizarEspacio>[1]) => cultivoAPI.actualizarEspacio(id, vars),
    'Espacio actualizado',
    'Error al actualizar el espacio'
  );
  const cerrar = useCultivoMutation(() => cultivoAPI.cerrarEspacio(id), 'Espacio cerrado', 'Error al cerrar el espacio');
  const regenerar = useCultivoMutation(() => cultivoAPI.regenerarQR(id), 'QR nuevo generado. Imprime la etiqueta otra vez.', 'Error al regenerar el QR');

  const { data: salas = [] } = useUbicaciones({ tipo: 'sala_cultivo', activo: 'true' }, editOpen);

  if (isLoading) return <Spinner className="py-20" />;
  if (error || !data) {
    return (
      <div className="text-center py-20 space-y-3">
        <p className="text-muted-foreground">{apiErrorMessage(error, 'Espacio no encontrado')}</p>
        <Link to="/cultivo"><Button variant="outline">Volver a Cultivo</Button></Link>
      </div>
    );
  }

  const { espacio, cosechas } = data;
  const paciente = populated<PatientRef>(espacio.paciente);
  const activo = espacio.estado === 'activo';

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    actualizar.mutate(
      {
        flor: String(f.get('flor')),
        metrosCuadrados: Number(f.get('metrosCuadrados')),
        ubicacion: String(f.get('ubicacion') || '') || undefined,
        observaciones: String(f.get('observaciones') || ''),
      },
      { onSuccess: () => setEditOpen(false) }
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/cultivo">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Volver</Button>
        </Link>
        <h1 className="text-2xl font-semibold font-mono">{espacio.codigo}</h1>
        <StatusBadge
          label={ESPACIO_ESTADO_LABELS[espacio.estado]}
          variant={activo ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}
        />
      </div>

      {puedeOperar && activo && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setCosechaOpen(true)}><Wheat className="h-4 w-4 mr-2" />Registrar cosecha</Button>
          <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4 mr-2" />Editar</Button>
          <Button variant="outline" onClick={() => setCerrarOpen(true)}><Lock className="h-4 w-4 mr-2" />Cerrar espacio</Button>
          {esAdmin && (
            <Button variant="outline" onClick={() => setQrOpen(true)}><RefreshCw className="h-4 w-4 mr-2" />Regenerar QR</Button>
          )}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-lg">Espacio</CardTitle></CardHeader>
          <CardContent className="grid gap-x-6 gap-y-3 sm:grid-cols-2 text-sm">
            <Dato label="Paciente">
              {paciente ? (
                <>
                  {paciente.nombre} {paciente.apellido}
                  <span className="block font-mono text-xs text-muted-foreground">{paciente.rut}</span>
                  {paciente.estado && (
                    <span className="block text-xs text-muted-foreground">Estado: {PATIENT_STATUS_LABELS[paciente.estado]}</span>
                  )}
                </>
              ) : '—'}
            </Dato>
            <Dato label="Ubicación física">
              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{ubicacionLabel(espacio.ubicacion)}</span>
              <span className="block text-xs text-muted-foreground">{sucursalLabel(espacio.sucursal)}</span>
            </Dato>
            <Dato label="Flor o variedad">{espacio.flor}</Dato>
            <Dato label="Superficie">{espacio.metrosCuadrados} m²</Dato>
            <Dato label="Inicio">{formatDateOnly(espacio.fechaInicio)}</Dato>
            {espacio.fechaCierre && <Dato label="Cierre">{formatDateOnly(espacio.fechaCierre)}</Dato>}
            <Dato label="Creado por">{personName(espacio.creadoPor)}</Dato>
            {espacio.observaciones && (
              <div className="sm:col-span-2">
                <Dato label="Observaciones"><span className="whitespace-pre-wrap">{espacio.observaciones}</span></Dato>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Código QR</CardTitle></CardHeader>
          <CardContent>
            <EspacioQRCode espacio={espacio} size={180} />
            <p className="mt-3 text-xs text-muted-foreground text-center">
              La etiqueta no muestra datos del paciente. Al escanearla, el personal ve el espacio y su ubicación.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Cosechas ({cosechas.length})</CardTitle></CardHeader>
        <CardContent>
          {cosechas.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Este espacio aún no tiene cosechas.</p>
          ) : (
            <div className="rounded-xl border divide-y">
              {cosechas.map((c) => (
                <div key={c._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 text-sm">
                  <div>
                    <Link to={`/inventario?lote=${encodeURIComponent(c.lote)}`} className="font-mono text-xs text-primary hover:underline">
                      {c.lote}
                    </Link>
                    <p className="text-muted-foreground">
                      {formatDateOnly(c.fecha)} · húmedo {c.pesoHumedo != null ? `${formatNumber(c.pesoHumedo)} g` : '—'} · seco{' '}
                      {c.pesoSeco != null ? `${formatNumber(c.pesoSeco)} g` : '—'}
                    </p>
                    {c.responsable && <p className="text-xs text-muted-foreground">Registró: {personName(c.responsable)}</p>}
                  </div>
                  <div className="sm:text-right">
                    <StatusBadge
                      label={COSECHA_ESTADO_LABELS[c.estado]}
                      variant={c.estado === 'en_inventario' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}
                    />
                    {c.estado === 'en_inventario' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {nombreDe(populated<Pick<Product, '_id' | 'nombre'>>(c.producto))} · {c.cantidadIngresada} · {ubicacionLabel(c.ubicacionDestino)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {cosechas.some((c) => c.estado === 'registrada') && (
            <p className="text-xs text-muted-foreground mt-3">
              Las cosechas pendientes se ingresan a inventario desde <Link to="/cultivo" className="underline">Cultivo → Cosechas</Link>.
            </p>
          )}
        </CardContent>
      </Card>

      <RegistrarCosechaDialog espacio={espacio} open={cosechaOpen} onOpenChange={setCosechaOpen} />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar espacio</DialogTitle>
            <DialogDescription>El código QR se mantiene aunque cambie la sala.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de flor o variedad</Label>
              <Input name="flor" defaultValue={espacio.flor} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Metros cuadrados</Label>
                <Input name="metrosCuadrados" type="number" min="0.01" step="0.01" defaultValue={espacio.metrosCuadrados} required />
              </div>
              <div className="space-y-2">
                <Label>Sala</Label>
                <NativeSelect name="ubicacion" defaultValue={populated(espacio.ubicacion)?._id ?? ''}>
                  {salas.map((s) => (
                    <option key={s._id} value={s._id}>{s.nombre} · {s.codigo}</option>
                  ))}
                  {salas.length === 0 && <option value="">{ubicacionLabel(espacio.ubicacion)}</option>}
                </NativeSelect>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Textarea name="observaciones" defaultValue={espacio.observaciones} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={actualizar.isPending}>Guardar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={cerrarOpen} onOpenChange={setCerrarOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar este espacio?</AlertDialogTitle>
            <AlertDialogDescription>
              Ya no se podrán registrar cosechas en él. Las cosechas y su trazabilidad se conservan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => cerrar.mutate(undefined, { onSuccess: () => setCerrarOpen(false) })}>
              Cerrar espacio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={qrOpen} onOpenChange={setQrOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Generar un QR nuevo?</AlertDialogTitle>
            <AlertDialogDescription>
              Las etiquetas impresas con el QR actual dejarán de funcionar. Úsalo si una etiqueta se perdió o se copió. Después
              imprime la etiqueta nueva.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => regenerar.mutate(undefined, { onSuccess: () => setQrOpen(false) })}>
              Generar QR nuevo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="font-medium">{children}</div>
    </div>
  );
}
