import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productsAPI } from '@/services/api';
import type { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NativeSelect } from './NativeSelect';
import { populated, ubicacionLabel } from './helpers';
import { UBICACION_TIPO_LABELS } from '@/lib/constants';
import { formatDateOnly } from '@/lib/format';
import { useStock, useCreateMovement } from '@/hooks/use-inventory';
import { useUbicaciones } from '@/hooks/use-ubicaciones';

type Tipo = 'ingreso' | 'ajuste' | 'merma';

const AYUDA: Record<Tipo, string> = {
  ingreso: 'Suma stock a un lote existente o crea un lote nuevo.',
  ajuste: 'Corrige el stock de un lote. Usa un número negativo para restar.',
  merma: 'Descuenta stock perdido o dañado.',
};

/** Ingreso, ajuste o merma manual. Los traslados se hacen en Transferencias. */
export function MovimientoDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [tipo, setTipo] = useState<Tipo>('ingreso');
  const [loteNuevo, setLoteNuevo] = useState(false);
  const [stockId, setStockId] = useState('');

  const { data: filas = [] } = useStock({}, open);
  const { data: ubicaciones = [] } = useUbicaciones({ activo: 'true' }, open && loteNuevo);
  const { data: productos } = useQuery({
    queryKey: ['products', 'list', { limit: '100' }],
    queryFn: () => productsAPI.list({ limit: '100' }).then((r) => r.data),
    enabled: open && loteNuevo,
  });
  const crear = useCreateMovement();

  const nuevo = tipo === 'ingreso' && loteNuevo;

  const reset = () => {
    setTipo('ingreso');
    setLoteNuevo(false);
    setStockId('');
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const base = { tipo, cantidad: Number(f.get('cantidad')), motivo: String(f.get('motivo')) };
    const data = nuevo
      ? {
          ...base,
          producto: f.get('producto'),
          lote: f.get('lote'),
          ubicacion: f.get('ubicacion') || undefined,
          fechaVencimiento: f.get('fechaVencimiento') || undefined,
        }
      : { ...base, stock: stockId };
    crear.mutate(data, {
      onSuccess: () => {
        reset();
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar movimiento</DialogTitle>
          <DialogDescription>{AYUDA[tipo]} Para trasladar entre ubicaciones usa Transferencias.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <NativeSelect value={tipo} onChange={(e) => { setTipo(e.target.value as Tipo); setLoteNuevo(false); }}>
              <option value="ingreso">Ingreso</option>
              <option value="ajuste">Ajuste</option>
              <option value="merma">Merma</option>
            </NativeSelect>
          </div>

          {tipo === 'ingreso' && (
            <div className="flex gap-2 text-sm">
              <Button type="button" size="sm" variant={!loteNuevo ? 'default' : 'outline'} onClick={() => setLoteNuevo(false)}>
                Lote existente
              </Button>
              <Button type="button" size="sm" variant={loteNuevo ? 'default' : 'outline'} onClick={() => setLoteNuevo(true)}>
                Lote nuevo
              </Button>
            </div>
          )}

          {nuevo ? (
            <>
              <div className="space-y-2">
                <Label>Producto</Label>
                <NativeSelect name="producto" required defaultValue="">
                  <option value="" disabled>Seleccionar...</option>
                  {(productos?.data ?? []).map((p) => (
                    <option key={p._id} value={p._id}>{p.nombre}</option>
                  ))}
                </NativeSelect>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Lote</Label>
                  <Input name="lote" required />
                </div>
                <div className="space-y-2">
                  <Label>Vencimiento</Label>
                  <Input name="fechaVencimiento" type="date" />
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
            </>
          ) : (
            <div className="space-y-2">
              <Label>Lote y ubicación</Label>
              <NativeSelect required value={stockId} onChange={(e) => setStockId(e.target.value)}>
                <option value="" disabled>Seleccionar...</option>
                {filas.map((s) => (
                  <option key={s._id} value={s._id}>
                    {populated<Product>(s.producto)?.nombre ?? 'Producto'} · {s.lote} · {ubicacionLabel(s.ubicacion)} (disp. {s.cantidadDisponible}
                    {s.fechaVencimiento ? `, vence ${formatDateOnly(s.fechaVencimiento)}` : ''})
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}

          <div className="space-y-2">
            <Label>Cantidad</Label>
            <Input name="cantidad" type="number" step="0.01" min={tipo === 'ajuste' ? undefined : '0.01'} required />
          </div>
          <div className="space-y-2">
            <Label>Motivo</Label>
            <Input name="motivo" required />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={crear.isPending}>Registrar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
