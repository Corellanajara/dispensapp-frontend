import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { reportsAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import type { DashboardData } from '@/types';
import { Users, Package, ShoppingCart, DollarSign, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
export function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  if (user?.role === 'paciente') {
    return <Navigate to="/portal" replace />;
  }

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data: dashboard } = await reportsAPI.dashboard();
        setData(dashboard);
      } catch (error) {
        console.error('Error fetching dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(amount);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pacientes
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.pacientes.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {data?.pacientes.aprobados || 0} aprobados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Productos
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.productos.total || 0}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {(data?.productos.agotados || 0) > 0 && (
                <AlertTriangle className="h-3 w-3 text-destructive" />
              )}
              {data?.productos.agotados || 0} agotados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pedidos del Mes
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.pedidos.mes || 0}</div>
            <p className="text-xs text-muted-foreground">
              {data?.pedidos.pendientes || 0} pendientes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Balance del Mes
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(data?.finanzas.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(data?.finanzas.balance || 0)}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-600" />
                {formatCurrency(data?.finanzas.ingresosMes || 0)}
              </span>
              <span className="flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-red-600" />
                {formatCurrency(data?.finanzas.egresosMes || 0)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
