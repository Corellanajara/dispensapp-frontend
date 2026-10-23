import { Link, useParams } from 'react-router-dom';
import type { PatientRef, UbicacionRef } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, QrCode, ShieldAlert, Sprout, Wheat, ArrowRight } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { populated, sucursalLabel } from '@/components/inventory/helpers';
import { Spinner } from '@/components/inventory/Spinner';
import { ESPACIO_ESTADO_LABELS, COSECHA_ESTADO_LABELS, PATIENT_STATUS_LABELS, UBICACION_TIPO_LABELS } from '@/lib/constants';
import { formatDateOnly, formatNumber } from '@/lib/format';
import { useAuth } from '@/contexts/AuthContext';
import { useEspacioPorQR } from '@/hooks/use-cultivo';

/** Lo que ve el personal al escanear la etiqueta QR de un espacio de cultivo. */
export function QRScanPage() {
  const { codigo = '' } = useParams<{ codigo: string }>();
  const { hasRole } = useAuth();
  const { data, isLoading, error } = useEspacioPorQR(codigo);

  if (isLoading) return <Spinner className="py-20" />;

  if (error || !data) {
    const status = (error as { response?: { status?: number } } | null)?.response?.status;
    const otraSucursal = status === 403;
    return (
      <div className="mx-auto max-w-md py-12 text-center space-y-4 animate-fade-in">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          {otraSucursal ? <ShieldAlert className="h-7 w-7 text-warning" /> : <QrCode className="h-7 w-7 text-muted-foreground" />}
        </div>
        <h1 className="text-xl font-semibold">{otraSucursal ? 'Este espacio pertenece a otra sucursal' : 'Código QR no reconocido'}</h1>
        <p className="text-sm text-muted-foreground">
          {otraSucursal
            ? 'No tienes acceso a esa sucursal. Pide a un administrador que te la asigne si corresponde.'
            : 'La etiqueta puede ser antigua (el QR se regeneró) o el espacio no existe. Revisa el código en Cultivo.'}
        </p>
        <Link to="/cultivo"><Button variant="outline">Ir a Cultivo</Button></Link>
      </div>
    );
  }

  const { espacio, cosechas } = data;
  const paciente = populated<PatientRef>(espacio.paciente);
  const ubic = populated<UbicacionRef>(espacio.ubicacion);
  const activo = espacio.estado === 'activo';
  const puedeOperar = hasRole('admin', 'operador', 'cultivo');

  return (
    <div className="mx-auto max-w-xl space-y-4 animate-fade-in">
      <Card className="border-primary/30">
        <CardContent className="pt-6 space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Ubicación</p>
          <p className="flex items-start gap-2 text-xl font-semibold leading-tight">
            <MapPin className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
            <span>
              {ubic ? `${ubic.nombre} · ${ubic.codigo}` : 'Sin ubicación'}
              {ubic?.tipo && <span className="block text-sm font-normal text-muted-foreground">{UBICACION_TIPO_LABELS[ubic.tipo]}</span>}
            </span>
          </p>
          <p className="text-sm text-muted-foreground pl-7">{sucursalLabel(espacio.sucursal)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 font-mono font-semibold">
              <Sprout className="h-4 w-4 text-success" />
              {espacio.codigo}
            </p>
            <StatusBadge
              label={ESPACIO_ESTADO_LABELS[espacio.estado]}
              variant={activo ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Flor</p>
              <p className="font-medium">{espacio.flor}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Superficie</p>
              <p className="font-medium">{espacio.metrosCuadrados} m²</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Paciente</p>
              {paciente ? (
                <p className="font-medium">
                  {paciente.nombre} {paciente.apellido}{' '}
                  <span className="font-mono text-xs text-muted-foreground">{paciente.rut}</span>
                  {paciente.estado && (
                    <span className="block text-xs font-normal text-muted-foreground">
                      Estado: {PATIENT_STATUS_LABELS[paciente.estado]}
                    </span>
                  )}
                </p>
              ) : (
                <p>—</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <p className="flex items-center gap-2 text-sm font-semibold"><Wheat className="h-4 w-4" />Últimas cosechas</p>
          {cosechas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin cosechas registradas.</p>
          ) : (
            <div className="divide-y rounded-xl border">
              {cosechas.slice(0, 5).map((c) => (
                <div key={c._id} className="flex items-center justify-between gap-2 p-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-mono text-xs truncate">{c.lote}</p>
                    <p className="text-muted-foreground">
                      {formatDateOnly(c.fecha)}
                      {c.pesoSeco != null ? ` · ${formatNumber(c.pesoSeco)} g seco` : ''}
                    </p>
                  </div>
                  <StatusBadge
                    label={COSECHA_ESTADO_LABELS[c.estado]}
                    variant={c.estado === 'en_inventario' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {hasRole('admin', 'operador', 'cultivo') && (
        <div className="grid gap-2 sm:grid-cols-2">
          <Link to={`/cultivo/espacios/${espacio._id}`}>
            <Button variant="outline" className="w-full h-11">
              Ver ficha del espacio <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
          {puedeOperar && activo && (
            <Link to={`/cultivo/espacios/${espacio._id}?cosecha=1`}>
              <Button className="w-full h-11"><Wheat className="h-4 w-4 mr-2" />Registrar cosecha</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
