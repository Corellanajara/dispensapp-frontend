import { useEffect, useState, useCallback } from 'react';
import { usersAPI, authAPI } from '@/services/api';
import type { User, UserRole } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Search, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateShort } from '@/lib/format';
import { PageHeader } from '@/components/shared/PageHeader';

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrador', operador: 'Operador', produccion: 'Producción',
  finanzas: 'Finanzas', paciente: 'Paciente',
};

const roleColors: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-800', operador: 'bg-blue-100 text-blue-800',
  produccion: 'bg-orange-100 text-orange-800', finanzas: 'bg-green-100 text-green-800',
  paciente: 'bg-gray-100 text-gray-800',
};

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = { page: page.toString(), limit: '20' };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const { data } = await usersAPI.list(params);
      setUsers(data.data);
      setTotal(data.pagination.total);
    } catch {
      toast.error('Error al cargar usuarios');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await authAPI.register({
        email: form.get('email') as string,
        password: form.get('password') as string,
        nombre: form.get('nombre') as string,
        apellido: form.get('apellido') as string,
        rut: form.get('rut') as string,
        role: form.get('role') as string,
        telefono: form.get('telefono') as string,
      });
      toast.success('Usuario creado');
      setIsCreateOpen(false);
      fetchUsers();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Error al crear usuario');
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await usersAPI.toggleActive(id);
      toast.success('Estado actualizado');
      fetchUsers();
    } catch {
      toast.error('Error al cambiar estado');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader title="Usuarios" description="Gestión de usuarios del sistema">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <Button onClick={() => setIsCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Nuevo Usuario</Button>
          <DialogContent>
            <DialogHeader><DialogTitle>Crear Usuario</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input name="nombre" required />
                </div>
                <div className="space-y-2">
                  <Label>Apellido</Label>
                  <Input name="apellido" required />
                </div>
                <div className="space-y-2">
                  <Label>RUT</Label>
                  <Input name="rut" required />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label>Contraseña</Label>
                  <Input name="password" type="password" minLength={6} required />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input name="telefono" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Rol</Label>
                  <select name="role" required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                    {Object.entries(roleLabels)
                      .filter(([k]) => k !== 'paciente')
                      .map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                <Button type="submit">Crear</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar usuarios..." value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10 rounded-xl" />
            </div>
            <Select value={roleFilter} onValueChange={(v: string | null) => { setRoleFilter(v === 'all' || !v ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Rol" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(roleLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
          ) : (
            <>
              {/* Vista cards en móvil */}
              <div className="md:hidden space-y-3">
                {users.length === 0 ? (
                  <p className="text-center py-12 text-sm text-muted-foreground/70">No se encontraron usuarios</p>
                ) : (
                  users.map((u) => (
                    <Card key={u._id}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start gap-2">
                          <p className="font-medium">{u.nombre} {u.apellido}</p>
                          <div className="flex items-center gap-1">
                            <Badge className={u.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {u.activo ? 'Activo' : 'Inactivo'}
                            </Badge>
                            <Button variant="ghost" size="sm" onClick={() => handleToggleActive(u._id)}>
                              {u.activo ? <UserX className="h-4 w-4 text-red-600" /> : <UserCheck className="h-4 w-4 text-green-600" />}
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{u.email}</p>
                        <p className="text-xs font-mono">RUT {u.rut}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={roleColors[u.role]}>{roleLabels[u.role]}</Badge>
                          {u.ultimoAcceso && (
                            <span className="text-xs text-muted-foreground">Último acceso: {formatDateShort(u.ultimoAcceso)}</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
              {/* Tabla en desktop */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>RUT</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Último Acceso</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u._id}>
                        <TableCell className="font-medium">{u.nombre} {u.apellido}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell className="font-mono">{u.rut}</TableCell>
                        <TableCell><Badge className={roleColors[u.role]}>{roleLabels[u.role]}</Badge></TableCell>
                        <TableCell>
                          <Badge className={u.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {u.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell>{u.ultimoAcceso ? formatDateShort(u.ultimoAcceso) : '-'}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleToggleActive(u._id)}>
                            {u.activo ? <UserX className="h-4 w-4 text-red-600" /> : <UserCheck className="h-4 w-4 text-green-600" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-sm text-muted-foreground/70">
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
                  <Button variant="outline" size="sm" disabled={users.length < 20} onClick={() => setPage(page + 1)}>Siguiente</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
