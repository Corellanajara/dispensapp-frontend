import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ordersAPI } from '@/services/api';
import type { Order, OrderStatus, Patient } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, CheckCircle, Package, Truck, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const statusLabels: Record<OrderStatus, string> = {
  pendiente_revision: 'Pendiente Revisión', aprobado: 'Aprobado', en_preparacion: 'En Preparación',
  listo_retiro: 'Listo para Retiro', en_despacho: 'En Despacho', entregado: 'Entregado', cancelado: 'Cancelado',
};

const nextActions: Record<string, { label: string; estado: OrderStatus; icon: React.ComponentType<{ className?: string }> }[]> = {
  pendiente_revision: [
    { label: 'Aprobar', estado: 'aprobado', icon: CheckCircle },
    { label: 'Cancelar', estado: 'cancelado', icon: XCircle },
  ],
  aprobado: [
    { label: 'Iniciar Preparación', estado: 'en_preparacion', icon: Package },
    { label: 'Cancelar', estado: 'cancelado', icon: XCircle },
  ],
  en_preparacion: [
    { label: 'Listo para Retiro', estado: 'listo_retiro', icon: Package },
    { label: 'Enviar a Despacho', estado: 'en_despacho', icon: Truck },
    { label: 'Cancelar', estado: 'cancelado', icon: XCircle },
  ],
  listo_retiro: [
    { label: 'Marcar Entregado', estado: 'entregado', icon: CheckCircle },
    { label: 'Cancelar', estado: 'cancelado', icon: XCircle },
  ],
  en_despacho: [
    { label: 'Marcar Entregado', estado: 'entregado', icon: CheckCircle },
    { label: 'Cancelar', estado: 'cancelado', icon: XCircle },
  ],
};

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!id) return;
      try {
        const { data } = await ordersAPI.get(id);
        setOrder(data);
      } catch {
        toast.error('Error al cargar pedido');
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleStatusChange = async (estado: OrderStatus) => {
    if (!id) return;
    try {
      const { data } = await ordersAPI.updateStatus(id, { estado });
      setOrder(data);
      toast.success(`Estado cambiado a ${statusLabels[estado]}`);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Error al cambiar estado');
    }
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(n);

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!order) return <div className="text-center py-20 text-muted-foreground">Pedido no encontrado</div>;

  const patient = order.paciente as Patient;
  const actions = nextActions[order.estado] || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/pedidos"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Volver</Button></Link>
        <h1 className="text-3xl font-bold">Pedido {order.numeroPedido}</h1>
        <Badge className="text-sm">{statusLabels[order.estado]}</Badge>
      </div>

      {actions.length > 0 && (
        <div className="flex gap-2">
          {actions.map((action) => (
            <Button key={action.estado} variant={action.estado === 'cancelado' ? 'destructive' : 'default'}
              onClick={() => handleStatusChange(action.estado)}>
              <action.icon className="h-4 w-4 mr-2" />{action.label}
            </Button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-lg">Información del Pedido</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Paciente:</span>
              <span>{patient == null ? '—' : typeof patient === 'string' ? patient : `${(patient as Patient).nombre ?? ''} ${(patient as Patient).apellido ?? ''}`.trim() || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tipo Entrega:</span>
              <span className="capitalize">{order.tipoEntrega}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Fecha:</span>
              <span>{new Date(order.createdAt).toLocaleDateString('es-CL')}</span></div>
            <Separator />
            <div className="flex justify-between font-bold"><span>Total:</span><span>{formatCurrency(order.total)}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Historial de Estados</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {order.historialEstados.map((h, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <div>
                    <p className="text-sm font-medium">{statusLabels[h.estado] || h.estado}</p>
                    <p className="text-xs text-muted-foreground">{new Date(h.fecha).toLocaleString('es-CL')}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Productos</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between items-center p-3 border rounded-lg">
                <div><p className="font-medium">{item.nombre ?? '—'}</p><p className="text-sm text-muted-foreground">Cant: {item.cantidad} × {formatCurrency(item.precioUnitario)}</p></div>
                <span className="font-medium">{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
