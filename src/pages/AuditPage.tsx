import { useEffect, useState, useCallback } from 'react';
import { auditAPI } from '@/services/api';
import type { AuditLog, User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/format';
import { PageHeader } from '@/components/shared/PageHeader';

export function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await auditAPI.list({ page: page.toString(), limit: '50' });
      setLogs(data.data);
      setTotal(data.pagination.total);
    } catch {
      toast.error('Error al cargar logs');
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader title="Auditoría" description="Registro de actividades del sistema" />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Registro de Actividades</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <>
              {/* Vista cards en móvil */}
              <div className="md:hidden space-y-3">
                {logs.length === 0 ? (
                  <p className="text-center py-12 text-sm text-muted-foreground/70">No hay registros de auditoría</p>
                ) : (
                  logs.map((log) => {
                    const user = log.usuario as User;
                    const userName = user == null ? '—' : typeof user === 'string' ? user : `${user.nombre ?? ''} ${user.apellido ?? ''}`.trim() || '—';
                    return (
                      <Card key={log._id}>
                        <CardContent className="pt-4">
                          <p className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</p>
                          <p className="font-medium mt-1">{userName}</p>
                          {user != null && typeof user !== 'string' && (
                            <p className="text-xs text-muted-foreground">({user.role})</p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge variant="secondary" className="capitalize">{log.accion.replace(/_/g, ' ')}</Badge>
                            <Badge variant="outline" className="capitalize">{log.entidad}</Badge>
                          </div>
                          {log.ip && <p className="text-xs font-mono text-muted-foreground mt-2">IP: {log.ip}</p>}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
              {/* Tabla en desktop */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Acción</TableHead>
                      <TableHead>Entidad</TableHead>
                      <TableHead>IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const user = log.usuario as User;
                      return (
                        <TableRow key={log._id}>
                          <TableCell>{formatDateTime(log.createdAt)}</TableCell>
                          <TableCell>
                            {user == null ? '—' : typeof user === 'string' ? user : `${user.nombre ?? ''} ${user.apellido ?? ''}`.trim() || '—'}
                            {user != null && typeof user !== 'string' && (
                              <span className="text-xs text-muted-foreground ml-1">({user.role})</span>
                            )}
                          </TableCell>
                          <TableCell className="capitalize">{log.accion.replace(/_/g, ' ')}</TableCell>
                          <TableCell className="capitalize">{log.entidad}</TableCell>
                          <TableCell className="font-mono text-xs">{log.ip || '-'}</TableCell>
                        </TableRow>
                      );
                    })}
                    {logs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-sm text-muted-foreground/70">
                          No hay registros de auditoría
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
                  <Button variant="outline" size="sm" disabled={logs.length < 50} onClick={() => setPage(page + 1)}>Siguiente</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
