import { useEffect, useState } from 'react';
import { authAPI, usersAPI, sucursalesAPI, apiErrorMessage } from '@/services/api';
import type { Sucursal, User, UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { USER_ROLE_LABELS } from '@/lib/constants';
import { toast } from 'sonner';

/** Roles internos que se pueden asignar (los pacientes se registran por el portal). */
const STAFF_ROLES: UserRole[] = ['admin', 'operador', 'cultivo', 'produccion', 'finanzas'];

const ROLE_HINTS: Record<string, string> = {
  admin: 'Acceso total. Activa pacientes, revisa documentos y ve la auditoría.',
  operador: 'Pacientes, dispensación, inventario y transferencias de sus dispensarios.',
  cultivo: 'Espacios de cultivo, QR, cosechas, inventario y transferencias. No ve fichas clínicas.',
  produccion: 'Productos, producción, inventario y transferencias.',
  finanzas: 'Ingresos y egresos.',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Si viene, se edita ese usuario; si no, se crea uno nuevo. */
  user?: User | null;
  onSaved: () => void;
}

const selectClass = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm';

export function UserFormDialog({ open, onOpenChange, user, onSaved }: Props) {
  const isEdit = !!user;
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [role, setRole] = useState<UserRole>('operador');
  const [selectedSucursales, setSelectedSucursales] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRole(user?.role ?? 'operador');
    setSelectedSucursales(user?.sucursales?.map((s) => s._id) ?? []);
    sucursalesAPI
      .list({ activo: 'true' })
      .then((r) => setSucursales(r.data))
      .catch(() => toast.error('Error al cargar dispensarios'));
  }, [open, user]);

  const toggleSucursal = (id: string) =>
    setSelectedSucursales((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (role !== 'admin' && selectedSucursales.length === 0) {
      toast.error('Asigna al menos un dispensario');
      return;
    }
    setIsSaving(true);
    try {
      if (isEdit && user) {
        await usersAPI.update(user._id, {
          nombre: form.get('nombre') as string,
          apellido: form.get('apellido') as string,
          telefono: (form.get('telefono') as string) || undefined,
          role,
          sucursales: selectedSucursales as unknown as User['sucursales'],
        });
        toast.success('Usuario actualizado');
      } else {
        // Solo crea la cuenta; la sesión del admin no cambia.
        await authAPI.register({
          email: form.get('email') as string,
          password: form.get('password') as string,
          nombre: form.get('nombre') as string,
          apellido: form.get('apellido') as string,
          rut: form.get('rut') as string,
          telefono: (form.get('telefono') as string) || undefined,
          role,
          sucursales: selectedSucursales,
        });
        toast.success('Usuario creado');
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(apiErrorMessage(err, isEdit ? 'Error al actualizar usuario' : 'Error al crear usuario'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar usuario' : 'Nuevo usuario interno'}</DialogTitle>
          <DialogDescription>
            {isEdit ? user?.email : 'Los pacientes se registran desde el portal, no aquí.'}
          </DialogDescription>
        </DialogHeader>
        <form key={user?._id ?? 'nuevo'} onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input name="nombre" defaultValue={user?.nombre} required />
            </div>
            <div className="space-y-2">
              <Label>Apellido</Label>
              <Input name="apellido" defaultValue={user?.apellido} required />
            </div>
            {!isEdit && (
              <>
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
              </>
            )}
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input name="telefono" defaultValue={user?.telefono} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Rol</Label>
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className={selectClass}>
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>{USER_ROLE_LABELS[r]}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">{ROLE_HINTS[role]}</p>
          </div>

          <div className="space-y-2">
            <Label>Dispensarios {role === 'admin' && <span className="font-normal text-muted-foreground">(el admin ve todos)</span>}</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border p-3">
              {sucursales.length === 0 && <p className="text-xs text-muted-foreground">No hay dispensarios activos.</p>}
              {sucursales.map((s) => (
                <label key={s._id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSucursales.includes(s._id)}
                    onChange={() => toggleSucursal(s._id)}
                    className="h-4 w-4 rounded border-input"
                  />
                  {s.nombre} <span className="text-xs text-muted-foreground">({s.codigo})</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? 'Guardando…' : isEdit ? 'Guardar' : 'Crear'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
