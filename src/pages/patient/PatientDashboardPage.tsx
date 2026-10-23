import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, Package, Clock, CheckCircle, ArrowRight, CalendarClock, Building2 } from 'lucide-react';
import { usePatientProfile, usePatientOrders } from '@/hooks/use-patient-portal';
import { useAppConfig } from '@/hooks/use-app-config';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PatientStatusBanner } from '@/components/portal/PatientStatusBanner';
import { motivoBloqueoSolicitud, estadoReceta, sucursalDe } from '@/components/portal/portal-helpers';
import { formatDateShort, formatDateOnly } from '@/lib/format';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_VARIANTS,
  PATIENT_STATUS_LABELS,
  PATIENT_STATUS_VARIANTS,
} from '@/lib/constants';

export function PatientDashboardPage() {
  const config = useAppConfig();
  const { data: patient, isLoading: loadingProfile } = usePatientProfile();
  const { data: ordersData, isLoading: loadingOrders } = usePatientOrders({ limit: '100' });
  const isLoading = loadingProfile || loadingOrders;

  const orders = ordersData?.data ?? [];
  const pendientes = orders.filter((o) => o.estado === 'pendiente_revision' || o.estado === 'aprobado').length;
  const enProceso = orders.filter((o) => ['en_preparacion', 'listo_retiro', 'en_despacho'].includes(o.estado)).length;
  const entregados = orders.filter((o) => o.estado === 'entregado').length;
  const recentOrders = orders.slice(0, 5);
  const bloqueo = motivoBloqueoSolicitud(patient);
  const receta = estadoReceta(patient, config.diasAvisoReceta);
  const sucursal = sucursalDe(patient);

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
        <PageHeader title={`Hola, ${patient?.nombre ?? ''}`} description="Tu panel de paciente" />
        {patient && (
          <StatusBadge label={PATIENT_STATUS_LABELS[patient.estado]} variant={PATIENT_STATUS_VARIANTS[patient.estado]} />
        )}
      </div>

      {patient && <PatientStatusBanner patient={patient} diasAviso={config.diasAvisoReceta} />}

      {patient && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <CalendarClock className="h-5 w-5 text-primary" />
              </div>
              <div className="text-sm">
                <p className="text-xs text-muted-foreground">Receta vigente</p>
                <p className="font-medium">
                  {receta.tipo === 'sin_receta' ? 'Sin receta vigente' : `Hasta el ${formatDateOnly(receta.fecha)}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Límite:{' '}
                  {patient.limiteMensualUnidades > 0
                    ? `${patient.limiteMensualUnidades} unidades cada 30 días`
                    : 'sin límite'}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="text-sm">
                <p className="text-xs text-muted-foreground">Mi dispensario</p>
                <p className="font-medium">{sucursal?.nombre ?? 'Sin asignar'}</p>
                {sucursal?.horarioAtencion && (
                  <p className="text-xs text-muted-foreground">{sucursal.horarioAtencion}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="animate-fade-in" style={{ animationDelay: '0ms' }}>
          <StatCard title="Pendientes" value={pendientes} subtitle="solicitudes en revisión" icon={Clock} tint="blue" />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '80ms' }}>
          <StatCard title="En proceso" value={enProceso} subtitle="en preparación o listas" icon={Package} tint="amber" />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '160ms' }}>
          <StatCard title="Entregadas" value={entregados} subtitle="dispensaciones recibidas" icon={CheckCircle} tint="green" />
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Solicitudes de dispensación recientes</CardTitle>
          <Link to="/portal/pedidos">
            <Button variant="ghost" size="sm">
              Ver todas <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Aún no tienes solicitudes</p>
          ) : (
            <div className="space-y-2.5">
              {recentOrders.map((order) => (
                <Link key={order._id} to={`/portal/pedidos/${order._id}`} className="block">
                  <div className="flex items-center justify-between gap-3 p-3.5 border border-border/60 rounded-xl hover:bg-accent/40 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <ClipboardList className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium font-mono text-sm">{order.numeroPedido}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateShort(order.createdAt)} ·{' '}
                          {order.items.reduce((s, i) => s + i.cantidad, 0)} unidad(es)
                        </p>
                      </div>
                    </div>
                    <StatusBadge label={ORDER_STATUS_LABELS[order.estado]} variant={ORDER_STATUS_VARIANTS[order.estado]} />
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
                <h3 className="font-semibold text-sm">Productos disponibles</h3>
                <p className="text-xs text-muted-foreground">Lo que hay en tu dispensario</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        {!bloqueo ? (
          <Link to="/portal/pedidos/nuevo">
            <Card className="hover:bg-accent/40 transition-colors cursor-pointer h-full">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ClipboardList className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Nueva solicitud</h3>
                  <p className="text-xs text-muted-foreground">Solicita una dispensación</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ) : (
          <Card className="opacity-60 h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <ClipboardList className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Nueva solicitud</h3>
                <p className="text-xs text-muted-foreground">{bloqueo}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
