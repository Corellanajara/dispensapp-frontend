import { useEffect, useState, useCallback } from 'react';
import { ordersAPI, patientsAPI, productsAPI } from '@/services/api';
import type { Order, Patient, Product } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ORDER_STATUS_LABELS, ORDER_STATUS_VARIANTS } from '@/lib/constants';
import { formatCurrency, formatDateShort } from '@/lib/format';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orderItems, setOrderItems] = useState<{ producto: string; cantidad: number }[]>([]);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = { page: page.toString(), limit: '20' };
      if (statusFilter) params.estado = statusFilter;
      const { data } = await ordersAPI.list(params);
      setOrders(data.data);
      setTotal(data.pagination.total);
    } catch {
      toast.error('Error al cargar pedidos');
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const loadFormData = async () => {
    try {
      const [pRes, prRes] = await Promise.all([
        patientsAPI.list({ estado: 'aprobado', limit: '100' }),
        productsAPI.list({ estado: 'disponible', limit: '100' }),
      ]);
      setPatients(pRes.data.data);
      setProducts(prRes.data.data);
    } catch {
      toast.error('Error al cargar datos');
    }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await ordersAPI.create({
        paciente: form.get('paciente'),
        items: orderItems,
        tipoEntrega: form.get('tipoEntrega'),
        recetaMedica: form.get('recetaMedica') || 'pendiente',
        observaciones: form.get('observaciones'),
      });
      toast.success('Pedido creado');
      setIsCreateOpen(false);
      setOrderItems([]);
      fetchOrders();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Error al crear pedido');
    }
  };

  const addItem = () => setOrderItems([...orderItems, { producto: '', cantidad: 1 }]);
  const removeItem = (idx: number) => setOrderItems(orderItems.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, value: string | number) => {
    const updated = [...orderItems];
    (updated[idx] as Record<string, unknown>)[field] = value;
    setOrderItems(updated);
  };

  const getPatientName = (p: string | Patient | null | undefined) => {
    if (p == null) return '—';
    return typeof p === 'string' ? p : `${p.nombre ?? ''} ${p.apellido ?? ''}`.trim() || '—';
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader title="Pedidos" description="Gestión de pedidos">
        <Dialog open={isCreateOpen} onOpenChange={(o) => { setIsCreateOpen(o); if (o) loadFormData(); }}>
          <Button onClick={() => { setIsCreateOpen(true);
            loadFormData();
          }}><Plus className="h-4 w-4 mr-2" />Nuevo Pedido</Button>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Pedido</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Paciente</Label>
                  <select name="paciente" required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                    <option value="">Seleccionar paciente...</option>
                    {patients.map((p) => (
                      <option key={p._id} value={p._id}>{p.nombre} {p.apellido} - {p.rut}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Entrega</Label>
                  <select name="tipoEntrega" required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                    <option value="retiro">Retiro en Dispensario</option>
                    <option value="despacho">Despacho a Domicilio</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Productos</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-3 w-3 mr-1" />Agregar
                  </Button>
                </div>
                {orderItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-end">
                    <select value={item.producto} onChange={(e) => updateItem(idx, 'producto', e.target.value)}
                      className="flex h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                      <option value="">Seleccionar producto...</option>
                      {products.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.nombre} - {formatCurrency(p.precio)} (Stock: {p.cantidadDisponible})
                        </option>
                      ))}
                    </select>
                    <Input type="number" min="1" value={item.cantidad}
                      onChange={(e) => updateItem(idx, 'cantidad', parseInt(e.target.value))}
                      className="w-24" />
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(idx)}>✕</Button>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Receta Médica (referencia)</Label>
                <Input name="recetaMedica" placeholder="Número o referencia de receta" />
              </div>
              <div className="space-y-2">
                <Label>Observaciones</Label>
                <Input name="observaciones" />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={orderItems.length === 0}>Crear Pedido</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Select value={statusFilter} onValueChange={(v: string | null) => { setStatusFilter(v === 'all' || !v ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
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
              {/* Vista cards en móvil */}
              <div className="md:hidden space-y-3">
                {orders.length === 0 ? (
                  <p className="text-center py-12 text-sm text-muted-foreground/70">No se encontraron pedidos</p>
                ) : (
                  orders.map((o) => (
                    <Link key={o._id} to={`/pedidos/${o._id}`}>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start gap-2">
                            <p className="font-mono font-medium">#{o.numeroPedido}</p>
                            <StatusBadge label={ORDER_STATUS_LABELS[o.estado]} variant={ORDER_STATUS_VARIANTS[o.estado]} />
                          </div>
                          <p className="text-sm mt-1">{getPatientName(o.paciente)}</p>
                          <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                            <span>{o.items.length} productos</span>
                            <span className="capitalize">{o.tipoEntrega}</span>
                          </div>
                          <div className="mt-2 flex justify-between items-center">
                            <span className="font-medium">{formatCurrency(o.total)}</span>
                            <span className="text-xs">{formatDateShort(o.createdAt)}</span>
                          </div>
                          <Button variant="outline" size="sm" className="w-full mt-3">
                            <Eye className="h-4 w-4 mr-2" /> Ver detalle
                          </Button>
                        </CardContent>
                      </Card>
                    </Link>
                  ))
                )}
              </div>
              {/* Tabla en desktop */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N° Pedido</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Entrega</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((o) => (
                      <TableRow key={o._id}>
                        <TableCell className="font-mono">{o.numeroPedido}</TableCell>
                        <TableCell>{getPatientName(o.paciente)}</TableCell>
                        <TableCell>{o.items.length} productos</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(o.total)}</TableCell>
                        <TableCell className="capitalize">{o.tipoEntrega}</TableCell>
                        <TableCell>
                          <StatusBadge label={ORDER_STATUS_LABELS[o.estado]} variant={ORDER_STATUS_VARIANTS[o.estado]} />
                        </TableCell>
                        <TableCell>{formatDateShort(o.createdAt)}</TableCell>
                        <TableCell>
                          <Link to={`/pedidos/${o._id}`}>
                            <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                    {orders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-sm text-muted-foreground/70">
                          No se encontraron pedidos
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between items-center mt-4">
                <p className="text-sm text-muted-foreground">Total: {total} pedidos</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
                  <Button variant="outline" size="sm" disabled={orders.length < 20} onClick={() => setPage(page + 1)}>Siguiente</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
