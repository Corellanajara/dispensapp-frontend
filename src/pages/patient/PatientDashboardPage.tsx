import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { patientPortalAPI } from '@/services/api';
import type { Patient, Order, OrderStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShoppingCart, Package, Clock, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

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

const patientStatusLabels: Record<string, string> = {
  pendiente: 'Pendiente de Aprobación',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  suspendido: 'Suspendido',
};

const patientStatusColors: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  aprobado: 'bg-green-100 text-green-800',
  rechazado: 'bg-red-100 text-red-800',
  suspendido: 'bg-gray-100 text-gray-800',
};

export function PatientDashboardPage() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(n);

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, ordersRes] = await Promise.all([
        patientPortalAPI.getProfile(),
        patientPortalAPI.getMyOrders({ limit: '100' }),
      ]);
      setPatient(profileRes.data);
      setOrders(ordersRes.data.data);
    } catch {
      // silently handle - patient may not exist yet
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse bg-muted rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 animate-pulse bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const pendientes = orders.filter((o) => o.estado === 'pendiente_revision' || o.estado === 'aprobado').length;
  const enProceso = orders.filter((o) => o.estado === 'en_preparacion' || o.estado === 'listo_retiro' || o.estado === 'en_despacho').length;
  const entregados = orders.filter((o) => o.estado === 'entregado').length;
  const recentOrders = orders.slice(0, 5);
  const isApproved = patient?.estado === 'aprobado';

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">
                Bienvenido, {patient?.nombre} {patient?.apellido}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={patientStatusColors[patient?.estado || 'pendiente']}>
                  {patientStatusLabels[patient?.estado || 'pendiente']}
                </Badge>
              </div>
            </div>
          </div>
          {!isApproved && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Tu cuenta está en revisión. Una vez aprobada podrás realizar pedidos.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendientes}</div>
            <p className="text-xs text-muted-foreground">pedidos en espera</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">En Proceso</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{enProceso}</div>
            <p className="text-xs text-muted-foreground">pedidos en preparación</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Entregados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{entregados}</div>
            <p className="text-xs text-muted-foreground">pedidos completados</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pedidos Recientes</CardTitle>
          <Link to="/portal/pedidos">
            <Button variant="ghost" size="sm">
              Ver todos <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">No tienes pedidos aún</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <Link key={order._id} to={`/portal/pedidos/${order._id}`} className="block">
                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium font-mono text-sm">{order.numeroPedido}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString('es-CL')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{formatCurrency(order.total)}</span>
                      <Badge className={statusColors[order.estado]}>
                        {statusLabels[order.estado]}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/portal/catalogo">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Ver Catálogo</h3>
                <p className="text-sm text-muted-foreground">Explora los productos disponibles</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        {isApproved ? (
          <Link to="/portal/pedidos/nuevo">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <ShoppingCart className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Nuevo Pedido</h3>
                  <p className="text-sm text-muted-foreground">Realiza un nuevo pedido de productos</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ) : (
          <Card className="opacity-50 h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">Nuevo Pedido</h3>
                <p className="text-sm text-muted-foreground">Disponible cuando tu cuenta sea aprobada</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
