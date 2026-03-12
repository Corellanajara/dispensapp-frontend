import { useEffect, useState, useCallback } from 'react';
import { productsAPI } from '@/services/api';
import type { Product, ProductType, ProductStatus } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const typeLabels: Record<ProductType, string> = {
  flor: 'Flor', aceite: 'Aceite', crema: 'Crema', capsula: 'Cápsula',
  tintura: 'Tintura', comestible: 'Comestible', otro: 'Otro',
};

const statusColors: Record<ProductStatus, string> = {
  disponible: 'bg-green-100 text-green-800',
  reservado: 'bg-blue-100 text-blue-800',
  agotado: 'bg-red-100 text-red-800',
};

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = { page: page.toString(), limit: '20' };
      if (search) params.search = search;
      if (typeFilter) params.tipo = typeFilter;
      const { data } = await productsAPI.list(params);
      setProducts(data.data);
      setTotal(data.pagination.total);
    } catch {
      toast.error('Error al cargar productos');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, typeFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data: Partial<Product> = {
      nombre: form.get('nombre') as string,
      tipo: form.get('tipo') as ProductType,
      descripcion: form.get('descripcion') as string,
      concentracion: form.get('concentracion') as string,
      presentacion: form.get('presentacion') as string,
      usoTerapeutico: form.get('usoTerapeutico') as string,
      precio: parseFloat(form.get('precio') as string),
      lote: form.get('lote') as string,
      fechaProduccion: form.get('fechaProduccion') as string,
      fechaVencimiento: form.get('fechaVencimiento') as string,
      cantidadDisponible: parseInt(form.get('cantidadDisponible') as string),
    };

    try {
      if (editingProduct) {
        await productsAPI.update(editingProduct._id, data);
        toast.success('Producto actualizado');
      } else {
        await productsAPI.create(data);
        toast.success('Producto creado');
      }
      setIsDialogOpen(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Error al guardar producto');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este producto?')) return;
    try {
      await productsAPI.delete(id);
      toast.success('Producto eliminado');
      fetchProducts();
    } catch {
      toast.error('Error al eliminar producto');
    }
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Productos</h1>
        <Dialog open={isDialogOpen} onOpenChange={(o) => { setIsDialogOpen(o); if (!o) setEditingProduct(null); }}>
          <Button onClick={() => setIsDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Nuevo Producto</Button>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input name="nombre" defaultValue={editingProduct?.nombre} required />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <select name="tipo" defaultValue={editingProduct?.tipo || ''} required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                    <option value="">Seleccionar...</option>
                    {Object.entries(typeLabels).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Precio (CLP)</Label>
                  <Input name="precio" type="number" defaultValue={editingProduct?.precio} required />
                </div>
                <div className="space-y-2">
                  <Label>Lote</Label>
                  <Input name="lote" defaultValue={editingProduct?.lote} required />
                </div>
                <div className="space-y-2">
                  <Label>Concentración</Label>
                  <Input name="concentracion" defaultValue={editingProduct?.concentracion} />
                </div>
                <div className="space-y-2">
                  <Label>Presentación</Label>
                  <Input name="presentacion" defaultValue={editingProduct?.presentacion} />
                </div>
                <div className="space-y-2">
                  <Label>Cantidad Disponible</Label>
                  <Input name="cantidadDisponible" type="number" defaultValue={editingProduct?.cantidadDisponible || 0} required />
                </div>
                <div className="space-y-2">
                  <Label>Uso Terapéutico</Label>
                  <Input name="usoTerapeutico" defaultValue={editingProduct?.usoTerapeutico} />
                </div>
                <div className="space-y-2">
                  <Label>Fecha Producción</Label>
                  <Input name="fechaProduccion" type="date" defaultValue={editingProduct?.fechaProduccion?.split('T')[0]} required />
                </div>
                <div className="space-y-2">
                  <Label>Fecha Vencimiento</Label>
                  <Input name="fechaVencimiento" type="date" defaultValue={editingProduct?.fechaVencimiento?.split('T')[0]} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea name="descripcion" defaultValue={editingProduct?.descripcion} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); setEditingProduct(null); }}>
                  Cancelar
                </Button>
                <Button type="submit">{editingProduct ? 'Actualizar' : 'Crear'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar productos..." value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
            </div>
            <Select value={typeFilter} onValueChange={(v: string | null) => { setTypeFilter(v === 'all' || !v ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(typeLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Concentración</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p._id}>
                      <TableCell className="font-medium">{p.nombre}</TableCell>
                      <TableCell>{typeLabels[p.tipo]}</TableCell>
                      <TableCell className="font-mono text-xs">{p.lote}</TableCell>
                      <TableCell>{p.concentracion || '-'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(p.precio)}</TableCell>
                      <TableCell className="text-right">{p.cantidadDisponible}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[p.estado]}>{p.estado}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingProduct(p); setIsDialogOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(p._id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {products.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                        No se encontraron productos
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex justify-between items-center mt-4">
                <p className="text-sm text-muted-foreground">Total: {total} productos</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
                  <Button variant="outline" size="sm" disabled={products.length < 20} onClick={() => setPage(page + 1)}>Siguiente</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
