import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { patientsAPI, reportsAPI, downloadBlob, apiErrorMessage } from '@/services/api';
import type { VigenciaAlertPatient } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useDispensacionesReport } from '@/hooks/use-reports';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateOnly, formatDateTime, daysUntil } from '@/lib/format';
import { AlertTriangle, Clock, Download, FileText, Loader2, UserX } from 'lucide-react';
import { toast } from 'sonner';

function hoyISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function PatientList({
  items,
  empty,
  extra,
}: {
  items: VigenciaAlertPatient[];
  empty: string;
  extra?: (p: VigenciaAlertPatient) => React.ReactNode;
}) {
  if (items.length === 0) return <p className="py-4 text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="divide-y rounded-lg border">
      {items.map((p) => (
        <Link
          key={p._id}
          to={`/pacientes/${p._id}`}
          className="flex items-center justify-between gap-3 p-3 text-sm hover:bg-muted/50"
        >
          <div className="min-w-0">
            <p className="font-medium truncate">{p.nombre} {p.apellido}</p>
            <p className="text-xs text-muted-foreground">
              {p.rut}
              {p.sucursal ? ` · ${p.sucursal.codigo}` : ''}
            </p>
          </div>
          {extra?.(p)}
        </Link>
      ))}
    </div>
  );
}

export function FiscalizacionPage() {
  const { sucursalActiva } = useAuth();
  const sucursalKey = sucursalActiva?._id ?? 'todas';

  const alertas = useQuery({
    queryKey: ['vigencia-alertas', sucursalKey],
    queryFn: () => patientsAPI.alertasVigencia().then((r) => r.data),
  });

  const [desde, setDesde] = useState(hoyISO(-30));
  const [hasta, setHasta] = useState(hoyISO());
  const [params, setParams] = useState<Record<string, string>>({ desde: hoyISO(-30), hasta: hoyISO() });
  const [isDownloading, setIsDownloading] = useState(false);

  const reporte = useDispensacionesReport(params, sucursalKey);

  const buscar = () => {
    const p: Record<string, string> = {};
    if (desde) p.desde = desde;
    if (hasta) p.hasta = hasta;
    setParams(p);
  };

  const descargar = async () => {
    setIsDownloading(true);
    try {
      const { data } = await reportsAPI.dispensacionesCSV(params);
      downloadBlob(data, `dispensaciones-${params.desde ?? 'inicio'}-a-${params.hasta ?? hoyISO()}.csv`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo descargar el CSV'));
    } finally {
      setIsDownloading(false);
    }
  };

  const a = alertas.data;
  const filas = reporte.data?.data ?? [];

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Fiscalización"
        description={`Respaldos listos para una revisión${sucursalActiva ? ` · ${sucursalActiva.nombre}` : ''}`}
      />

      {/* Recetas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" />Recetas por vencer
            </CardTitle>
            <CardDescription>Pacientes activos cuya receta vence en los próximos {a?.diasAviso ?? 30} días.</CardDescription>
          </CardHeader>
          <CardContent>
            {alertas.isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <PatientList
                items={a?.porVencer ?? []}
                empty="Ninguna receta vence pronto."
                extra={(p) => {
                  const d = daysUntil(p.recetaVence);
                  return (
                    <div className="text-right shrink-0">
                      <p className="text-xs">{formatDateOnly(p.recetaVence)}</p>
                      <Badge className={d !== null && d <= 7 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}>
                        {d === 0 ? 'vence hoy' : `${d} días`}
                      </Badge>
                    </div>
                  );
                }}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />Activos sin receta vigente
            </CardTitle>
            <CardDescription>No pueden recibir dispensaciones hasta que se apruebe una receta con fecha de vencimiento.</CardDescription>
          </CardHeader>
          <CardContent>
            {alertas.isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <PatientList items={a?.sinRecetaVigente ?? []} empty="Todos los pacientes activos tienen receta vigente." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserX className="h-4 w-4 text-muted-foreground" />Suspendidos por vencimiento
            </CardTitle>
            <CardDescription>Se reactivan al aprobar una receta nueva en su ficha.</CardDescription>
          </CardHeader>
          <CardContent>
            {alertas.isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <PatientList items={a?.suspendidosPorVencimiento ?? []} empty="No hay pacientes suspendidos por vencimiento." />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dispensaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dispensaciones entregadas</CardTitle>
          <CardDescription>
            Una fila por lote entregado: paciente, producto, lote, ubicación y quién aprobó y entregó.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Desde</Label>
              <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-44" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hasta</Label>
              <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-44" />
            </div>
            <Button variant="outline" onClick={buscar}>Ver</Button>
            <Button onClick={descargar} disabled={isDownloading || filas.length === 0}>
              {isDownloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Descargar CSV
            </Button>
          </div>

          {reporte.isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : reporte.isError ? (
            <p className="text-sm text-destructive">{apiErrorMessage(reporte.error, 'Error al cargar el reporte')}</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-2xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entrega</TableHead>
                      <TableHead>Nota</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead className="text-right">Cant.</TableHead>
                      <TableHead>Aprobó</TableHead>
                      <TableHead>Entregó</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filas.slice(0, 200).map((f, i) => (
                      <TableRow key={i}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {f.fechaEntrega ? formatDateTime(String(f.fechaEntrega)) : '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{f.nota}</TableCell>
                        <TableCell className="text-sm">
                          {f.paciente}
                          <span className="block text-xs text-muted-foreground">{f.pacienteRut}</span>
                        </TableCell>
                        <TableCell className="text-sm">{f.producto}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {String(f.lote).startsWith('(') ? (
                            <span className="text-muted-foreground">{f.lote}</span>
                          ) : (
                            <Link to={`/inventario?lote=${encodeURIComponent(String(f.lote))}`} className="text-primary hover:underline">
                              {f.lote}
                            </Link>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{f.ubicacion || '—'}</TableCell>
                        <TableCell className="text-right">{f.cantidad}</TableCell>
                        <TableCell className="text-xs">{f.aprobadoPor || '—'}</TableCell>
                        <TableCell className="text-xs">{f.entregadoPor || '—'}</TableCell>
                      </TableRow>
                    ))}
                    {filas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-10 text-sm text-muted-foreground/70">
                          No hay dispensaciones entregadas en este período
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">
                {filas.length} fila{filas.length === 1 ? '' : 's'}
                {filas.length > 200 && ' · se muestran las primeras 200; el CSV incluye todas'}
                . La descarga queda registrada en auditoría.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-start gap-3 pt-5 text-sm">
          <FileText className="h-5 w-5 shrink-0 text-primary" />
          <p>
            El expediente completo de cada paciente (documentos, activación, cultivo, cosechas, dispensaciones y auditoría)
            está en su ficha → <span className="font-medium">Expediente</span>.{' '}
            <Link to="/pacientes" className="text-primary hover:underline">Ir a pacientes</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
