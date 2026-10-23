import { useEffect, useState, useCallback } from 'react';
import { sucursalesAPI } from '@/services/api';
import type { Sucursal } from '@/types';
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
import { Plus, Building2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';

export function SucursalesPage() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchSucursales = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await sucursalesAPI.list();
      setSucursales(data);
    } catch {
      toast.error('Error al cargar sucursales');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchSucursales(); }, [fetchSucursales]);

  const handleToggleActive = async (id: string) => {
    try {
      await sucursalesAPI.toggleActive(id);
      toast.success('Estado actualizado');
      fetchSucursales();
    } catch {
      toast.error('Error al cambiar estado');
    }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await sucursalesAPI.create({
        nombre: form.get('nombre') as string,
        codigo: form.get('codigo') as string,
        direccion: {
          calle: form.get('calle') as string,
          numero: form.get('numero') as string,
          comuna: form.get('comuna') as string,
          ciudad: form.get('ciudad') as string,
          region: form.get('region') as string,
        },
        telefono: form.get('telefono') as string,
        email: form.get('email') as string,
        horarioAtencion: form.get('horarioAtencion') as string,
      });
      toast.success('Sucursal creada');
      setIsCreateOpen(false);
      fetchSucursales();
    } catch {
      toast.error('Error al crear sucursal');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sucursales"
        description="Gestión de sucursales del dispensario"
      />

      <div className="flex justify-end">
        <Button onClick={() => setIsCreateOpen(true)} className="rounded-xl">
          <Plus className="h-4 w-4 mr-2" /> Nueva Sucursal
        </Button>
      </div>

      <Card className="rounded-2xl">
        <CardHeader />
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Cargando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sucursales.map((s) => (
                  <TableRow key={s._id}>
                    <TableCell className="font-mono font-medium">{s.codigo}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {s.nombre}
                      </div>
                    </TableCell>
                    <TableCell>{s.direccion.ciudad}</TableCell>
                    <TableCell>{s.telefono || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={s.activo ? 'default' : 'secondary'}>
                        {s.activo ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(s._id)}
                      >
                        {s.activo ? (
                          <XCircle className="h-4 w-4 text-destructive" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {sucursales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No hay sucursales registradas
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Sucursal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" name="nombre" required />
              </div>
              <div>
                <Label htmlFor="codigo">Código</Label>
                <Input id="codigo" name="codigo" required placeholder="ej: SCL" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="calle">Calle</Label>
                <Input id="calle" name="calle" required />
              </div>
              <div>
                <Label htmlFor="numero">Número</Label>
                <Input id="numero" name="numero" required />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="comuna">Comuna</Label>
                <Input id="comuna" name="comuna" required />
              </div>
              <div>
                <Label htmlFor="ciudad">Ciudad</Label>
                <Input id="ciudad" name="ciudad" required />
              </div>
              <div>
                <Label htmlFor="region">Región</Label>
                <Input id="region" name="region" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="telefono">Teléfono</Label>
                <Input id="telefono" name="telefono" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" />
              </div>
            </div>
            <div>
              <Label htmlFor="horarioAtencion">Horario de Atención</Label>
              <Input id="horarioAtencion" name="horarioAtencion" placeholder="ej: Lunes a Viernes 9:00 - 18:00" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Crear Sucursal</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
