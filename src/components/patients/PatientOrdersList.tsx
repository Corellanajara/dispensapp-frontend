import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ClipboardList, ChevronRight } from 'lucide-react';
import { useOrders } from '@/hooks/use-orders';
import { ORDER_STATUS_LABELS, ORDER_STATUS_VARIANTS, DELIVERY_TYPE_LABELS, ORDERS_LABEL } from '@/lib/constants';
import { formatDateShort } from '@/lib/format';

/** Notas de dispensación del paciente (sin montos: no es una venta). */
export function PatientOrdersList({ patientId }: { patientId: string }) {
  const { data, isLoading } = useOrders({ paciente: patientId, limit: '50' });
  const orders = data?.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{ORDERS_LABEL}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : orders.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground/70 py-12">Este paciente no tiene notas de dispensación</p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const unidades = order.items.reduce((s, i) => s + i.cantidad, 0);
              return (
                <Link
                  key={order._id}
                  to={`/pedidos/${order._id}`}
                  className="flex items-center justify-between gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ClipboardList className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm font-mono">{order.numeroPedido}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {formatDateShort(order.createdAt)} · {order.items.length} producto{order.items.length === 1 ? '' : 's'} ·{' '}
                        {unidades} unidad{unidades === 1 ? '' : 'es'} · {DELIVERY_TYPE_LABELS[order.tipoEntrega] ?? order.tipoEntrega}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge label={ORDER_STATUS_LABELS[order.estado]} variant={ORDER_STATUS_VARIANTS[order.estado]} />
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
