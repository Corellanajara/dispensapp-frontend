import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { patientPortalAPI } from '@/services/api';
import type { Order, OrderStatus } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, ShoppingCart, Eye, Package } from 'lucide-react';
import { toast } from 'sonner';

const statusLabels: Record<OrderStatus, string> = {
  pendiente_revision: 'Pendiente Revisión',
  aprobado: 'Aprobado',
  en_preparacion: 'En Preparación',
  listo_retiro: 'Listo para Retiro',
  en_despacho: 'En Despacho',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

const statusColors: Record<OrderStatus, string> = {
  pendiente_revision: 'bg-yellow-100 text-yellow-800',
  aprobado: 'bg-blue-100 text-blue-800',
  en_preparacion: 'bg-purple-100 text-purple-800',
  listo_retiro: 'bg-cyan-100 text-cyan-800',
  en_despacho: 'bg-indigo-100 text-indigo-800',
  entregado: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800',
};

export function PatientOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(n);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = { page: page.toString(), limit: '10' };
      if (statusFilter) params.estado = statusFilter;
      const { data } = await patientPortalAPI.getMyOrders(params);
      setOrders(data.data);
      setTotal(data.pagination.total);
    } catch {
      toast.error('Error al cargar pedidos');
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Mis Pedidos</h1>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={(v: string | null) => { setStatusFilter(v === 'all' || !v ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(statusLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Link to="/portal/pedidos/nuevo">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Pedido
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 animate-pulse bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No tienes pedidos aún</p>
            <p className="text-sm text-muted-foreground mt-1">
              Realiza tu primer pedido desde el catálogo
            </p>
            <Link to="/portal/pedidos/nuevo" className="mt-4 inline-block">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Pedido
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order._id} className="hover:bg-muted/30 transition-colors">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-medium">{order.numeroPedido}</span>
                          <Badge className={statusColors[order.estado]}>
                            {statusLabels[order.estado]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{order.items.length} {order.items.length === 1 ? 'producto' : 'productos'}</span>
                          <span>•</span>
                          <span className="capitalize">{order.tipoEntrega === 'retiro' ? 'Retiro' : 'Despacho'}</span>
                          <span>•</span>
                          <span>{new Date(order.createdAt).toLocaleDateString('es-CL')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 sm:ml-auto">
                      <span className="text-lg font-bold">{formatCurrency(order.total)}</span>
                      <Link to={`/portal/pedidos/${order._id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalle
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Total: {total} pedidos</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Anterior
                </Button>
                <span className="flex items-center text-sm text-muted-foreground px-2">
                  {page} de {totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
