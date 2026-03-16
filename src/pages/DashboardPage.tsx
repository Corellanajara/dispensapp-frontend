import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard } from '@/hooks/use-reports';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { formatCurrency } from '@/lib/format';
import { Users, Package, ShoppingCart, DollarSign } from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useDashboard();

  if (user?.role === 'paciente') {
    return <Navigate to="/portal" replace />;
  }

  const greeting =
    new Date().getHours() < 12
      ? 'Buenos días'
      : new Date().getHours() < 18
        ? 'Buenas tardes'
        : 'Buenas noches';

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <p className="text-sm text-muted-foreground mb-1">
          {greeting}, <span className="font-medium text-foreground">{user?.nombre ?? 'usuario'}</span>
        </p>
        <PageHeader
          title="Dashboard"
          description="Resumen general del sistema"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="animate-fade-in" style={{ animationDelay: '0ms' }}>
          <StatCard
            title="Pacientes"
            value={isLoading ? '—' : String(data?.pacientes.total ?? 0)}
            subtitle={`${data?.pacientes.aprobados ?? 0} aprobados`}
            icon={Users}
            tint="blue"
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '75ms' }}>
          <StatCard
            title="Productos"
            value={isLoading ? '—' : String(data?.productos.total ?? 0)}
            subtitle={
              (data?.productos.agotados ?? 0) > 0
                ? `⚠ ${data?.productos.agotados} agotados`
                : 'Stock disponible'
            }
            icon={Package}
            tint="green"
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
          <StatCard
            title="Pedidos del Mes"
            value={isLoading ? '—' : String(data?.pedidos.mes ?? 0)}
            subtitle={`${data?.pedidos.pendientes ?? 0} pendientes`}
            icon={ShoppingCart}
            tint="amber"
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '225ms' }}>
          <StatCard
            title="Balance del Mes"
            value={isLoading ? '—' : formatCurrency(data?.finanzas.balance ?? 0)}
            subtitle={`Ingresos: ${formatCurrency(data?.finanzas.ingresosMes ?? 0)} · Egresos: ${formatCurrency(data?.finanzas.egresosMes ?? 0)}`}
            icon={DollarSign}
            tint="violet"
            trend={
              data
                ? {
                    value: data.finanzas.balance >= 0 ? 1 : -1,
                    label: data.finanzas.balance >= 0 ? 'positivo' : 'negativo',
                  }
                : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}
