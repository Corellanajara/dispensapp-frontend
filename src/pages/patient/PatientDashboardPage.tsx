import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShoppingCart, Package, Clock, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { usePatientProfile, usePatientOrders } from '@/hooks/use-patient-portal';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency, formatDateShort } from '@/lib/format';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_VARIANTS,
  PATIENT_STATUS_LABELS,
  PATIENT_STATUS_VARIANTS,
} from '@/lib/constants';

export function PatientDashboardPage() {
  const { data: patient, isLoading: loadingProfile } = usePatientProfile();
  const { data: ordersData, isLoading: loadingOrders } = usePatientOrders({ limit: '100' });
  const isLoading = loadingProfile || loadingOrders;

  const orders = ordersData?.data ?? [];
  const pendientes = orders.filter((o) => o.estado === 'pendiente_revision' || o.estado === 'aprobado').length;
  const enProceso = orders.filter((o) => o.estado === 'en_preparacion' || o.estado === 'listo_retiro' || o.estado === 'en_despacho').length;
  const entregados = orders.filter((o) => o.estado === 'entregado').length;
  const recentOrders = orders.slice(0, 5);
  const isApproved = patient?.estado === 'aprobado';

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="h-8 w-64 animate-shimmer rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 animate-shimmer rounded-xl" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title={`Hola, ${patient?.nombre ?? ''}`}
          description="Tu panel de paciente"
        />
        {patient && (
          <StatusBadge
            label={PATIENT_STATUS_LABELS[patient.estado]}
            variant={PATIENT_STATUS_VARIANTS[patient.estado]}
          />
        )}
      </div>

      {!isApproved && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Tu cuenta está en revisión. Una vez aprobada podrás realizar pedidos.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="animate-fade-in" style={{ animationDelay: '0ms' }}>
          <StatCard title="Pendientes" value={pendientes} subtitle="pedidos en espera" icon={Clock} tint="blue" />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '80ms' }}>
          <StatCard title="En Proceso" value={enProceso} subtitle="pedidos en preparación" icon={Package} tint="amber" />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '160ms' }}>
          <StatCard title="Entregados" value={entregados} subtitle="pedidos completados" icon={CheckCircle} tint="green" />
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Pedidos Recientes</CardTitle>
          <Link to="/portal/pedidos">
            <Button variant="ghost" size="sm">
              Ver todos <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No tienes pedidos aún</p>
          ) : (
            <div className="space-y-2.5">
              {recentOrders.map((order) => (
                <Link key={order._id} to={`/portal/pedidos/${order._id}`} className="block">
                  <div className="flex items-center justify-between p-3.5 border border-border/60 rounded-xl hover:bg-accent/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium font-mono text-sm">{order.numeroPedido}</p>
                        <p className="text-xs text-muted-foreground">{formatDateShort(order.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{formatCurrency(order.total)}</span>
                      <StatusBadge
                        label={ORDER_STATUS_LABELS[order.estado]}
                        variant={ORDER_STATUS_VARIANTS[order.estado]}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Link to="/portal/catalogo">
          <Card className="hover:bg-accent/40 transition-colors cursor-pointer h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Ver Catálogo</h3>
                <p className="text-xs text-muted-foreground">Explora los productos disponibles</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        {isApproved ? (
          <Link to="/portal/pedidos/nuevo">
            <Card className="hover:bg-accent/40 transition-colors cursor-pointer h-full">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Nuevo Pedido</h3>
                  <p className="text-xs text-muted-foreground">Realiza un nuevo pedido de productos</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ) : (
          <Card className="opacity-50 h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Nuevo Pedido</h3>
                <p className="text-xs text-muted-foreground">Disponible cuando tu cuenta sea aprobada</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
