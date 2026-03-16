import { useEffect, useState, useCallback } from 'react';
import { productionAPI, productsAPI } from '@/services/api';
import type { Production, Product } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PRODUCTION_STATUS_LABELS, PRODUCTION_STATUS_VARIANTS } from '@/lib/constants';
import { formatDateShort } from '@/lib/format';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
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
import { Plus, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export function ProductionPage() {
  const [productions, setProductions] = useState<Production[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [isWasteOpen, setIsWasteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [rawMaterials, setRawMaterials] = useState<{ nombre: string; cantidad: number; unidad: string }[]>([{ nombre: '', cantidad: 0, unidad: 'kg' }]);

  const fetchProductions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = { page: page.toString(), limit: '20' };
      if (statusFilter) params.estado = statusFilter;
      const { data } = await productionAPI.list(params);
      setProductions(data.data);
      setTotal(data.pagination.total);
    } catch {
      toast.error('Error al cargar producciones');
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchProductions(); }, [fetchProductions]);

  const loadProducts = async () => {
    const { data } = await productsAPI.list({ limit: '100' });
    setProducts(data.data);
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await productionAPI.create({
        productoFinal: form.get('productoFinal'),
        cantidadInicial: parseFloat(form.get('cantidadInicial') as string),
        fechaInicio: form.get('fechaInicio'),
        materiasPrimas: rawMaterials.filter((m) => m.nombre),
        observaciones: form.get('observaciones'),
      });
      toast.success('Producción registrada');
      setIsCreateOpen(false);
      setRawMaterials([{ nombre: '', cantidad: 0, unidad: 'kg' }]);
      fetchProductions();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Error al crear producción');
    }
  };

  const handleComplete = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await productionAPI.complete(selectedId, {
        cantidadProducida: parseFloat(form.get('cantidadProducida') as string),
      });
      toast.success('Producción completada');
      setIsCompleteOpen(false);
      fetchProductions();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Error al completar');
    }
  };

  const handleWaste = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await productionAPI.addWaste(selectedId, {
        tipo: form.get('tipo'),
        cantidad: parseFloat(form.get('cantidad') as string),
        motivo: form.get('motivo'),
      });
      toast.success('Merma registrada');
      setIsWasteOpen(false);
      fetchProductions();
    } catch {
      toast.error('Error al registrar merma');
    }
  };

  const addRawMaterial = () => setRawMaterials([...rawMaterials, { nombre: '', cantidad: 0, unidad: 'kg' }]);
  const updateRawMaterial = (idx: number, field: string, value: string | number) => {
    const updated = [...rawMaterials];
    (updated[idx] as Record<string, unknown>)[field] = value;
    setRawMaterials(updated);
  };

  const getProductName = (p: string | Product | null | undefined) => {
    if (p == null) return '—';
    return typeof p === 'string' ? p : (p as Product).nombre ?? '—';
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader title="Producción" description="Control de lotes de producción">
        <Dialog open={isCreateOpen} onOpenChange={(o) => { setIsCreateOpen(o); if (o) loadProducts(); }}>
          <Button onClick={() => { setIsCreateOpen(true);
            loadProducts();
          }}><Plus className="h-4 w-4 mr-2" />Nueva Producción</Button>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Registrar Producción</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Producto Final</Label>
                  <select name="productoFinal" required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                    <option value="">Seleccionar...</option>
                    {products.map((p) => <option key={p._id} value={p._id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Cantidad Inicial</Label>
                  <Input name="cantidadInicial" type="number" step="0.01" required />
                </div>
                <div className="space-y-2">
                  <Label>Fecha Inicio</Label>
                  <Input name="fechaInicio" type="date" required />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Materias Primas</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addRawMaterial}><Plus className="h-3 w-3 mr-1" />Agregar</Button>
                </div>
                {rawMaterials.map((m, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-2">
                    <Input placeholder="Nombre" value={m.nombre} onChange={(e) => updateRawMaterial(idx, 'nombre', e.target.value)} />
                    <Input type="number" placeholder="Cantidad" value={m.cantidad || ''} onChange={(e) => updateRawMaterial(idx, 'cantidad', parseFloat(e.target.value))} />
                    <Input placeholder="Unidad" value={m.unidad} onChange={(e) => updateRawMaterial(idx, 'unidad', e.target.value)} />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Observaciones</Label>
                <Input name="observaciones" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                <Button type="submit">Registrar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Complete Dialog */}
      <Dialog open={isCompleteOpen} onOpenChange={setIsCompleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Completar Producción</DialogTitle></DialogHeader>
          <form onSubmit={handleComplete} className="space-y-4">
            <div className="space-y-2">
              <Label>Cantidad Producida</Label>
              <Input name="cantidadProducida" type="number" step="0.01" required />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCompleteOpen(false)}>Cancelar</Button>
              <Button type="submit">Completar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Waste Dialog */}
      <Dialog open={isWasteOpen} onOpenChange={setIsWasteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Merma</DialogTitle></DialogHeader>
          <form onSubmit={handleWaste} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <select name="tipo" required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                <option value="proceso">Proceso</option>
                <option value="calidad">Calidad</option>
                <option value="almacenamiento">Almacenamiento</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input name="cantidad" type="number" step="0.01" required />
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Input name="motivo" required />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsWasteOpen(false)}>Cancelar</Button>
              <Button type="submit">Registrar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <Select value={statusFilter} onValueChange={(v: string | null) => { setStatusFilter(v === 'all' || !v ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(PRODUCTION_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
          ) : (
            <>
              {/* Vista cards en móvil */}
              <div className="md:hidden space-y-3">
                {productions.length === 0 ? (
                  <p className="text-center py-12 text-sm text-muted-foreground/70">No se encontraron producciones</p>
                ) : (
                  productions.map((p) => (
                    <Card key={p._id}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start gap-2">
                          <p className="font-mono text-sm font-medium">{p.codigoProduccion}</p>
                          <StatusBadge label={PRODUCTION_STATUS_LABELS[p.estado]} variant={PRODUCTION_STATUS_VARIANTS[p.estado]} />
                        </div>
                        <p className="font-medium mt-1">{getProductName(p.productoFinal)}</p>
                        <p className="text-xs font-mono text-muted-foreground">Lote {p.lote}</p>
                        <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                          <div>
                            <span className="text-muted-foreground block text-xs">Inicial</span>
                            <span>{p.cantidadInicial}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-xs">Producida</span>
                            <span>{p.cantidadProducida}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-xs">Mermas</span>
                            <span>{p.totalMermas}</span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">{formatDateShort(p.fechaInicio)}</p>
                        {p.estado === 'en_proceso' && (
                          <div className="flex gap-2 mt-3">
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => { setSelectedId(p._id); setIsCompleteOpen(true); }}>
                              <CheckCircle className="h-4 w-4 mr-1" /> Completar
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => { setSelectedId(p._id); setIsWasteOpen(true); }}>
                              <AlertTriangle className="h-4 w-4 text-orange-600" />
                            </Button>
                          </div>
                        )}
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
                      <TableHead>Código</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead className="text-right">Cant. Inicial</TableHead>
                      <TableHead className="text-right">Producida</TableHead>
                      <TableHead className="text-right">Mermas</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productions.map((p) => (
                      <TableRow key={p._id}>
                        <TableCell className="font-mono">{p.codigoProduccion}</TableCell>
                        <TableCell>{getProductName(p.productoFinal)}</TableCell>
                        <TableCell className="font-mono text-xs">{p.lote}</TableCell>
                        <TableCell className="text-right">{p.cantidadInicial}</TableCell>
                        <TableCell className="text-right">{p.cantidadProducida}</TableCell>
                        <TableCell className="text-right">{p.totalMermas}</TableCell>
                        <TableCell><StatusBadge label={PRODUCTION_STATUS_LABELS[p.estado]} variant={PRODUCTION_STATUS_VARIANTS[p.estado]} /></TableCell>
                        <TableCell>{formatDateShort(p.fechaInicio)}</TableCell>
                        <TableCell>
                          {p.estado === 'en_proceso' && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => { setSelectedId(p._id); setIsCompleteOpen(true); }}>
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => { setSelectedId(p._id); setIsWasteOpen(true); }}>
                                <AlertTriangle className="h-4 w-4 text-orange-600" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {productions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-12 text-sm text-muted-foreground/70">No se encontraron producciones</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between items-center mt-4">
                <p className="text-sm text-muted-foreground">Total: {total}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
                  <Button variant="outline" size="sm" disabled={productions.length < 20} onClick={() => setPage(page + 1)}>Siguiente</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
