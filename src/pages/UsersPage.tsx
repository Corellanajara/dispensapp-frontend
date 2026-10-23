import { useEffect, useState, useCallback } from 'react';
import { usersAPI, apiErrorMessage } from '@/services/api';
import type { User, UserRole } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, UserCheck, UserX, Pencil, LockOpen } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateShort } from '@/lib/format';
import { USER_ROLE_LABELS } from '@/lib/constants';
import { PageHeader } from '@/components/shared/PageHeader';
import { UserFormDialog } from '@/components/admin/UserFormDialog';
import { useAuth } from '@/contexts/AuthContext';

const roleColors: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-800',
  operador: 'bg-blue-100 text-blue-800',
  produccion: 'bg-orange-100 text-orange-800',
  cultivo: 'bg-emerald-100 text-emerald-800',
  finanzas: 'bg-green-100 text-green-800',
  paciente: 'bg-gray-100 text-gray-800',
};

export function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = { page: page.toString(), limit: '20' };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const { data } = await usersAPI.list(params);
      setUsers(data.data);
      setTotal(data.pagination.total);
      setPages(data.pagination.pages || 1);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error al cargar usuarios'));
    } finally {
      setIsLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleToggleActive = async (id: string) => {
    try {
      await usersAPI.toggleActive(id);
      toast.success('Estado actualizado');
      fetchUsers();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error al cambiar estado'));
    }
  };

  const handleUnlock = async (u: User) => {
    try {
      await usersAPI.unlock(u._id);
      toast.success(`Cuenta de ${u.nombre} desbloqueada`);
      fetchUsers();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error al desbloquear'));
    }
  };

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (u: User) => { setEditing(u); setFormOpen(true); };

  const estaBloqueado = (u: User) => !!u.bloqueadoHasta && new Date(u.bloqueadoHasta).getTime() > Date.now();

  const isMe = (u: User) => !!me && (u._id === me.id || u.email === me.email);

  const actions = (u: User) => (
    <div className="flex items-center gap-1">
      {u.role !== 'paciente' && (
        <Button variant="ghost" size="sm" title="Editar rol y dispensarios" onClick={() => openEdit(u)}>
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      {estaBloqueado(u) && (
        <Button
          variant="ghost"
          size="sm"
          title="Desbloquear (bloqueada por intentos fallidos de inicio de sesión)"
          onClick={() => handleUnlock(u)}
        >
          <LockOpen className="h-4 w-4 text-amber-600" />
        </Button>
      )}
      {!isMe(u) && (
        <Button
          variant="ghost"
          size="sm"
          title={u.activo ? 'Desactivar' : 'Activar'}
          onClick={() => handleToggleActive(u._id)}
        >
          {u.activo ? <UserX className="h-4 w-4 text-red-600" /> : <UserCheck className="h-4 w-4 text-green-600" />}
        </Button>
      )}
    </div>
  );

  const sucursalesText = (u: User) =>
    u.role === 'admin' ? 'Todos' : u.sucursales?.length ? u.sucursales.map((s) => s.codigo).join(', ') : '—';

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader title="Usuarios" description="Cuentas del personal, roles y dispensarios asignados">
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Nuevo usuario</Button>
      </PageHeader>

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editing} onSaved={fetchUsers} />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuarios…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10 rounded-xl"
              />
            </div>
            <Select
              value={roleFilter || 'all'}
              onValueChange={(v: string | null) => { setRoleFilter(v === 'all' || !v ? '' : v); setPage(1); }}
            >
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Rol">{(v: string) => (v && v !== 'all' ? USER_ROLE_LABELS[v] ?? v : 'Todos los roles')}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                {Object.entries(USER_ROLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
          ) : (
            <>
              {/* Móvil */}
              <div className="md:hidden space-y-3">
                {users.length === 0 ? (
                  <p className="text-center py-12 text-sm text-muted-foreground/70">No se encontraron usuarios</p>
                ) : (
                  users.map((u) => (
                    <Card key={u._id}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start gap-2">
                          <p className="font-medium">{u.nombre} {u.apellido}</p>
                          <Badge className={u.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {u.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                          {estaBloqueado(u) && (
                            <Badge className="ml-1 bg-amber-100 text-amber-800">Bloqueada</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{u.email}</p>
                        <p className="text-xs font-mono">RUT {u.rut}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Badge className={roleColors[u.role]}>{USER_ROLE_LABELS[u.role]}</Badge>
                          <span className="text-xs text-muted-foreground">Dispensarios: {sucursalesText(u)}</span>
                        </div>
                        <div className="mt-2">{actions(u)}</div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Escritorio */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>RUT</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Dispensarios</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Último acceso</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u._id}>
                        <TableCell className="font-medium">{u.nombre} {u.apellido}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell className="font-mono">{u.rut}</TableCell>
                        <TableCell><Badge className={roleColors[u.role]}>{USER_ROLE_LABELS[u.role]}</Badge></TableCell>
                        <TableCell className="text-sm">{sucursalesText(u)}</TableCell>
                        <TableCell>
                          <Badge className={u.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {u.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                          {estaBloqueado(u) && (
                            <Badge className="ml-1 bg-amber-100 text-amber-800">Bloqueada</Badge>
                          )}
                        </TableCell>
                        <TableCell>{u.ultimoAcceso ? formatDateShort(u.ultimoAcceso) : '—'}</TableCell>
                        <TableCell>{actions(u)}</TableCell>
                      </TableRow>
                    ))}
                    {users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-sm text-muted-foreground/70">
                          No se encontraron usuarios
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between items-center mt-4">
                <p className="text-sm text-muted-foreground">Total: {total}</p>
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
