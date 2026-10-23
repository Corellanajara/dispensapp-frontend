import { Fragment, useEffect, useState, useCallback } from 'react';
import { auditAPI, apiErrorMessage } from '@/services/api';
import type { AuditLog, User, SucursalRef } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/format';
import { AUDIT_ACTION_LABELS, USER_ROLE_LABELS } from '@/lib/constants';
import { PageHeader } from '@/components/shared/PageHeader';

const ENTIDADES: Record<string, string> = {
  sesion: 'Sesión',
  usuario: 'Usuario',
  paciente: 'Paciente',
  pedido: 'Nota de dispensación',
  movimiento_inventario: 'Movimiento de inventario',
  sucursal_stock: 'Stock',
  producto: 'Producto',
  produccion: 'Producción',
  espacio_cultivo: 'Espacio de cultivo',
  cosecha: 'Cosecha',
  transferencia: 'Transferencia',
  ubicacion: 'Ubicación',
  sucursal: 'Dispensario',
  dispensaciones: 'Reporte de dispensaciones',
  dashboard: 'Dashboard',
  firma: 'Firma',
  pago: 'Pago',
};

const selectClass = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm';

function userLabel(log: AuditLog): { name: string; role?: string } {
  const u = log.usuario as User | string | null | undefined;
  if (u && typeof u !== 'string') {
    return { name: `${u.nombre ?? ''} ${u.apellido ?? ''}`.trim() || u.email || '—', role: u.role };
  }
  if (log.email) return { name: log.email };
  return { name: 'Sistema' };
}

function sucursalLabel(log: AuditLog) {
  const s = log.sucursal as SucursalRef | string | null | undefined;
  if (!s || typeof s === 'string') return '—';
  return s.codigo || s.nombre;
}

function ResultBadge({ resultado }: { resultado?: string }) {
  if (resultado === 'fallo') return <Badge className="bg-red-100 text-red-800">Fallo</Badge>;
  return <Badge className="bg-green-100 text-green-800">Éxito</Badge>;
}

export function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filters, setFilters] = useState({ accion: '', resultado: '', entidad: '', desde: '', hasta: '' });

  const setFilter = (k: keyof typeof filters, v: string) => {
    setFilters((f) => ({ ...f, [k]: v }));
    setPage(1);
  };
  const hasFilters = Object.values(filters).some(Boolean);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = { page: page.toString(), limit: '50' };
      for (const [k, v] of Object.entries(filters)) if (v) params[k] = v;
      const { data } = await auditAPI.list(params);
      setLogs(data.data);
      setTotal(data.pagination.total);
      setPages(data.pagination.pages || 1);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error al cargar la auditoría'));
    } finally {
      setIsLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const accionLabel = (a: string) => AUDIT_ACTION_LABELS[a] ?? a.replace(/_/g, ' ');
  const entidadLabel = (e: string) => ENTIDADES[e] ?? e.replace(/_/g, ' ');

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Auditoría"
        description="Quién hizo qué, cuándo y desde dónde. La IP indica la red de origen, no una ubicación exacta."
      />

      <Card>
        <CardHeader>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
            <div className="space-y-1 col-span-2 md:col-span-1">
              <Label className="text-xs">Acción</Label>
              <select value={filters.accion} onChange={(e) => setFilter('accion', e.target.value)} className={selectClass}>
                <option value="">Todas</option>
                {Object.entries(AUDIT_ACTION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Entidad</Label>
              <select value={filters.entidad} onChange={(e) => setFilter('entidad', e.target.value)} className={selectClass}>
                <option value="">Todas</option>
                {Object.entries(ENTIDADES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Resultado</Label>
              <select value={filters.resultado} onChange={(e) => setFilter('resultado', e.target.value)} className={selectClass}>
                <option value="">Todos</option>
                <option value="exito">Éxito</option>
                <option value="fallo">Fallo</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Desde</Label>
              <Input type="date" value={filters.desde} onChange={(e) => setFilter('desde', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hasta</Label>
              <Input type="date" value={filters.hasta} onChange={(e) => setFilter('hasta', e.target.value)} />
            </div>
            <div>
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setFilters({ accion: '', resultado: '', entidad: '', desde: '', hasta: '' }); setPage(1); }}
                >
                  <X className="h-4 w-4 mr-1" />Limpiar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <>
              {/* Móvil */}
              <div className="md:hidden space-y-3">
                {logs.length === 0 ? (
                  <p className="text-center py-12 text-sm text-muted-foreground/70">No hay registros</p>
                ) : (
                  logs.map((log) => {
                    const u = userLabel(log);
                    return (
                      <Card key={log._id}>
                        <CardContent className="pt-4">
                          <div className="flex justify-between gap-2">
                            <p className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</p>
                            <ResultBadge resultado={log.resultado} />
                          </div>
                          <p className="font-medium mt-1">
                            {u.name}
                            {u.role && <span className="text-xs text-muted-foreground ml-1">({USER_ROLE_LABELS[u.role] ?? u.role})</span>}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge variant="secondary">{accionLabel(log.accion)}</Badge>
                            <Badge variant="outline">{entidadLabel(log.entidad)}</Badge>
                          </div>
                          <p className="text-xs font-mono text-muted-foreground mt-2">
                            IP: {log.ip || '—'} · {sucursalLabel(log)}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>

              {/* Escritorio */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead>Fecha</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Acción</TableHead>
                      <TableHead>Entidad</TableHead>
                      <TableHead>Resultado</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Dispensario</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const u = userLabel(log);
                      const isOpen = expanded === log._id;
                      const hasDetails = !!(log.detalles || log.userAgent || log.entidadId);
                      return (
                        <Fragment key={log._id}>
                          <TableRow
                            className={hasDetails ? 'cursor-pointer' : undefined}
                            onClick={() => hasDetails && setExpanded(isOpen ? null : log._id)}
                          >
                            <TableCell>
                              {hasDetails && (isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">{formatDateTime(log.createdAt)}</TableCell>
                            <TableCell>
                              {u.name}
                              {u.role && <span className="text-xs text-muted-foreground ml-1">({USER_ROLE_LABELS[u.role] ?? u.role})</span>}
                            </TableCell>
                            <TableCell>{accionLabel(log.accion)}</TableCell>
                            <TableCell>{entidadLabel(log.entidad)}</TableCell>
                            <TableCell><ResultBadge resultado={log.resultado} /></TableCell>
                            <TableCell className="font-mono text-xs">{log.ip || '—'}</TableCell>
                            <TableCell>{sucursalLabel(log)}</TableCell>
                          </TableRow>
                          {isOpen && (
                            <TableRow>
                              <TableCell colSpan={8} className="bg-muted/30">
                                <div className="space-y-1 text-xs">
                                  {log.entidadId && <p><span className="text-muted-foreground">ID:</span> <span className="font-mono">{log.entidadId}</span></p>}
                                  {log.userAgent && <p><span className="text-muted-foreground">Navegador:</span> {log.userAgent}</p>}
                                  {log.detalles && (
                                    <pre className="max-h-64 overflow-auto rounded-md bg-background p-2 font-mono text-[11px] whitespace-pre-wrap break-all">
                                      {JSON.stringify(log.detalles, null, 2)}
                                    </pre>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                    {logs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-sm text-muted-foreground/70">
                          No hay registros
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between items-center mt-4">
                <p className="text-sm text-muted-foreground">Total: {total} registros</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
                  <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Siguiente</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
