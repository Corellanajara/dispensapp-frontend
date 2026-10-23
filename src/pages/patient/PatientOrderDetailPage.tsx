import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { patientPortalAPI, apiErrorMessage } from '@/services/api';
import type { Order, OrderStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, XCircle, Clock, CheckCircle, Package, Truck, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { ORDER_STATUS_LABELS, ORDER_STATUS_VARIANTS, DELIVERY_TYPE_LABELS } from '@/lib/constants';
import { formatCurrency, formatDateShort, formatDateTime } from '@/lib/format';
import { useAppConfig } from '@/hooks/use-app-config';
import { StatusBadge } from '@/components/shared/StatusBadge';

const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  pendiente_revision: Clock,
  aprobado: CheckCircle,
  en_preparacion: Package,
  listo_retiro: Package,
  en_despacho: Truck,
  entregado: CheckCircle,
  cancelado: XCircle,
  documento_subido: FileText,
};

/** Estados internos del historial que no se muestran al paciente. */
const OCULTOS = new Set(['documento_subido', 'firma_solicitada']);

export function PatientOrderDetailPage() {
  const config = useAppConfig();
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return;
      try {
        const { data } = await patientPortalAPI.getMyOrder(id);
        setOrder(data);
      } catch {
        toast.error('Error al cargar la solicitud');
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
      toast.success('Solicitud anulada');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error al anular la solicitud'));
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
    return <div className="text-center py-20 text-muted-foreground">Solicitud no encontrada</div>;
  }

  const canCancel = order.estado === 'pendiente_revision';
  const mostrarMontos = config.pagosHabilitados && order.total > 0;
  const totalUnidades = order.items.reduce((s, i) => s + i.cantidad, 0);
  const historial = order.historialEstados.filter((h) => !OCULTOS.has(h.estado));

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/portal/pedidos">
            <Button variant="ghost" size="sm" className="rounded-xl">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div>
            <p className="text-xs text-muted-foreground">Solicitud de dispensación</p>
            <h1 className="text-2xl font-bold font-mono">{order.numeroPedido}</h1>
            <div className="flex items-center gap-2.5 mt-1.5">
              <StatusBadge label={ORDER_STATUS_LABELS[order.estado]} variant={ORDER_STATUS_VARIANTS[order.estado]} />
              <span className="text-sm text-muted-foreground">{formatDateShort(order.createdAt)}</span>
            </div>
          </div>
        </div>

        {canCancel && (
          <>
            <Button variant="destructive" onClick={() => setIsCancelOpen(true)}>
              <XCircle className="h-4 w-4 mr-2" />
              Anular solicitud
            </Button>

            <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
              <DialogContent className="rounded-2xl">
                <DialogHeader>
                  <DialogTitle>¿Anular la solicitud?</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Vas a anular la solicitud <strong>{order.numeroPedido}</strong>. Esta acción no se puede deshacer.
                </p>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setIsCancelOpen(false)}>
                    No, mantener
                  </Button>
                  <Button variant="destructive" onClick={handleCancel} disabled={isCancelling}>
                    {isCancelling ? 'Anulando...' : 'Sí, anular'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Productos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-4 border border-border/60 rounded-xl">
                    <div>
                      <p className="font-medium">{item.nombre ?? '—'}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.cantidad} unidad{item.cantidad === 1 ? '' : 'es'}
                        {mostrarMontos && ` × ${formatCurrency(item.precioUnitario)}`}
                      </p>
                    </div>
                    {mostrarMontos && <span className="font-medium">{formatCurrency(item.subtotal)}</span>}
                  </div>
                ))}
              </div>
              <Separator className="my-5" />
              <div className="flex justify-between items-center font-semibold">
                <span>Total</span>
                <span>
                  {totalUnidades} unidad{totalUnidades === 1 ? '' : 'es'}
                  {mostrarMontos && ` · ${formatCurrency(order.total)}`}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {typeof order.sucursal === 'object' && order.sucursal && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Dispensario:</span>
                  <span className="text-right">{order.sucursal.nombre}</span>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Entrega:</span>
                <span className="text-right">{DELIVERY_TYPE_LABELS[order.tipoEntrega] ?? order.tipoEntrega}</span>
              </div>
              {order.tipoEntrega === 'despacho' && order.direccionEntrega && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Dirección:</span>
                  <span className="text-right">
                    {order.direccionEntrega.calle} {order.direccionEntrega.numero}, {order.direccionEntrega.comuna},{' '}
                    {order.direccionEntrega.ciudad}
                  </span>
                </div>
              )}
              {order.recetaMedica && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Receta:</span>
                  <span className="text-right">{order.recetaMedica}</span>
                </div>
              )}
              {order.observaciones && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Observaciones:</span>
                  <span className="text-right">{order.observaciones}</span>
                </div>
              )}
              {order.fechaEntrega && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Entregada el:</span>
                  <span>{formatDateShort(order.fechaEntrega)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Historial</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {historial.map((h, i) => {
                  const Icon = statusIcons[h.estado] || Clock;
                  const isLast = i === historial.length - 1;
                  return (
                    <div key={i} className="flex gap-3.5 pb-7 last:pb-0">
                      <div className="flex flex-col items-center">
                        <div
                          className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                            isLast ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        {!isLast && <div className="w-px h-full bg-border/50 min-h-[28px]" />}
                      </div>
                      <div className="pb-2 pt-1">
                        <p className={`text-sm font-medium ${isLast ? 'text-primary' : ''}`}>
                          {ORDER_STATUS_LABELS[h.estado as OrderStatus] || h.estado.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(h.fecha)}</p>
                        {h.observacion && <p className="text-xs text-muted-foreground mt-1 italic">{h.observacion}</p>}
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
