import { useEffect, useState, useCallback } from 'react';
import { inventoryAPI, productsAPI } from '@/services/api';
import type { InventoryMovement, Product, MovementType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

const typeLabels: Record<MovementType, string> = {
  produccion: 'Producción', ingreso: 'Ingreso', ajuste: 'Ajuste',
  venta: 'Venta', merma: 'Merma', transferencia: 'Transferencia',
};

const typeColors: Record<MovementType, string> = {
  produccion: 'bg-blue-100 text-blue-800', ingreso: 'bg-green-100 text-green-800',
  ajuste: 'bg-yellow-100 text-yellow-800', venta: 'bg-purple-100 text-purple-800',
  merma: 'bg-red-100 text-red-800', transferencia: 'bg-gray-100 text-gray-800',
};

export function InventoryPage() {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [stock, setStock] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchLote, setSearchLote] = useState('');
  const [traceData, setTraceData] = useState<{ lote: string; producto: Product; movimientos: InventoryMovement[] } | null>(null);

  const fetchMovements = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await inventoryAPI.movements({ page: page.toString(), limit: '20' });
      setMovements(data.data);
      setTotal(data.pagination.total);
    } catch {
      toast.error('Error al cargar movimientos');
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  const fetchStock = async () => {
    try {
      const { data } = await inventoryAPI.stock();
      setStock(data);
    } catch {
      toast.error('Error al cargar stock');
    }
  };

  useEffect(() => { fetchMovements(); fetchStock(); }, [fetchMovements]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await inventoryAPI.createMovement({
        producto: form.get('producto'),
        tipo: form.get('tipo'),
        cantidad: parseFloat(form.get('cantidad') as string),
        motivo: form.get('motivo'),
        lote: form.get('lote'),
      });
      toast.success('Movimiento registrado');
      setIsCreateOpen(false);
      fetchMovements();
      fetchStock();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Error al crear movimiento');
    }
  };

  const handleTrace = async () => {
    if (!searchLote) return;
    try {
      const { data } = await inventoryAPI.traceability(searchLote);
      setTraceData(data);
    } catch {
      toast.error('Error al buscar trazabilidad');
    }
  };

  const loadProducts = async () => {
    const { data } = await productsAPI.list({ limit: '100' });
    setProducts(data.data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Inventario</h1>
        <Dialog open={isCreateOpen} onOpenChange={(o) => { setIsCreateOpen(o); if (o) loadProducts(); }}>
          <Button onClick={() => { setIsCreateOpen(true);
            loadProducts();
          }}><Plus className="h-4 w-4 mr-2" />Nuevo Movimiento</Button>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Movimiento</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Producto</Label>
                <select name="producto" required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                  <option value="">Seleccionar...</option>
                  {products.map((p) => <option key={p._id} value={p._id}>{p.nombre} (Stock: {p.cantidadDisponible})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <select name="tipo" required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                    <option value="">Seleccionar...</option>
                    <option value="ingreso">Ingreso</option>
                    <option value="ajuste">Ajuste</option>
                    <option value="merma">Merma</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Cantidad</Label>
                  <Input name="cantidad" type="number" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Lote (opcional)</Label>
                <Input name="lote" />
              </div>
              <div className="space-y-2">
                <Label>Motivo</Label>
                <Input name="motivo" required />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                <Button type="submit">Registrar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">Stock Actual</TabsTrigger>
          <TabsTrigger value="movements">Movimientos</TabsTrigger>
          <TabsTrigger value="traceability">Trazabilidad</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead className="text-right">Disponible</TableHead>
                    <TableHead className="text-right">Reservado</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stock.map((p) => (
                    <TableRow key={p._id}>
                      <TableCell className="font-medium">{p.nombre}</TableCell>
                      <TableCell className="capitalize">{p.tipo}</TableCell>
                      <TableCell className="font-mono text-xs">{p.lote}</TableCell>
                      <TableCell className="text-right">{p.cantidadDisponible}</TableCell>
                      <TableCell className="text-right">{p.cantidadReservada}</TableCell>
                      <TableCell>
                        <Badge className={p.estado === 'disponible' ? 'bg-green-100 text-green-800' : p.estado === 'agotado' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}>
                          {p.estado}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Lote</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Antes</TableHead>
                        <TableHead className="text-right">Después</TableHead>
                        <TableHead>Motivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.map((m) => (
                        <TableRow key={m._id}>
                          <TableCell>{new Date(m.createdAt).toLocaleDateString('es-CL')}</TableCell>
                          <TableCell>{m.producto == null ? '—' : typeof m.producto === 'string' ? m.producto : (m.producto as Product).nombre}</TableCell>
                          <TableCell><Badge className={typeColors[m.tipo]}>{typeLabels[m.tipo]}</Badge></TableCell>
                          <TableCell className="font-mono text-xs">{m.lote}</TableCell>
                          <TableCell className={`text-right font-medium ${m.cantidad >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {m.cantidad >= 0 ? '+' : ''}{m.cantidad}
                          </TableCell>
                          <TableCell className="text-right">{m.cantidadAnterior}</TableCell>
                          <TableCell className="text-right">{m.cantidadNueva}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{m.motivo}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex justify-between items-center mt-4">
                    <p className="text-sm text-muted-foreground">Total: {total}</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
                      <Button variant="outline" size="sm" disabled={movements.length < 20} onClick={() => setPage(page + 1)}>Siguiente</Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="traceability">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Trazabilidad por Lote</CardTitle>
              <div className="flex gap-2 mt-2">
                <Input placeholder="Código de lote..." value={searchLote} onChange={(e) => setSearchLote(e.target.value)} className="max-w-sm" />
                <Button onClick={handleTrace}><Search className="h-4 w-4 mr-2" />Buscar</Button>
              </div>
            </CardHeader>
            <CardContent>
              {traceData ? (
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium">Lote: {traceData.lote}</h3>
                    {traceData.producto && <p className="text-sm text-muted-foreground">Producto: {traceData.producto.nombre}</p>}
                    <p className="text-sm text-muted-foreground">{traceData.movimientos.length} movimientos registrados</p>
                  </div>
                  {traceData.movimientos.map((m, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                      <div>
                        <p className="font-medium text-sm">{typeLabels[m.tipo]} — {m.motivo}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(m.createdAt).toLocaleString('es-CL')} • Cant: {m.cantidad}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-10">Ingrese un código de lote para ver su trazabilidad</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
