import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard } from '@/hooks/use-reports';
import { useAppConfig } from '@/hooks/use-app-config';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { USER_ROLE_LABELS } from '@/lib/constants';
import {
  Users,
  Package,
  ClipboardList,
  DollarSign,
  Sprout,
  ArrowLeftRight,
  AlertTriangle,
  Warehouse,
  MapPin,
  Factory,
  ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { UserRole } from '@/types';

interface Shortcut {
  title: string;
  description: string;
  url: string;
  icon: LucideIcon;
  roles: UserRole[];
}

const SHORTCUTS: Shortcut[] = [
  { title: 'Cultivo', description: 'Espacios cedidos, QR y cosechas', url: '/cultivo', icon: Sprout, roles: ['admin', 'operador', 'cultivo'] },
  { title: 'Inventario', description: 'Existencias por lote y ubicación', url: '/inventario', icon: Warehouse, roles: ['admin', 'operador', 'cultivo', 'produccion'] },
  { title: 'Transferencias', description: 'Traslados entre sala, bodega y dispensario', url: '/transferencias', icon: ArrowLeftRight, roles: ['admin', 'operador', 'cultivo', 'produccion'] },
  { title: 'Ubicaciones', description: 'Salas, bodegas y puntos de dispensación', url: '/ubicaciones', icon: MapPin, roles: ['admin', 'operador', 'cultivo', 'produccion'] },
  { title: 'Producción', description: 'Procesos de producción y mermas', url: '/produccion', icon: Factory, roles: ['admin', 'operador', 'produccion'] },
  { title: 'Productos', description: 'Catálogo de productos', url: '/productos', icon: Package, roles: ['admin', 'operador', 'produccion'] },
  { title: 'Finanzas', description: 'Ingresos y egresos', url: '/finanzas', icon: DollarSign, roles: ['admin', 'finanzas'] },
];

function Shortcuts({ role }: { role: UserRole }) {
  const items = SHORTCUTS.filter((s) => s.roles.includes(role));
  if (items.length === 0) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((s) => (
        <Link key={s.url} to={s.url}>
          <Card className="h-full transition-colors hover:bg-muted/40">
            <CardContent className="flex items-center gap-3 pt-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { pagosHabilitados } = useAppConfig();
  // /reports/dashboard solo responde a admin y operador
  const tieneResumen = user?.role === 'admin' || user?.role === 'operador';
  const { data, isLoading } = useDashboard(tieneResumen);

  if (user?.role === 'paciente') {
    return <Navigate to="/portal" replace />;
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  const header = (
    <div>
      <p className="text-sm text-muted-foreground mb-1">
        {greeting}, <span className="font-medium text-foreground">{user?.nombre ?? 'usuario'}</span>
      </p>
      <PageHeader
        title="Dashboard"
        description={tieneResumen ? 'Resumen del dispensario' : `Accesos rápidos · ${user?.role ? USER_ROLE_LABELS[user.role] : ''}`}
      />
    </div>
  );

  if (!tieneResumen) {
    return (
      <div className="space-y-8 animate-fade-in">
        {header}
        {user && <Shortcuts role={user.role} />}
      </div>
    );
  }

  const v = data?.vigencia;
  const alertasReceta = (v?.porVencer ?? 0) + (v?.sinRecetaVigente ?? 0) + (v?.suspendidosPorVencimiento ?? 0);
  const mostrarFinanzas = pagosHabilitados && user?.role === 'admin';
  const val = (n: number | undefined) => (isLoading ? '—' : String(n ?? 0));

  return (
    <div className="space-y-8 animate-fade-in">
      {header}

      {!isLoading && alertasReceta > 0 && (
        <Link to="/fiscalizacion">
          <Card className="border-warning/40 bg-warning/5 transition-colors hover:bg-warning/10">
            <CardContent className="flex items-start gap-3 pt-5">
              <AlertTriangle className="h-5 w-5 shrink-0 text-warning mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-medium">Recetas que requieren atención</p>
                <p className="text-muted-foreground">
                  {v?.porVencer ?? 0} por vencer en {v?.diasAviso ?? 30} días · {v?.sinRecetaVigente ?? 0} pacientes activos sin receta vigente · {v?.suspendidosPorVencimiento ?? 0} suspendidos por vencimiento
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5" />
            </CardContent>
          </Card>
        </Link>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <Link to="/pacientes">
          <StatCard
            title="Pacientes"
            value={val(data?.pacientes.total)}
            subtitle={`${data?.pacientes.aprobados ?? 0} activos`}
            icon={Users}
            tint="blue"
          />
        </Link>
        <Link to="/pedidos">
          <StatCard
            title="Dispensaciones del mes"
            value={val(data?.pedidos.mes)}
            subtitle={`${data?.pedidos.pendientes ?? 0} notas en curso`}
            icon={ClipboardList}
            tint="amber"
          />
        </Link>
        <Link to="/cultivo">
          <StatCard
            title="Espacios de cultivo"
            value={val(data?.cultivo?.espaciosActivos)}
            subtitle="activos"
            icon={Sprout}
            tint="green"
          />
        </Link>
        <Link to="/transferencias">
          <StatCard
            title="Transferencias"
            value={val(data?.cultivo?.transferenciasEnTransito)}
            subtitle="en tránsito hacia este dispensario"
            icon={ArrowLeftRight}
            tint="cyan"
          />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Link to="/inventario">
          <StatCard
            title="Existencias"
            value={val(data?.productos.total)}
            subtitle={
              (data?.productos.agotados ?? 0) > 0
                ? `${data?.productos.agotados} lotes agotados`
                : 'Lotes con stock'
            }
            icon={Package}
            tint="violet"
          />
        </Link>
        {mostrarFinanzas && (
          <Link to="/finanzas">
            <StatCard
              title="Balance del mes"
              value={isLoading ? '—' : formatCurrency(data?.finanzas.balance ?? 0)}
              subtitle={`Ingresos: ${formatCurrency(data?.finanzas.ingresosMes ?? 0)} · Egresos: ${formatCurrency(data?.finanzas.egresosMes ?? 0)}`}
              icon={DollarSign}
              tint="rose"
            />
          </Link>
        )}
      </div>

      {user && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Accesos rápidos</CardTitle>
          </CardHeader>
          <CardContent>
            <Shortcuts role={user.role} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
