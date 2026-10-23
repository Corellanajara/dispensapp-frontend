import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { MovementType, Product, Cosecha } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Warehouse, History, ArrowLeftRight } from 'lucide-react';
import { MOVEMENT_TYPE_LABELS, PRODUCT_STATUS_LABELS, PRODUCT_STATUS_VARIANTS, UBICACION_TIPO_LABELS } from '@/lib/constants';
import { formatDateOnly, formatDateTime, daysUntil, personName } from '@/lib/format';
import { apiErrorMessage } from '@/services/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { NativeSelect } from '@/components/inventory/NativeSelect';
import { populated, ubicacionLabel, nombreDe } from '@/components/inventory/helpers';
import { Spinner } from '@/components/inventory/Spinner';
import { MovimientoDialog } from '@/components/inventory/MovimientoDialog';
import { LotTimeline } from '@/components/inventory/LotTimeline';
import { useAuth } from '@/contexts/AuthContext';
import { useStock, useStockPorUbicacion, useInventoryMovements, useTraceability } from '@/hooks/use-inventory';
import { useUbicaciones } from '@/hooks/use-ubicaciones';

const TYPE_COLORS: Record<MovementType, string> = {
  produccion: 'bg-blue-100 text-blue-800',
  cosecha: 'bg-emerald-100 text-emerald-800',
  ingreso: 'bg-green-100 text-green-800',
  ajuste: 'bg-yellow-100 text-yellow-800',
  merma: 'bg-red-100 text-red-800',
  dispensacion: 'bg-purple-100 text-purple-800',
  transferencia_salida: 'bg-orange-100 text-orange-800',
  transferencia_entrada: 'bg-sky-100 text-sky-800',
  transferencia_anulada: 'bg-gray-100 text-gray-800',
  venta: 'bg-purple-100 text-purple-800',
  transferencia: 'bg-gray-100 text-gray-800',
};

