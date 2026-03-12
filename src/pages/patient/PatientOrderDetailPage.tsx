import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { patientPortalAPI } from '@/services/api';
import type { Order, OrderStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, XCircle, Clock, CheckCircle, Package, Truck } from 'lucide-react';
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

const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  pendiente_revision: Clock,
  aprobado: CheckCircle,
  en_preparacion: Package,
  listo_retiro: Package,
  en_despacho: Truck,
  entregado: CheckCircle,
  cancelado: XCircle,
};

export function PatientOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(n);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return;
      try {
        const { data } = await patientPortalAPI.getMyOrder(id);
        setOrder(data);
      } catch {
        toast.error('Error al cargar el pedido');
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  const handleCancel = async () => {
    if (!id) return;
    setIsCancelling(true);
    try {
      const { data } = await patientPortalAPI.cancelOrder(id);
      setOrder(data);
      setIsCancelOpen(false);
      toast.success('Pedido cancelado');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Error al cancelar pedido');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20 text-muted-foreground">Pedido no encontrado</div>
    );
  }

  const canCancel = order.estado === 'pendiente_revision';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/portal/pedidos">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Pedido {order.numeroPedido}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={statusColors[order.estado]}>
                {statusLabels[order.estado]}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {new Date(order.createdAt).toLocaleDateString('es-CL')}
              </span>
            </div>
          </div>
        </div>

        {canCancel && (
          <>
            <Button variant="destructive" onClick={() => setIsCancelOpen(true)}>
              <XCircle className="h-4 w-4 mr-2" />
              Cancelar Pedido
            </Button>

            <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>¿Cancelar pedido?</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  ¿Estás seguro de que deseas cancelar el pedido <strong>{order.numeroPedido}</strong>?
                  Esta acción no se puede deshacer.
                </p>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setIsCancelOpen(false)}>
                    No, mantener
                  </Button>
                  <Button variant="destructive" onClick={handleCancel} disabled={isCancelling}>
                    {isCancelling ? 'Cancelando...' : 'Sí, cancelar'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Productos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{item.nombre ?? '—'}</p>
                      <p className="text-sm text-muted-foreground">
                        Cant: {item.cantidad} × {formatCurrency(item.precioUnitario)}
                      </p>
                    </div>
                    <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>
              <Separator className="my-4" />
              <div className="flex justify-between items-center font-bold text-lg">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Info */}
          <Card>
            <CardHeader>
              <CardTitle>Información de Entrega</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo de entrega:</span>
                <span className="capitalize">{order.tipoEntrega === 'retiro' ? 'Retiro en Dispensario' : 'Despacho a Domicilio'}</span>
              </div>
              {order.direccionEntrega && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dirección:</span>
                  <span className="text-right">
                    {order.direccionEntrega.calle} {order.direccionEntrega.numero}, {order.direccionEntrega.comuna}, {order.direccionEntrega.ciudad}
                  </span>
                </div>
              )}
              {order.recetaMedica && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Receta médica:</span>
                  <span>{order.recetaMedica}</span>
                </div>
              )}
              {order.observaciones && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Observaciones:</span>
                  <span className="text-right">{order.observaciones}</span>
                </div>
              )}
              {order.fechaEntrega && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha de entrega:</span>
                  <span>{new Date(order.fechaEntrega).toLocaleDateString('es-CL')}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Timeline */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Historial de Estados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {order.historialEstados.map((h, i) => {
                  const Icon = statusIcons[h.estado] || Clock;
                  const isLast = i === order.historialEstados.length - 1;
                  return (
                    <div key={i} className="flex gap-3 pb-6 last:pb-0">
                      <div className="flex flex-col items-center">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isLast ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        {!isLast && (
                          <div className="w-px h-full bg-border min-h-[24px]" />
                        )}
                      </div>
                      <div className="pb-2">
                        <p className={`text-sm font-medium ${isLast ? 'text-primary' : ''}`}>
                          {statusLabels[h.estado] || h.estado}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(h.fecha).toLocaleString('es-CL')}
                        </p>
                        {h.observacion && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            {h.observacion}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
