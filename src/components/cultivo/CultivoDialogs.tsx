import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cultivoAPI, patientsAPI, productsAPI } from '@/services/api';
import type { Cosecha, EspacioCultivo } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NativeSelect } from '@/components/inventory/NativeSelect';
import { ubicacionLabel } from '@/components/inventory/helpers';
import { UBICACION_TIPO_LABELS } from '@/lib/constants';
import { formatDateOnly } from '@/lib/format';
import { useUbicaciones } from '@/hooks/use-ubicaciones';
import { useCultivoMutation } from '@/hooks/use-cultivo';

const hoy = () => new Date().toISOString().slice(0, 10);

/** Productos activos para ingresar cosechas (normalmente tipo flor). */
function useProductosActivos(enabled: boolean) {
  return useQuery({
    queryKey: ['products', 'list', { limit: '100' }],
    queryFn: () => productsAPI.list({ limit: '100' }).then((r) => r.data),
    enabled,
  });
}

interface IngresoValues {
  producto: string;
  cantidad: string;
  ubicacion: string;
  fechaVencimiento: string;
}

const ingresoVacio: IngresoValues = { producto: '', cantidad: '', ubicacion: '', fechaVencimiento: '' };

/** Campos para ingresar una cosecha a inventario: producto, cantidad, destino y vencimiento. */
function IngresoFields({ value, onChange, enabled }: { value: IngresoValues; onChange: (v: IngresoValues) => void; enabled: boolean }) {
  const { data: productos } = useProductosActivos(enabled);
  const { data: ubicaciones = [] } = useUbicaciones({ activo: 'true' }, enabled);
  const destinos = ubicaciones.filter((u) => u.tipo !== 'sala_cultivo');
  const lista = [...(productos?.data ?? [])].sort((a, b) => (a.tipo === 'flor' ? -1 : 0) - (b.tipo === 'flor' ? -1 : 0));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-2 sm:col-span-2">
        <Label>Producto</Label>
        <NativeSelect required value={value.producto} onChange={(e) => onChange({ ...value, producto: e.target.value })}>
          <option value="" disabled>Seleccionar...</option>
          {lista.map((p) => (
            <option key={p._id} value={p._id}>
              {p.nombre}{p.tipo === 'flor' ? ' (flor)' : ''}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label>Cantidad (unidades del producto)</Label>
        <Input
          type="number"
          min="0.01"
          step="0.01"
          required
          value={value.cantidad}
          onChange={(e) => onChange({ ...value, cantidad: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Destino</Label>
        <NativeSelect value={value.ubicacion} onChange={(e) => onChange({ ...value, ubicacion: e.target.value })}>
          <option value="">Stock general del dispensario</option>
          {destinos.map((u) => (
            <option key={u._id} value={u._id}>
              {u.nombre} · {u.codigo} ({UBICACION_TIPO_LABELS[u.tipo]})
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Fecha de vencimiento (opcional)</Label>
        <Input type="date" value={value.fechaVencimiento} onChange={(e) => onChange({ ...value, fechaVencimiento: e.target.value })} />
      </div>
    </div>
  );
}

function ingresoPayload(v: IngresoValues) {
  return {
    producto: v.producto,
    cantidad: Number(v.cantidad),
    ubicacion: v.ubicacion || undefined,
    fechaVencimiento: v.fechaVencimiento || undefined,
  };
}

// ─── Ceder espacio ─────────────────────────────────────────

export function CederEspacioDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [busqueda, setBusqueda] = useState('');
  const [paciente, setPaciente] = useState('');
  const { data: pacientes, isFetching } = useQuery({
    queryKey: ['patients', 'aprobados', busqueda],
    queryFn: () =>
      patientsAPI
        .list({ estado: 'aprobado', limit: '20', ...(busqueda ? { search: busqueda } : {}) })
        .then((r) => r.data.data),
    enabled: open,
  });
  const { data: salas = [] } = useUbicaciones({ tipo: 'sala_cultivo', activo: 'true' }, open);

  const crear = useCultivoMutation(cultivoAPI.crearEspacio, 'Espacio cedido. Ya puedes imprimir su QR.', 'Error al ceder el espacio');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    crear.mutate(
      {
        paciente,
        ubicacion: String(f.get('ubicacion')),
        metrosCuadrados: Number(f.get('metrosCuadrados')),
        flor: String(f.get('flor')),
        fechaInicio: String(f.get('fechaInicio') || '') || undefined,
        observaciones: String(f.get('observaciones') || '') || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setPaciente('');
          setBusqueda('');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ceder espacio de cultivo</DialogTitle>
          <DialogDescription>Solo a pacientes activos de esta sucursal. Se genera un código QR para la etiqueta.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Paciente</Label>
            <Input placeholder="Buscar por nombre o RUT..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            <NativeSelect required value={paciente} onChange={(e) => setPaciente(e.target.value)}>
              <option value="" disabled>{isFetching ? 'Buscando...' : 'Seleccionar paciente...'}</option>
              {(pacientes ?? []).map((p) => (
                <option key={p._id} value={p._id}>
                  {p.nombre} {p.apellido} — {p.rut}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label>Sala de cultivo</Label>
            <NativeSelect name="ubicacion" required defaultValue="">
              <option value="" disabled>Seleccionar sala...</option>
              {salas.map((s) => (
                <option key={s._id} value={s._id}>{s.nombre} · {s.codigo}</option>
              ))}
            </NativeSelect>
            {salas.length === 0 && (
              <p className="text-xs text-muted-foreground">No hay salas de cultivo activas. Créalas en Ubicaciones.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Metros cuadrados</Label>
              <Input name="metrosCuadrados" type="number" min="0.01" step="0.01" required />
            </div>
            <div className="space-y-2">
              <Label>Fecha de inicio</Label>
              <Input name="fechaInicio" type="date" defaultValue={hoy()} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tipo de flor o variedad</Label>
            <Input name="flor" required />
          </div>
          <div className="space-y-2">
            <Label>Observaciones (opcional)</Label>
            <Textarea name="observaciones" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={crear.isPending || !paciente}>Ceder espacio</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Registrar cosecha ─────────────────────────────────────

export function RegistrarCosechaDialog({
  espacio,
  open,
  onOpenChange,
}: {
  espacio: Pick<EspacioCultivo, '_id' | 'codigo' | 'flor'>;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [ingresar, setIngresar] = useState(false);
  const [ingreso, setIngreso] = useState<IngresoValues>(ingresoVacio);

  const registrar = useCultivoMutation(
    (data: Parameters<typeof cultivoAPI.registrarCosecha>[1]) => cultivoAPI.registrarCosecha(espacio._id, data),
    'Cosecha registrada',
    'Error al registrar la cosecha'
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const num = (k: string) => (f.get(k) ? Number(f.get(k)) : undefined);
    registrar.mutate(
      {
        fecha: String(f.get('fecha') || '') || undefined,
        pesoHumedo: num('pesoHumedo'),
        pesoSeco: num('pesoSeco'),
        observaciones: String(f.get('observaciones') || '') || undefined,
        ingreso: ingresar ? ingresoPayload(ingreso) : undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setIngresar(false);
          setIngreso(ingresoVacio);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar cosecha</DialogTitle>
          <DialogDescription>
            Espacio {espacio.codigo} · {espacio.flor}. Se genera un lote nuevo para la trazabilidad.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input name="fecha" type="date" defaultValue={hoy()} />
            </div>
            <div className="space-y-2">
              <Label>Peso húmedo (g)</Label>
              <Input name="pesoHumedo" type="number" min="0" step="0.1" />
            </div>
            <div className="space-y-2">
              <Label>Peso seco (g)</Label>
              <Input name="pesoSeco" type="number" min="0" step="0.1" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observaciones (opcional)</Label>
            <Textarea name="observaciones" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={ingresar} onCheckedChange={(v) => setIngresar(!!v)} />
            Ingresar a inventario ahora
          </label>
          {ingresar && <IngresoFields value={ingreso} onChange={setIngreso} enabled={open && ingresar} />}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={registrar.isPending}>Registrar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Ingresar cosecha ya registrada ────────────────────────

export function IngresarCosechaDialog({
  cosecha,
  onClose,
}: {
  cosecha: Cosecha | null;
  onClose: () => void;
}) {
  const [ingreso, setIngreso] = useState<IngresoValues>(ingresoVacio);
  const ingresar = useCultivoMutation(
    ({ id, data }: { id: string; data: ReturnType<typeof ingresoPayload> }) => cultivoAPI.ingresarCosecha(id, data),
    'Cosecha ingresada a inventario',
    'Error al ingresar la cosecha'
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!cosecha) return;
    ingresar.mutate(
      { id: cosecha._id, data: ingresoPayload(ingreso) },
      {
        onSuccess: () => {
          setIngreso(ingresoVacio);
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={!!cosecha} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ingresar cosecha a inventario</DialogTitle>
          <DialogDescription>
            Lote <span className="font-mono">{cosecha?.lote}</span>
            {cosecha?.fecha ? ` · cosechado el ${formatDateOnly(cosecha.fecha)}` : ''}
            {cosecha?.ubicacionDestino ? ` · ${ubicacionLabel(cosecha.ubicacionDestino)}` : ''}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <IngresoFields value={ingreso} onChange={setIngreso} enabled={!!cosecha} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={ingresar.isPending}>Ingresar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