export function InventoryPage() {
  const { hasRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const loteParam = searchParams.get('lote') ?? '';
  const [tab, setTab] = useState(loteParam ? 'traceability' : 'stock');
  const [movOpen, setMovOpen] = useState(false);

  // Si llega un ?lote= nuevo (enlace desde otra fila o pantalla), mostrar la trazabilidad.
  const [loteVisto, setLoteVisto] = useState(loteParam);
  if (loteParam !== loteVisto) {
    setLoteVisto(loteParam);
    if (loteParam) setTab('traceability');
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader title="Inventario" description="Existencias por lote y ubicación, movimientos y trazabilidad">
        <Link to="/transferencias">
          <Button variant="outline"><ArrowLeftRight className="h-4 w-4 mr-2" />Transferencias</Button>
        </Link>
        {hasRole('admin', 'operador') && (
          <Button onClick={() => setMovOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Registrar movimiento
          </Button>
        )}
      </PageHeader>

      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsList>
          <TabsTrigger value="stock">Stock actual</TabsTrigger>
          <TabsTrigger value="movements">Movimientos</TabsTrigger>
          <TabsTrigger value="traceability">Trazabilidad</TabsTrigger>
        </TabsList>
        <TabsContent value="stock">
          <StockTab />
        </TabsContent>
        <TabsContent value="movements">
          <MovimientosTab />
        </TabsContent>
        <TabsContent value="traceability">
          <TrazabilidadTab
            key={loteParam}
            lote={loteParam}
            onBuscar={(l) => setSearchParams(l ? { lote: l } : {})}
            verDispensaciones={!hasRole('cultivo')}
          />
        </TabsContent>
      </Tabs>

      <MovimientoDialog open={movOpen} onOpenChange={setMovOpen} />
    </div>
  );
}

// ─── Stock ─────────────────────────────────────────────────

function StockTab() {
  const [ubicacion, setUbicacion] = useState('');
  const [soloConStock, setSoloConStock] = useState(true);
  const params: Record<string, string> = {};
  if (ubicacion) params.ubicacion = ubicacion;
  if (soloConStock) params.conStock = 'true';

  const { data: stock = [], isLoading } = useStock(params);
  const { data: resumen = [] } = useStockPorUbicacion();
  const { data: ubicaciones = [] } = useUbicaciones();

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {resumen.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {resumen.map((r) => {
              const id = r.ubicacion?._id ?? 'ninguna';
              const activo = ubicacion === id;
              return (
                <button
                  key={`${r.sucursal}-${id}`}
                  type="button"
                  onClick={() => setUbicacion(activo ? '' : id)}
                  className={`rounded-xl border px-3 py-2 text-left text-xs transition-colors ${activo ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                >
                  <p className="font-medium">{r.ubicacion ? `${r.ubicacion.nombre} · ${r.ubicacion.codigo}` : 'Stock general'}</p>
                  <p className="text-muted-foreground">
                    {r.disponible} disp. · {r.reservado} reserv. · {r.cantidadLotes} lote{r.cantidadLotes === 1 ? '' : 's'}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <NativeSelect value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} className="sm:w-72">
            <option value="">Todas las ubicaciones</option>
            <option value="ninguna">Stock general del dispensario</option>
            {ubicaciones.map((u) => (
              <option key={u._id} value={u._id}>{u.nombre} · {u.codigo} ({UBICACION_TIPO_LABELS[u.tipo]})</option>
            ))}
          </NativeSelect>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={soloConStock} onChange={(e) => setSoloConStock(e.target.checked)} />
            Ocultar lotes sin stock
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          Solo se puede dispensar el stock general o el que está en una ubicación de tipo dispensario.
        </p>

        {isLoading ? (
          <Spinner />
        ) : stock.length === 0 ? (
          <EmptyState icon={Warehouse} title="Sin stock" description="No hay existencias con este filtro." />
        ) : (
          <>
            <div className="md:hidden space-y-3">
              {stock.map((s) => (
                <div key={s._id} className="rounded-xl border p-4">
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-medium">{nombreDe(populated<Product>(s.producto), 'Producto')}</p>
                    <StatusBadge label={PRODUCT_STATUS_LABELS[s.estado]} variant={PRODUCT_STATUS_VARIANTS[s.estado]} />
                  </div>
                  <Link to={`/inventario?lote=${encodeURIComponent(s.lote)}`} className="font-mono text-xs text-primary">{s.lote}</Link>
                  <p className="text-sm text-muted-foreground">{ubicacionLabel(s.ubicacion)}</p>
                  <div className="flex justify-between mt-2 text-sm">
                    <span>Disponible: <strong>{s.cantidadDisponible}</strong></span>
                    <span>Reservado: <strong>{s.cantidadReservada}</strong></span>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto rounded-2xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead className="text-right">Disponible</TableHead>
                    <TableHead className="text-right">Reservado</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Cosecha</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stock.map((s) => {
                    const dias = daysUntil(s.fechaVencimiento);
                    const cosecha = populated<Pick<Cosecha, '_id' | 'lote' | 'fecha'>>(s.cosecha);
                    return (
                      <TableRow key={s._id}>
                        <TableCell className="font-medium">{nombreDe(populated<Product>(s.producto), 'Producto')}</TableCell>
                        <TableCell>
                          <Link to={`/inventario?lote=${encodeURIComponent(s.lote)}`} className="font-mono text-xs text-primary hover:underline">
                            {s.lote}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm">{ubicacionLabel(s.ubicacion)}</TableCell>
                        <TableCell className="text-right">{s.cantidadDisponible}</TableCell>
                        <TableCell className="text-right">{s.cantidadReservada}</TableCell>
                        <TableCell className={dias != null && dias < 30 ? 'text-destructive' : ''}>
                          {formatDateOnly(s.fechaVencimiento)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{cosecha ? formatDateOnly(cosecha.fecha) : '—'}</TableCell>
                        <TableCell>
                          <StatusBadge label={PRODUCT_STATUS_LABELS[s.estado]} variant={PRODUCT_STATUS_VARIANTS[s.estado]} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Movimientos ───────────────────────────────────────────

function MovimientosTab() {
  const [page, setPage] = useState(1);
  const [tipo, setTipo] = useState('');
  const [lote, setLote] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const params = useMemo(() => {
    const p: Record<string, string> = { page: String(page), limit: '20' };
    if (tipo) p.tipo = tipo;
    if (lote.trim()) p.lote = lote.trim();
    if (desde) p.desde = desde;
    if (hasta) p.hasta = hasta;
    return p;
  }, [page, tipo, lote, desde, hasta]);

  const { data, isLoading } = useInventoryMovements(params);
  const movements = data?.data ?? [];

  const filtro = (fn: () => void) => {
    fn();
    setPage(1);
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs">Tipo</Label>
            <NativeSelect value={tipo} onChange={(e) => filtro(() => setTipo(e.target.value))}>
              <option value="">Todos</option>
              {Object.entries(MOVEMENT_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Lote</Label>
            <Input value={lote} onChange={(e) => filtro(() => setLote(e.target.value))} placeholder="LOT-..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Desde</Label>
            <Input type="date" value={desde} onChange={(e) => filtro(() => setDesde(e.target.value))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Hasta</Label>
            <Input type="date" value={hasta} onChange={(e) => filtro(() => setHasta(e.target.value))} />
          </div>
        </div>

        {isLoading ? (
          <Spinner />
        ) : movements.length === 0 ? (
          <EmptyState icon={History} title="No hay movimientos" />
        ) : (
          <>
            <div className="md:hidden space-y-3">
              {movements.map((m) => (
                <div key={m._id} className="rounded-xl border p-4">
                  <div className="flex justify-between items-start gap-2">
                    <Badge className={TYPE_COLORS[m.tipo]}>{MOVEMENT_TYPE_LABELS[m.tipo] ?? m.tipo}</Badge>
                    <span className={`font-medium text-sm ${m.cantidad >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {m.cantidad >= 0 ? '+' : ''}{m.cantidad}
                    </span>
                  </div>
                  <p className="font-medium mt-2">{nombreDe(populated<Product>(m.producto))}</p>
                  <p className="text-xs font-mono text-muted-foreground">Lote {m.lote} · {ubicacionLabel(m.ubicacion)}</p>
                  <p className="text-sm mt-2">{m.motivo}</p>
                  <p className="text-xs text-muted-foreground mt-2">{formatDateTime(m.createdAt)} · {personName(m.usuario)}</p>
                </div>
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto rounded-2xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Antes → después</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Usuario</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m._id}>
                      <TableCell className="whitespace-nowrap text-xs">{formatDateTime(m.createdAt)}</TableCell>
                      <TableCell>{nombreDe(populated<Product>(m.producto))}</TableCell>
                      <TableCell><Badge className={TYPE_COLORS[m.tipo]}>{MOVEMENT_TYPE_LABELS[m.tipo] ?? m.tipo}</Badge></TableCell>
                      <TableCell>
                        <Link to={`/inventario?lote=${encodeURIComponent(m.lote)}`} className="font-mono text-xs text-primary hover:underline">
                          {m.lote}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs">{ubicacionLabel(m.ubicacion)}</TableCell>
                      <TableCell className={`text-right font-medium ${m.cantidad >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {m.cantidad >= 0 ? '+' : ''}{m.cantidad}
                      </TableCell>
                      <TableCell className="text-right text-xs whitespace-nowrap">{m.cantidadAnterior} → {m.cantidadNueva}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs">{m.motivo}</TableCell>
                      <TableCell className="text-xs">{personName(m.usuario)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">Total: {data?.pagination.total ?? 0}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!data || page >= data.pagination.pages}
              onClick={() => setPage(page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Trazabilidad ──────────────────────────────────────────

function TrazabilidadTab({
  lote,
  onBuscar,
  verDispensaciones,
}: {
  lote: string;
  onBuscar: (lote: string) => void;
  verDispensaciones: boolean;
}) {
  const [texto, setTexto] = useState(lote);
  const { data, isLoading, error } = useTraceability(lote);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Trazabilidad por lote</CardTitle>
        <p className="text-sm text-muted-foreground">
          Del cultivo a la dispensación: paciente y espacio de origen, traslados, stock actual y a quién se dispensó.
        </p>
        <form
          className="flex gap-2 mt-2"
          onSubmit={(e) => {
            e.preventDefault();
            onBuscar(texto.trim());
          }}
        >
          <Input placeholder="Código de lote..." value={texto} onChange={(e) => setTexto(e.target.value)} className="max-w-sm rounded-xl font-mono" />
          <Button type="submit"><Search className="h-4 w-4 mr-2" />Buscar</Button>
        </form>
      </CardHeader>
      <CardContent>
        {!lote ? (
          <p className="text-center text-sm text-muted-foreground/70 py-12">Ingresa un código de lote para ver su historia.</p>
        ) : isLoading ? (
          <Spinner />
        ) : error || !data ? (
          <p className="text-center text-sm text-destructive py-12">{apiErrorMessage(error, 'No se pudo cargar la trazabilidad')}</p>
        ) : !data.producto && !data.cosecha && data.movimientos.length === 0 && data.stock.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">No hay registros para el lote {lote}.</p>
        ) : (
          <LotTimeline data={data} verDispensaciones={verDispensaciones} />
        )}
      </CardContent>
    </Card>
  );
}
