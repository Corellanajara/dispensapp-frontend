import { useEffect, useState, useCallback } from 'react';
import { auditAPI } from '@/services/api';
import type { AuditLog, User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Auditoría</h1>

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
                        <TableCell>{new Date(log.createdAt).toLocaleString('es-CL')}</TableCell>
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
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        No hay registros de auditoría
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
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
