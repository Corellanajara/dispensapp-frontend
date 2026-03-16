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
import { ArrowLeft, XCircle, Clock, CheckCircle, Package, Truck, CreditCard, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';
import { ORDER_STATUS_LABELS, ORDER_STATUS_VARIANTS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_VARIANTS, SIGNATURE_STATUS_LABELS, SIGNATURE_STATUS_VARIANTS } from '@/lib/constants';
import { formatCurrency, formatDateShort, formatDateTime } from '@/lib/format';
import { StatusBadge } from '@/components/shared/StatusBadge';


const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  pendiente_revision: Clock,
  aprobado: CheckCircle,
  en_preparacion: Package,
  listo_retiro: Package,
  en_despacho: Truck,
  entregado: CheckCircle,
  cancelado: XCircle,
};


const API_ORIGIN = 'https://dispensapp-backend-production-9a9a.up.railway.app';

export function PatientOrderDetailPage() {
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
  const lastAttempt = order.pago?.intentos?.length ? order.pago.intentos[order.pago.intentos.length - 1] : null;

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
            <h1 className="text-2xl font-bold">Pedido {order.numeroPedido}</h1>
            <div className="flex items-center gap-2.5 mt-1.5">
              <StatusBadge label={ORDER_STATUS_LABELS[order.estado]} variant={ORDER_STATUS_VARIANTS[order.estado]} />
              <span className="text-sm text-muted-foreground">
                {formatDateShort(order.createdAt)}
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
              <DialogContent className="rounded-2xl">
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
                        Cant: {item.cantidad} × {formatCurrency(item.precioUnitario)}
                      </p>
                    </div>
                    <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>
              <Separator className="my-5" />
              <div className="flex justify-between items-center font-bold text-lg">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Información de Entrega</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
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
                  <span>{formatDateShort(order.fechaEntrega)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {order.pago && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />Estado del Pago
                  </CardTitle>
                  <StatusBadge label={PAYMENT_STATUS_LABELS[order.pago.estado]} variant={PAYMENT_STATUS_VARIANTS[order.pago.estado]} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {order.pago.estado === 'aprobado' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monto pagado:</span>
                      <span className="font-bold text-green-700">{formatCurrency(order.pago.montoPagado)}</span>
                    </div>
                    {lastAttempt?.ultimosDigitos && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tarjeta:</span>
                        <span>•••• {lastAttempt.ultimosDigitos}</span>
                      </div>
                    )}
                    {lastAttempt?.codigoAutorizacion && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Código autorización:</span>
                        <span className="font-mono text-xs">{lastAttempt.codigoAutorizacion}</span>
                      </div>
                    )}
                  </>
                )}
                {order.pago.estado === 'procesando' && (
                  <p className="text-blue-600">Procesando pago...</p>
                )}
                {(order.pago.estado === 'rechazado' || order.pago.estado === 'error') && (
                  <p className="text-red-600">{lastAttempt?.mensaje || 'El pago no fue procesado.'}</p>
                )}
                {order.pago.estado === 'pendiente' && (
                  <p className="text-muted-foreground">El pago aún no ha sido procesado.</p>
                )}
              </CardContent>
            </Card>
          )}

          {order.documentos && order.documentos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />Documentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.documentos.map((doc) => (
                    <div key={doc._id} className="flex items-center justify-between p-4 border border-border/60 rounded-xl">
                      <div>
                        <p className="font-medium text-sm">{doc.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.tipo} · {formatDateShort(doc.fechaSubida)}
                        </p>
                        {doc.firma?.estado === 'firmado' && doc.firma.fechaFirma && (
                          <p className="text-xs text-green-600 mt-1">
                            Firmado el {formatDateShort(doc.firma.fechaFirma)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.firma ? (
                          <StatusBadge label={SIGNATURE_STATUS_LABELS[doc.firma.estado]} variant={SIGNATURE_STATUS_VARIANTS[doc.firma.estado]} />
                        ) : (
                          <Badge className="bg-gray-100 text-gray-600 rounded-full">Sin firma</Badge>
                        )}
                        {doc.firma?.archivoFirmado && (
                          <a
                            href={doc.firma.archivoFirmado.startsWith('http') ? doc.firma.archivoFirmado : `${API_ORIGIN}${doc.firma.archivoFirmado}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="h-4 w-4 text-primary hover:text-primary/80" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

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
                    <div key={i} className="flex gap-3.5 pb-7 last:pb-0">
                      <div className="flex flex-col items-center">
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${isLast ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        {!isLast && (
                          <div className="w-px h-full bg-border/50 min-h-[28px]" />
                        )}
                      </div>
                      <div className="pb-2 pt-1">
                        <p className={`text-sm font-medium ${isLast ? 'text-primary' : ''}`}>
                          {ORDER_STATUS_LABELS[h.estado as OrderStatus] || h.estado}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDateTime(h.fecha)}
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
