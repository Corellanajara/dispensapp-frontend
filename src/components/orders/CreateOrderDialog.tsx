import { useEffect, useMemo, useState } from 'react';
import { ordersAPI, patientsAPI, inventoryAPI, apiErrorMessage } from '@/services/api';
import type { Patient, SucursalStock, Product, UbicacionRef } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PATIENT_STATUS_LABELS, PATIENT_STATUS_VARIANTS } from '@/lib/constants';
import { formatDateOnly, daysUntil } from '@/lib/format';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, X, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

interface ProductOption {
  _id: string;
  nombre: string;
  disponible: number;
}

const selectClass = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm';

/** Motivo por el que el paciente no puede recibir una dispensación, o null si puede. */
function motivoBloqueo(p: Patient): string | null {
  if (p.estado !== 'aprobado') {
    if (p.estado === 'suspendido' && p.motivoSuspension === 'receta_vencida') return 'Suspendido: receta vencida';
    return `No está activo (${PATIENT_STATUS_LABELS[p.estado]})`;
  }
  if (!p.recetaVigente) return 'Sin receta aprobada y vigente';
  return null;
}

function esDispensable(s: SucursalStock): boolean {
  if (!s.ubicacion) return true;
  if (typeof s.ubicacion === 'string') return false;
  return (s.ubicacion as UbicacionRef).tipo === 'dispensario';
}

export function CreateOrderDialog({ open, onOpenChange, onCreated }: Props) {
  const { sucursalActiva } = useAuth();
  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [stock, setStock] = useState<SucursalStock[]>([]);
  const [items, setItems] = useState<{ producto: string; cantidad: number }[]>([{ producto: '', cantidad: 1 }]);
  const [tipoEntrega, setTipoEntrega] = useState<'retiro' | 'despacho'>('retiro');
  const [observaciones, setObservaciones] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Reinicia el formulario al abrir y carga el stock dispensable
  useEffect(() => {
    if (!open) return;
    setSearch('');
    setSelected(null);
    setItems([{ producto: '', cantidad: 1 }]);
    setTipoEntrega('retiro');
    setObservaciones('');
    inventoryAPI
      .stock({ conStock: 'true' })
      .then((r) => setStock(r.data))
      .catch(() => toast.error('Error al cargar el stock'));
  }, [open]);

  // Búsqueda de pacientes con pequeña espera
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const params: Record<string, string> = { limit: '15' };
      if (search.trim()) params.search = search.trim();
      patientsAPI
        .list(params)
        .then((r) => setPatients(r.data.data))
        .catch(() => toast.error('Error al buscar pacientes'));
    }, 250);
    return () => clearTimeout(t);
  }, [search, open]);

  const productOptions = useMemo<ProductOption[]>(() => {
    const map = new Map<string, ProductOption>();
    for (const s of stock) {
      if (!esDispensable(s) || s.cantidadDisponible <= 0 || !s.producto || typeof s.producto === 'string') continue;
      const p = s.producto as Product;
      const actual = map.get(p._id);
      if (actual) actual.disponible += s.cantidadDisponible;
      else map.set(p._id, { _id: p._id, nombre: p.nombre, disponible: s.cantidadDisponible });
    }
    return [...map.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [stock]);

  const updateItem = (idx: number, patch: Partial<{ producto: string; cantidad: number }>) =>
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const validItems = items.filter((i) => i.producto && i.cantidad > 0);
  const canSubmit = !!selected && !motivoBloqueo(selected) && validItems.length > 0 && !isSaving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setIsSaving(true);
    try {
      await ordersAPI.create({
        paciente: selected._id,
        items: validItems,
        tipoEntrega,
        observaciones: observaciones || undefined,
      });
      toast.success('Nota de dispensación creada');
      onOpenChange(false);
      onCreated();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Error al crear la nota'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva nota de dispensación</DialogTitle>
          <DialogDescription>
            {sucursalActiva ? `Se dispensa en ${sucursalActiva.nombre}. ` : ''}
            La receta vigente del paciente se asocia automáticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Paciente */}
          <div className="space-y-2">
            <Label>Paciente</Label>
            {selected ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{selected.nombre} {selected.apellido}</p>
                  <p className="text-xs text-muted-foreground">
                    {selected.rut}
                    {selected.recetaVigente && ` · Receta vence ${formatDateOnly(selected.recetaVigente.fechaVencimiento)}`}
                    {selected.limiteMensualUnidades > 0 && ` · Límite ${selected.limiteMensualUnidades} unidades/30 días`}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(null)}>
                  <X className="h-4 w-4 mr-1" />Cambiar
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o RUT…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                    autoFocus
                  />
                </div>
                <div className="max-h-56 overflow-y-auto rounded-lg border divide-y">
                  {patients.length === 0 ? (
                    <p className="p-4 text-center text-sm text-muted-foreground">Sin resultados</p>
                  ) : (
                    patients.map((p) => {
                      const bloqueo = motivoBloqueo(p);
                      const dias = daysUntil(p.recetaVigente?.fechaVencimiento);
                      return (
                        <button
                          key={p._id}
                          type="button"
                          disabled={!!bloqueo}
                          onClick={() => setSelected(p)}
                          className="flex w-full items-center justify-between gap-3 p-3 text-left text-sm hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <div className="min-w-0">
                            <p className="font-medium">{p.nombre} {p.apellido}</p>
                            <p className="text-xs text-muted-foreground">
                              {p.rut}
                              {bloqueo
                                ? ` · ${bloqueo}`
                                : ` · Receta vence ${formatDateOnly(p.recetaVigente?.fechaVencimiento)}${dias !== null && dias <= 30 ? ` (${dias} días)` : ''}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <StatusBadge label={PATIENT_STATUS_LABELS[p.estado]} variant={PATIENT_STATUS_VARIANTS[p.estado]} />
                            {!bloqueo && <Check className="h-4 w-4 text-muted-foreground" />}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>

          {/* Productos */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Productos</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setItems([...items, { producto: '', cantidad: 1 }])}
              >
                <Plus className="h-3 w-3 mr-1" />Agregar
              </Button>
            </div>
            {productOptions.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No hay stock disponible para dispensar en este dispensario. El stock en sala o bodega se debe transferir primero a una ubicación de dispensación.
              </p>
            )}
            {items.map((item, idx) => {
              const opt = productOptions.find((o) => o._id === item.producto);
              return (
                <div key={idx} className="flex gap-2 items-center">
                  <select
                    value={item.producto}
                    onChange={(e) => updateItem(idx, { producto: e.target.value })}
                    className={`${selectClass} flex-1`}
                  >
                    <option value="">Seleccionar producto…</option>
                    {productOptions.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.nombre} (disponible: {p.disponible})
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min={1}
                    max={opt?.disponible}
                    value={item.cantidad}
                    onChange={(e) => updateItem(idx, { cantidad: parseInt(e.target.value, 10) || 0 })}
                    className="w-24"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setItems(items.filter((_, i) => i !== idx))}
                    disabled={items.length === 1}
                    aria-label="Quitar"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de entrega</Label>
              <select
                value={tipoEntrega}
                onChange={(e) => setTipoEntrega(e.target.value as 'retiro' | 'despacho')}
                className={selectClass}
              >
                <option value="retiro">Retiro en dispensario</option>
                <option value="despacho">Despacho a domicilio</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={!canSubmit}>{isSaving ? 'Creando…' : 'Crear nota'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
