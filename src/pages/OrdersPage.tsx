import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ordersAPI, apiErrorMessage } from '@/services/api';
import type { Order, Patient, SucursalRef } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ORDER_STATUS_LABELS, ORDER_STATUS_VARIANTS, DELIVERY_TYPE_LABELS, ORDERS_LABEL } from '@/lib/constants';
import { formatCurrency, formatDateShort } from '@/lib/format';
import { useAppConfig } from '@/hooks/use-app-config';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CreateOrderDialog } from '@/components/orders/CreateOrderDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Eye } from 'lucide-react';
import { toast } from 'sonner';

function patientName(p: string | Patient | null | undefined) {
  if (p == null) return '—';
  return typeof p === 'string' ? p : `${p.nombre ?? ''} ${p.apellido ?? ''}`.trim() || '—';
}

function sucursalName(s: Order['sucursal']) {
  if (!s || typeof s === 'string') return '—';
  return (s as SucursalRef).codigo || (s as SucursalRef).nombre;
}

function unidades(o: Order) {
  return o.items.reduce((sum, i) => sum + i.cantidad, 0);
}

export function OrdersPage() {
  const { pagosHabilitados } = useAppConfig();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = { page: page.toString(), limit: '20' };
      if (statusFilter) params.estado = statusFilter;
      const { data } = await ordersAPI.list(params);
      setOrders(data.data);
      setTotal(data.pagination.total);
      setPages(data.pagination.pages || 1);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error al cargar las notas'));
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader title={ORDERS_LABEL} description="Entregas de producto a pacientes, con descuento de inventario por lote">
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Nueva nota
        </Button>
      </PageHeader>

      <CreateOrderDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} onCreated={fetchOrders} />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Select
              value={statusFilter || 'all'}
              onValueChange={(v: string | null) => { setStatusFilter(v === 'all' || !v ? '' : v); setPage(1); }}
            >
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Estado">{(v: string) => (v && v !== 'all' ? ORDER_STATUS_LABELS[v as keyof typeof ORDER_STATUS_LABELS] ?? v : 'Todos los estados')}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <>
              {/* Móvil */}
              <div className="md:hidden space-y-3">
                {orders.length === 0 ? (
                  <p className="text-center py-12 text-sm text-muted-foreground/70">No hay notas de dispensación</p>
                ) : (
                  orders.map((o) => (
                    <Link key={o._id} to={`/pedidos/${o._id}`} className="block">
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start gap-2">
                            <p className="font-mono font-medium">{o.numeroPedido}</p>
                            <StatusBadge label={ORDER_STATUS_LABELS[o.estado]} variant={ORDER_STATUS_VARIANTS[o.estado]} />
                          </div>
                          <p className="text-sm mt-1">{patientName(o.paciente)}</p>
                          <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                            <span>{unidades(o)} unidades · {sucursalName(o.sucursal)}</span>
                            <span className="text-xs">{formatDateShort(o.createdAt)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))
                )}
              </div>

              {/* Escritorio */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N° nota</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Dispensario</TableHead>
                      <TableHead>Productos</TableHead>
                      {pagosHabilitados && <TableHead className="text-right">Total</TableHead>}
                      <TableHead>Entrega</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((o) => (
                      <TableRow key={o._id}>
                        <TableCell className="font-mono">{o.numeroPedido}</TableCell>
                        <TableCell>{patientName(o.paciente)}</TableCell>
                        <TableCell>{sucursalName(o.sucursal)}</TableCell>
                        <TableCell>{o.items.length} ({unidades(o)} unid.)</TableCell>
                        {pagosHabilitados && (
                          <TableCell className="text-right font-medium">{formatCurrency(o.total)}</TableCell>
                        )}
                        <TableCell>{DELIVERY_TYPE_LABELS[o.tipoEntrega] ?? o.tipoEntrega}</TableCell>
                        <TableCell>
                          <StatusBadge label={ORDER_STATUS_LABELS[o.estado]} variant={ORDER_STATUS_VARIANTS[o.estado]} />
                        </TableCell>
                        <TableCell>{formatDateShort(o.createdAt)}</TableCell>
                        <TableCell>
                          <Link to={`/pedidos/${o._id}`}>
                            <Button variant="ghost" size="sm" aria-label="Ver detalle"><Eye className="h-4 w-4" /></Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                    {orders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={pagosHabilitados ? 9 : 8} className="text-center py-12 text-sm text-muted-foreground/70">
                          No hay notas de dispensación
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between items-center mt-4">
                <p className="text-sm text-muted-foreground">Total: {total} notas</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
                  <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Siguiente</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
