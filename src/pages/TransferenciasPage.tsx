import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product, Transferencia } from '@/types';
import { transferenciasAPI } from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeftRight, ArrowRight, Plus, PackageCheck, Ban } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { NativeSelect } from '@/components/inventory/NativeSelect';
import { populated, sucursalLabel, ubicacionLabel } from '@/components/inventory/helpers';
import { Spinner } from '@/components/inventory/Spinner';
import { TRANSFERENCIA_ESTADO_LABELS, TRANSFERENCIA_ESTADO_VARIANTS, UBICACION_TIPO_LABELS } from '@/lib/constants';
import { formatDateTime, formatDateOnly, personName } from '@/lib/format';
import { useAuth } from '@/contexts/AuthContext';
import { useTransferencias, useTransferenciaMutation } from '@/hooks/use-transferencias';
import { useUbicaciones } from '@/hooks/use-ubicaciones';
import { useStock } from '@/hooks/use-inventory';

function lugar(s: Transferencia['sucursalOrigen'], u: Transferencia['ubicacionOrigen']) {
  const suc = populated(s);
  return { sucursal: suc ? suc.codigo : '—', ubicacion: ubicacionLabel(u) };
}

export function TransferenciasPage() {
  const { hasRole } = useAuth();
  const puedeEnviar = hasRole('admin', 'operador', 'cultivo', 'produccion');
  const puedeAnular = hasRole('admin', 'operador');

  const [estado, setEstado] = useState('');
  const [page, setPage] = useState(1);
  const params: Record<string, string> = { page: String(page), limit: '20' };
  if (estado) params.estado = estado;
  const { data, isLoading } = useTransferencias(params);
  const lista = data?.data ?? [];

  const [nuevaOpen, setNuevaOpen] = useState(false);
  const [detalle, setDetalle] = useState<Transferencia | null>(null);
  const [recibir, setRecibir] = useState<Transferencia | null>(null);
  const [anular, setAnular] = useState<Transferencia | null>(null);

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader title="Transferencias" description="Traslados trazables entre salas, bodegas y dispensarios">
        {puedeEnviar && (
          <Button onClick={() => setNuevaOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva transferencia
          </Button>
        )}
      </PageHeader>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <NativeSelect value={estado} onChange={(e) => { setEstado(e.target.value); setPage(1); }} className="sm:w-56">
            <option value="">Todos los estados</option>
            {Object.entries(TRANSFERENCIA_ESTADO_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </NativeSelect>

          {isLoading ? (
            <Spinner />
          ) : lista.length === 0 ? (
            <EmptyState icon={ArrowLeftRight} title="No hay transferencias" description="Envía stock de una sala o bodega al dispensario para poder dispensarlo." />
          ) : (
            <div className="overflow-x-auto rounded-2xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Origen → destino</TableHead>
                    <TableHead className="text-right">Ítems</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="hidden lg:table-cell">Enviado</TableHead>
                    <TableHead className="hidden lg:table-cell">Recibido</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lista.map((t) => {
                    const o = lugar(t.sucursalOrigen, t.ubicacionOrigen);
                    const d = lugar(t.sucursalDestino, t.ubicacionDestino);
                    return (
                      <TableRow key={t._id} className="cursor-pointer" onClick={() => setDetalle(t)}>
                        <TableCell className="font-mono text-xs">{t.codigo}</TableCell>
                        <TableCell className="text-sm">
                          <span className="inline-flex flex-wrap items-center gap-1">
                            <span>{o.ubicacion} <span className="text-xs text-muted-foreground">({o.sucursal})</span></span>
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{d.ubicacion} <span className="text-xs text-muted-foreground">({d.sucursal})</span></span>
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{t.items.length}</TableCell>
                        <TableCell>
                          <StatusBadge label={TRANSFERENCIA_ESTADO_LABELS[t.estado]} variant={TRANSFERENCIA_ESTADO_VARIANTS[t.estado]} />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs">
                          {personName(t.enviadoPor)}
                          <span className="block text-muted-foreground">{formatDateTime(t.fechaEnvio)}</span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs">
                          {t.fechaRecepcion ? (
                            <>
                              {personName(t.recibidoPor)}
                              <span className="block text-muted-foreground">{formatDateTime(t.fechaRecepcion)}</span>
                            </>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          {t.estado === 'en_transito' && (
                            <div className="flex justify-end gap-1">
                              {puedeEnviar && (
                                <Button variant="outline" size="sm" onClick={() => setRecibir(t)}>
                                  <PackageCheck className="h-4 w-4 mr-1" />Recibir
                                </Button>
                              )}
                              {puedeAnular && (
                                <Button variant="ghost" size="sm" title="Anular" onClick={() => setAnular(t)}>
                                  <Ban className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {data && data.pagination.pages > 1 && (
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Total: {data.pagination.total}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
                <Button variant="outline" size="sm" disabled={page >= data.pagination.pages} onClick={() => setPage(page + 1)}>Siguiente</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <NuevaTransferenciaDialog open={nuevaOpen} onOpenChange={setNuevaOpen} />
      <DetalleSheet t={detalle} onClose={() => setDetalle(null)} />
      <RecibirDialog t={recibir} onClose={() => setRecibir(null)} />
      <AnularDialog t={anular} onClose={() => setAnular(null)} />
    </div>
  );
}

// ─── Nueva transferencia ───────────────────────────────────

function NuevaTransferenciaDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user, sucursalActiva } = useAuth();
  const [origen, setOrigen] = useState('ninguna');
  const [cantidades, setCantidades] = useState<Record<string, string>>({});
  const [sucursalDestino, setSucursalDestino] = useState('');
  const [ubicacionDestino, setUbicacionDestino] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const { data: ubicaciones = [] } = useUbicaciones({ activo: 'true' }, open);
  const { data: filas = [], isLoading: cargandoStock } = useStock({ ubicacion: origen, conStock: 'true' }, open);
  const disponibles = filas.filter((f) => f.cantidadDisponible > 0);

  const destinoSucursal = sucursalDestino || sucursalActiva?._id || '';
  const mismaSucursal = destinoSucursal === sucursalActiva?._id;
  const destinoIgualOrigen = mismaSucursal && (ubicacionDestino || 'ninguna') === origen;

  const items = useMemo(
    () =>
      Object.entries(cantidades)
        .map(([stock, c]) => ({ stock, cantidad: Number(c) }))
        .filter((i) => i.cantidad > 0),
    [cantidades]
  );
  const excedido = items.some((i) => {
    const f = filas.find((x) => x._id === i.stock);
    return !f || i.cantidad > f.cantidadDisponible;
  });

  const reset = () => {
    setOrigen('ninguna');
    setCantidades({});
    setSucursalDestino('');
    setUbicacionDestino('');
    setObservaciones('');
  };

  const enviar = useTransferenciaMutation(transferenciasAPI.enviar, 'Transferencia enviada. Queda en tránsito hasta que el destino la reciba.', 'Error al enviar la transferencia');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    enviar.mutate(
      {
        items,
        sucursalDestino: mismaSucursal ? undefined : destinoSucursal,
        ubicacionDestino: mismaSucursal ? ubicacionDestino || undefined : undefined,
        observaciones: observaciones || undefined,
      },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      }
    );
  };

  const toggleFila = (id: string, checked: boolean, max: number) => {
    setCantidades((prev) => {
      const next = { ...prev };
      if (checked) next[id] = String(max);
      else delete next[id];
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva transferencia</DialogTitle>
          <DialogDescription>
            Sale de {sucursalActiva?.nombre ?? 'la sucursal activa'}. El stock queda en tránsito hasta que el destino confirme la recepción.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Origen</Label>
            <NativeSelect value={origen} onChange={(e) => { setOrigen(e.target.value); setCantidades({}); }}>
              <option value="ninguna">Stock general del dispensario</option>
              {ubicaciones.map((u) => (
                <option key={u._id} value={u._id}>{u.nombre} · {u.codigo} ({UBICACION_TIPO_LABELS[u.tipo]})</option>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-2">
            <Label>Qué se traslada</Label>
            {cargandoStock ? (
              <Spinner className="py-4" />
            ) : disponibles.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-xl border p-4">No hay stock disponible en este origen.</p>
            ) : (
              <div className="rounded-xl border divide-y">
                {disponibles.map((f) => {
                  const checked = f._id in cantidades;
                  const prod = populated<Product>(f.producto);
                  return (
                    <div key={f._id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                      <Checkbox checked={checked} onCheckedChange={(v) => toggleFila(f._id, !!v, f.cantidadDisponible)} />
                      <div className="flex-1 min-w-[10rem]">
                        <p className="font-medium">{prod?.nombre ?? 'Producto'}</p>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-mono">{f.lote}</span> · disponible {f.cantidadDisponible}
                          {f.fechaVencimiento ? ` · vence ${formatDateOnly(f.fechaVencimiento)}` : ''}
                        </p>
                      </div>
                      {checked && (
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          max={f.cantidadDisponible}
                          className="w-28"
                          value={cantidades[f._id]}
                          onChange={(e) => setCantidades((p) => ({ ...p, [f._id]: e.target.value }))}
                          aria-label="Cantidad a trasladar"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {excedido && <p className="text-xs text-destructive">Una cantidad supera lo disponible.</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Sucursal de destino</Label>
              <NativeSelect value={destinoSucursal} onChange={(e) => { setSucursalDestino(e.target.value); setUbicacionDestino(''); }}>
                {(user?.sucursales ?? []).map((s) => (
                  <option key={s._id} value={s._id}>{s.nombre} ({s.codigo})</option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label>Ubicación de destino</Label>
              <NativeSelect value={ubicacionDestino} onChange={(e) => setUbicacionDestino(e.target.value)} disabled={!mismaSucursal}>
                <option value="">Stock general del dispensario</option>
                {mismaSucursal &&
                  ubicaciones
                    .filter((u) => u._id !== origen)
                    .map((u) => (
                      <option key={u._id} value={u._id}>{u.nombre} · {u.codigo} ({UBICACION_TIPO_LABELS[u.tipo]})</option>
                    ))}
              </NativeSelect>
              {!mismaSucursal && (
                <p className="text-xs text-muted-foreground">En otra sucursal llega a su stock general; allá se puede mover a una ubicación.</p>
              )}
            </div>
          </div>
          {destinoIgualOrigen && <p className="text-xs text-destructive">El destino es el mismo lugar que el origen.</p>}

          <div className="space-y-2">
            <Label>Observaciones (opcional)</Label>
            <Textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={enviar.isPending || items.length === 0 || excedido || destinoIgualOrigen}>
              Enviar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Detalle, recibir y anular ─────────────────────────────

function DetalleSheet({ t, onClose }: { t: Transferencia | null; onClose: () => void }) {
  return (
    <Sheet open={!!t} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {t && (
          <>
            <SheetHeader>
              <SheetTitle className="font-mono">{t.codigo}</SheetTitle>
              <SheetDescription>{TRANSFERENCIA_ESTADO_LABELS[t.estado]}</SheetDescription>
            </SheetHeader>
            <div className="space-y-5 px-4 pb-6 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Origen</p>
                  <p className="font-medium">{ubicacionLabel(t.ubicacionOrigen)}</p>
                  <p className="text-xs text-muted-foreground">{sucursalLabel(t.sucursalOrigen)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Destino</p>
                  <p className="font-medium">{ubicacionLabel(t.ubicacionDestino)}</p>
                  <p className="text-xs text-muted-foreground">{sucursalLabel(t.sucursalDestino)}</p>
                </div>
              </div>
              <div className="rounded-xl border divide-y">
                {t.items.map((i, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{i.nombre}</p>
                      <Link to={`/inventario?lote=${encodeURIComponent(i.lote)}`} className="font-mono text-xs text-primary hover:underline">
                        {i.lote}
                      </Link>
                    </div>
                    <p className="font-medium">{i.cantidad}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Enviado por {personName(t.enviadoPor)} · {formatDateTime(t.fechaEnvio)}</p>
                {t.fechaRecepcion && <p>Recibido por {personName(t.recibidoPor)} · {formatDateTime(t.fechaRecepcion)}</p>}
                {t.fechaAnulacion && <p>Anulado por {personName(t.anuladoPor)} · {formatDateTime(t.fechaAnulacion)}</p>}
              </div>
              {t.observaciones && <p className="whitespace-pre-wrap rounded-xl bg-muted/50 p-3">{t.observaciones}</p>}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function RecibirDialog({ t, onClose }: { t: Transferencia | null; onClose: () => void }) {
  const [obs, setObs] = useState('');
  const recibir = useTransferenciaMutation(
    ({ id, observaciones }: { id: string; observaciones?: string }) => transferenciasAPI.recibir(id, observaciones),
    'Transferencia recibida. El stock ya está en el destino.',
    'Error al recibir la transferencia'
  );
  return (
    <Dialog open={!!t} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar recepción</DialogTitle>
          <DialogDescription>
            Confirma que llegó todo lo enviado en {t?.codigo}: {t?.items.map((i) => `${i.cantidad} × ${i.nombre}`).join(', ')}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Observaciones (opcional)</Label>
          <Textarea value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={recibir.isPending}
            onClick={() => t && recibir.mutate({ id: t._id, observaciones: obs || undefined }, { onSuccess: () => { setObs(''); onClose(); } })}
          >
            Recibir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AnularDialog({ t, onClose }: { t: Transferencia | null; onClose: () => void }) {
  const [motivo, setMotivo] = useState('');
  const anular = useTransferenciaMutation(
    ({ id, motivo }: { id: string; motivo?: string }) => transferenciasAPI.anular(id, motivo),
    'Transferencia anulada. El stock volvió al origen.',
    'Error al anular la transferencia'
  );
  return (
    <Dialog open={!!t} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anular transferencia {t?.codigo}</DialogTitle>
          <DialogDescription>El stock vuelve a su origen. Queda registrado quién la anuló y por qué.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Motivo</Label>
          <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} required />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            variant="destructive"
            disabled={anular.isPending || !motivo.trim()}
            onClick={() => t && anular.mutate({ id: t._id, motivo }, { onSuccess: () => { setMotivo(''); onClose(); } })}
          >
            Anular
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
