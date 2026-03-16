import { useEffect, useState, useCallback } from 'react';
import { productsAPI, getProductImageUrl } from '@/services/api';
import type { Product, ProductType } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PRODUCT_TYPE_LABELS, PRODUCT_STATUS_LABELS, PRODUCT_STATUS_VARIANTS } from '@/lib/constants';
import { formatCurrency } from '@/lib/format';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
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
import { Plus, Search, Pencil, Trash2, ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

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

  // Image preview cleanup
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileSelect = (file: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

  const resetImageState = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
  };

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
      let productId: string;
      if (editingProduct) {
        await productsAPI.update(editingProduct._id, data);
        productId = editingProduct._id;
        toast.success('Producto actualizado');
      } else {
        const res = await productsAPI.create(data);
        productId = res.data._id;
        toast.success('Producto creado');
      }

      if (selectedFile) {
        setIsUploadingImage(true);
        try {
          const imgForm = new FormData();
          imgForm.append('imagen', selectedFile);
          await productsAPI.uploadImage(productId, imgForm);
          toast.success('Imagen subida correctamente');
        } catch {
          toast.error('Producto guardado, pero falló la subida de imagen');
        } finally {
          setIsUploadingImage(false);
        }
      }

      resetImageState();
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

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader title="Productos" description="Catálogo de productos">
        <Dialog open={isDialogOpen} onOpenChange={(o) => { setIsDialogOpen(o); if (!o) { setEditingProduct(null); resetImageState(); } }}>
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
                    {Object.entries(PRODUCT_TYPE_LABELS).map(([k, v]) => (
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
              {/* Image upload section */}
              <div className="space-y-2">
                <Label>Imagen del Producto</Label>
                <div className="flex items-start gap-4">
                  {/* Preview area */}
                  <div className="relative h-[150px] w-[150px] shrink-0 overflow-hidden rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20">
                    {(previewUrl || (editingProduct?.imagen && getProductImageUrl(editingProduct.imagen))) ? (
                      <>
                        <img
                          src={previewUrl || getProductImageUrl(editingProduct?.imagen) || ''}
                          alt="Preview"
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleFileSelect(null)}
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                        <ImagePlus className="h-8 w-8" />
                        <span className="text-xs text-center px-2">Click para subir</span>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                        />
                      </label>
                    )}
                  </div>
                  {/* File info / change button */}
                  <div className="flex flex-col gap-2 pt-1">
                    {(previewUrl || (editingProduct?.imagen && getProductImageUrl(editingProduct.imagen))) && (
                      <label className="cursor-pointer">
                        <Button type="button" variant="outline" size="sm" className="pointer-events-none">
                          <ImagePlus className="h-4 w-4 mr-1" />
                          Cambiar imagen
                        </Button>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                        />
                      </label>
                    )}
                    {selectedFile && (
                      <p className="text-xs text-muted-foreground">{selectedFile.name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">JPG, JPEG o PNG</p>
                  </div>
                </div>
              </div>
              {isUploadingImage && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                  Subiendo imagen...
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); setEditingProduct(null); }}>
                  Cancelar
                </Button>
                <Button type="submit">{editingProduct ? 'Actualizar' : 'Crear'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar productos..." value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10 rounded-xl" />
            </div>
            <Select value={typeFilter} onValueChange={(v: string | null) => { setTypeFilter(v === 'all' || !v ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(PRODUCT_TYPE_LABELS).map(([k, v]) => (
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
              {/* Vista cards en móvil */}
              <div className="md:hidden space-y-3">
                {products.length === 0 ? (
                  <p className="text-center py-12 text-sm text-muted-foreground/70">No se encontraron productos</p>
                ) : (
                  products.map((p) => (
                    <Card key={p._id}>
                      <CardContent className="pt-4">
                        {getProductImageUrl(p.imagen) && (
                          <div className="mb-3 overflow-hidden rounded-lg">
                            <img
                              src={getProductImageUrl(p.imagen)!}
                              alt={p.nombre}
                              className="h-40 w-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="font-medium">{p.nombre}</p>
                            <p className="text-sm text-muted-foreground">{PRODUCT_TYPE_LABELS[p.tipo]} · Lote {p.lote}</p>
                          </div>
                          <StatusBadge label={PRODUCT_STATUS_LABELS[p.estado]} variant={PRODUCT_STATUS_VARIANTS[p.estado]} />
                        </div>
                        <div className="grid grid-cols-2 gap-1 mt-2 text-sm">
                          <span className="text-muted-foreground">Precio</span>
                          <span className="text-right font-medium">{formatCurrency(p.precio)}</span>
                          <span className="text-muted-foreground">Stock</span>
                          <span className="text-right">{p.cantidadDisponible}</span>
                          {p.concentracion && (
                            <>
                              <span className="text-muted-foreground">Concentración</span>
                              <span className="text-right">{p.concentracion}</span>
                            </>
                          )}
                        </div>
                        <div className="flex gap-1 mt-3">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditingProduct(p); setIsDialogOpen(true); }}>
                            <Pencil className="h-4 w-4 mr-1" /> Editar
                          </Button>
                          <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDelete(p._id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
                      <TableHead className="w-[60px]">Imagen</TableHead>
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
                        <TableCell>
                          {getProductImageUrl(p.imagen) ? (
                            <img
                              src={getProductImageUrl(p.imagen)!}
                              alt={p.nombre}
                              className="h-10 w-10 rounded object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-muted-foreground">
                              <ImagePlus className="h-4 w-4" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{p.nombre}</TableCell>
                        <TableCell>{PRODUCT_TYPE_LABELS[p.tipo]}</TableCell>
                        <TableCell className="font-mono text-xs">{p.lote}</TableCell>
                        <TableCell>{p.concentracion || '-'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.precio)}</TableCell>
                        <TableCell className="text-right">{p.cantidadDisponible}</TableCell>
                        <TableCell>
                          <StatusBadge label={PRODUCT_STATUS_LABELS[p.estado]} variant={PRODUCT_STATUS_VARIANTS[p.estado]} />
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
                        <TableCell colSpan={9} className="text-center py-12 text-sm text-muted-foreground/70">
                          No se encontraron productos
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
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
