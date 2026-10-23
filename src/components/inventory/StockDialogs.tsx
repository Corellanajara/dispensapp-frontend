import { useQueryClient } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { productsAPI, apiErrorMessage } from '@/services/api';
import type { Product, SucursalStock } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NativeSelect } from './NativeSelect';
import { populated, ubicacionLabel } from './helpers';
import { UBICACION_TIPO_LABELS } from '@/lib/constants';
import { toDateInputValue } from '@/lib/format';
import { useAuth } from '@/contexts/AuthContext';
import { useUbicaciones } from '@/hooks/use-ubicaciones';
import { inventoryKeys } from '@/hooks/use-inventory';
import { toast } from 'sonner';

function useStockMutation<TVars>(fn: (v: TVars) => Promise<unknown>, ok: string, err: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.all });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success(ok);
    },
    onError: (e) => toast.error(apiErrorMessage(e, err)),
  });
}

/** Ingresa stock de un producto a la sucursal activa. Queda como movimiento de ingreso. */
export function IngresarStockDialog({
  product,
  onClose,
  pagosHabilitados,
}: {
  product: Product | null;
  onClose: () => void;
  pagosHabilitados: boolean;
}) {
  const { sucursalActiva } = useAuth();
  const { data: ubicaciones = [] } = useUbicaciones({ activo: 'true' }, !!product);
  const crear = useStockMutation(
    (data: Record<string, unknown>) => productsAPI.createStock(data),
    'Stock ingresado',
    'Error al ingresar stock'
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!product) return;
    const f = new FormData(e.currentTarget);
    crear.mutate(
      {
        producto: product._id,
        lote: f.get('lote'),
        cantidadDisponible: Number(f.get('cantidad')),
        ubicacion: f.get('ubicacion') || undefined,
        fechaProduccion: f.get('fechaProduccion') || undefined,
        fechaVencimiento: f.get('fechaVencimiento') || undefined,
        precioLocal: pagosHabilitados && f.get('precioLocal') ? Number(f.get('precioLocal')) : undefined,
        motivo: f.get('motivo') || undefined,
      },
      { onSuccess: onClose }
    );
  };

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ingresar stock</DialogTitle>
          <DialogDescription>
            {product?.nombre} en {sucursalActiva?.nombre ?? 'la sucursal activa'}. Si el lote ya existe en esa ubicación, se suma.
          </DialogDescription>
        </DialogHeader>
        <form key={product?._id} onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lote</Label>
              <Input name="lote" defaultValue={product?.lote} required />
            </div>
            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input name="cantidad" type="number" min="0" step="0.01" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Ubicación</Label>
            <NativeSelect name="ubicacion" defaultValue="">
              <option value="">Stock general del dispensario</option>
              {ubicaciones.map((u) => (
                <option key={u._id} value={u._id}>{u.nombre} · {u.codigo} ({UBICACION_TIPO_LABELS[u.tipo]})</option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha de producción</Label>
              <Input name="fechaProduccion" type="date" defaultValue={toDateInputValue(product?.fechaProduccion)} />
            </div>
            <div className="space-y-2">
              <Label>Vencimiento</Label>
              <Input name="fechaVencimiento" type="date" defaultValue={toDateInputValue(product?.fechaVencimiento)} />
            </div>
          </div>
          {pagosHabilitados && (
            <div className="space-y-2">
              <Label>Precio local (opcional)</Label>
              <Input name="precioLocal" type="number" min="0" />
            </div>
          )}
          <div className="space-y-2">
            <Label>Motivo</Label>
            <Input name="motivo" placeholder="Ingreso de stock" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={crear.isPending}>Ingresar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Edita datos de una fila de stock. Las cantidades solo cambian con movimientos. */
export function EditarStockDialog({
  stock,
  onClose,
  pagosHabilitados,
}: {
  stock: SucursalStock | null;
  onClose: () => void;
  pagosHabilitados: boolean;
}) {
  const actualizar = useStockMutation(
    ({ id, data }: { id: string; data: Record<string, unknown> }) => productsAPI.updateStock(id, data),
    'Stock actualizado',
    'Error al actualizar stock'
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!stock) return;
    const f = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {
      fechaProduccion: f.get('fechaProduccion') || undefined,
      fechaVencimiento: f.get('fechaVencimiento') || undefined,
      activo: f.get('activo') === 'on',
    };
    if (pagosHabilitados) data.precioLocal = f.get('precioLocal') ? Number(f.get('precioLocal')) : undefined;
    actualizar.mutate({ id: stock._id, data }, { onSuccess: onClose });
  };

  return (
    <Dialog open={!!stock} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar stock</DialogTitle>
          <DialogDescription>
            {populated<Product>(stock?.producto)?.nombre} · lote <span className="font-mono">{stock?.lote}</span> ·{' '}
            {ubicacionLabel(stock?.ubicacion)}
          </DialogDescription>
        </DialogHeader>
        <form key={stock?._id} onSubmit={handleSubmit} className="space-y-4">
          <p className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
            Disponible: <strong>{stock?.cantidadDisponible}</strong> · reservado: <strong>{stock?.cantidadReservada}</strong>. Para cambiar
            cantidades registra un movimiento en Inventario (ingreso, ajuste o merma); así queda en el historial.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha de producción</Label>
              <Input name="fechaProduccion" type="date" defaultValue={toDateInputValue(stock?.fechaProduccion)} />
            </div>
            <div className="space-y-2">
              <Label>Vencimiento</Label>
              <Input name="fechaVencimiento" type="date" defaultValue={toDateInputValue(stock?.fechaVencimiento)} />
            </div>
          </div>
          {pagosHabilitados && (
            <div className="space-y-2">
              <Label>Precio local</Label>
              <Input name="precioLocal" type="number" min="0" defaultValue={stock?.precioLocal} />
            </div>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="activo" defaultChecked={stock?.activo ?? true} />
            Activo
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={actualizar.isPending}>Guardar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
