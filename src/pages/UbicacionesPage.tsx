import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Ubicacion, UbicacionTipo, PatientRef, Product } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MapPin, Plus, Pencil, Power } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { NativeSelect } from '@/components/inventory/NativeSelect';
import { sucursalLabel, populated } from '@/components/inventory/helpers';
import { Spinner } from '@/components/inventory/Spinner';
import { UBICACION_TIPO_LABELS } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useUbicaciones, useUbicacion, useSaveUbicacion, useToggleUbicacion } from '@/hooks/use-ubicaciones';

const TIPO_VARIANTS: Record<UbicacionTipo, string> = {
  sala_cultivo: 'bg-success/15 text-success border-success/25',
  bodega: 'bg-info/15 text-info border-info/25',
  dispensario: 'bg-primary/15 text-primary border-primary/25',
};

export function UbicacionesPage() {
  const { hasRole, sucursalActiva } = useAuth();
  const puedeEditar = hasRole('admin', 'operador');
  const puedeActivar = hasRole('admin');

  const [tipoFiltro, setTipoFiltro] = useState('');
  const params: Record<string, string> = tipoFiltro ? { tipo: tipoFiltro } : {};
  const { data: ubicaciones = [], isLoading } = useUbicaciones(params);

  const [editando, setEditando] = useState<Ubicacion | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detalleId, setDetalleId] = useState<string | null>(null);

  const save = useSaveUbicacion();
  const toggle = useToggleUbicacion();

  const abrirNueva = () => {
    setEditando(null);
    setFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const data: Partial<Ubicacion> = {
      nombre: String(f.get('nombre') || ''),
      tipo: f.get('tipo') as UbicacionTipo,
      descripcion: String(f.get('descripcion') || ''),
    };
    if (!editando) data.codigo = String(f.get('codigo') || '');
    save.mutate({ id: editando?._id, data }, { onSuccess: () => setFormOpen(false) });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Ubicaciones"
        description={`Salas de cultivo, bodegas y puntos de dispensación${sucursalActiva ? ` de ${sucursalActiva.nombre}` : ''}`}
      >
        {puedeEditar && (
          <Button onClick={abrirNueva}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva ubicación
          </Button>
        )}
      </PageHeader>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="max-w-xs">
            <NativeSelect value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}>
              <option value="">Todos los tipos</option>
              {Object.entries(UBICACION_TIPO_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </NativeSelect>
          </div>

          {isLoading ? (
            <Spinner />
          ) : ubicaciones.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="No hay ubicaciones"
              description="Crea las salas de cultivo, bodegas y el punto de dispensación de esta sucursal."
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="hidden md:table-cell">Sucursal</TableHead>
                    <TableHead>Estado</TableHead>
                    {(puedeEditar || puedeActivar) && <TableHead className="text-right">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ubicaciones.map((u) => (
                    <TableRow key={u._id} className="cursor-pointer" onClick={() => setDetalleId(u._id)}>
                      <TableCell className="font-mono text-xs">{u.codigo}</TableCell>
                      <TableCell className="font-medium">{u.nombre}</TableCell>
                      <TableCell>
                        <StatusBadge label={UBICACION_TIPO_LABELS[u.tipo]} variant={TIPO_VARIANTS[u.tipo]} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{sucursalLabel(u.sucursal)}</TableCell>
                      <TableCell>
                        <StatusBadge
                          label={u.activo ? 'Activa' : 'Inactiva'}
                          variant={u.activo ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}
                        />
                      </TableCell>
                      {(puedeEditar || puedeActivar) && (
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            {puedeEditar && (
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Editar"
                                onClick={() => {
                                  setEditando(u);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {puedeActivar && (
                              <Button
                                variant="ghost"
                                size="sm"
                                title={u.activo ? 'Desactivar' : 'Activar'}
                                disabled={toggle.isPending}
                                onClick={() => toggle.mutate(u._id)}
                              >
                                <Power className={`h-4 w-4 ${u.activo ? 'text-destructive' : 'text-success'}`} />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar ubicación' : 'Nueva ubicación'}</DialogTitle>
            <DialogDescription>
              {editando
                ? 'El código no se puede cambiar porque puede estar impreso en etiquetas.'
                : `Se creará en ${sucursalActiva?.nombre ?? 'la sucursal activa'}.`}
            </DialogDescription>
          </DialogHeader>
          <form key={editando?._id ?? 'nueva'} onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código</Label>
                <Input
                  name="codigo"
                  defaultValue={editando?.codigo}
                  placeholder="SALA-2"
                  required={!editando}
                  disabled={!!editando}
                  className="uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <NativeSelect name="tipo" defaultValue={editando?.tipo ?? ''} required>
                  <option value="" disabled>Seleccionar...</option>
                  {Object.entries(UBICACION_TIPO_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </NativeSelect>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input name="nombre" defaultValue={editando?.nombre} placeholder="Sala de cultivo 2" required />
            </div>
            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Textarea name="descripcion" defaultValue={editando?.descripcion} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={save.isPending}>{editando ? 'Guardar' : 'Crear'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <UbicacionDetalle id={detalleId} onClose={() => setDetalleId(null)} />
    </div>
  );
}

function UbicacionDetalle({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data, isLoading } = useUbicacion(id);
  const u = data?.ubicacion;

  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{u ? `${u.nombre} · ${u.codigo}` : 'Ubicación'}</SheetTitle>
          <SheetDescription>{u ? `${UBICACION_TIPO_LABELS[u.tipo]} — ${sucursalLabel(u.sucursal)}` : ''}</SheetDescription>
        </SheetHeader>
        {isLoading || !data ? (
          <Spinner />
        ) : (
          <div className="space-y-6 px-4 pb-6">
            {u?.descripcion && <p className="text-sm text-muted-foreground">{u.descripcion}</p>}

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Stock en esta ubicación</h3>
              {data.stock.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin stock.</p>
              ) : (
                <div className="rounded-xl border divide-y">
                  {data.stock.map((s) => (
                    <div key={s._id} className="flex items-center justify-between gap-3 p-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{populated<Product>(s.producto)?.nombre ?? 'Producto'}</p>
                        <Link to={`/inventario?lote=${encodeURIComponent(s.lote)}`} className="font-mono text-xs text-primary hover:underline">
                          {s.lote}
                        </Link>
                      </div>
                      <div className="text-right shrink-0">
                        <p>{s.cantidadDisponible} disp.</p>
                        {s.cantidadReservada > 0 && <p className="text-xs text-muted-foreground">{s.cantidadReservada} reserv.</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {u?.tipo === 'sala_cultivo' && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Espacios de cultivo activos</h3>
                {data.espacios.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay espacios activos en esta sala.</p>
                ) : (
                  <div className="rounded-xl border divide-y">
                    {data.espacios.map((e) => {
                      const p = populated<PatientRef>(e.paciente);
                      return (
                        <Link
                          key={e._id}
                          to={`/cultivo/espacios/${e._id}`}
                          className="flex items-center justify-between gap-3 p-3 text-sm hover:bg-muted/50"
                        >
                          <div className="min-w-0">
                            <p className="font-mono text-xs">{e.codigo}</p>
                            <p className="truncate">{e.flor} · {e.metrosCuadrados} m²</p>
                          </div>
                          <p className="text-xs text-muted-foreground text-right">
                            {p ? `${p.nombre} ${p.apellido}` : ''}
                          </p>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
