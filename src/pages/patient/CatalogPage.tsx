import { useEffect, useState, useCallback } from 'react';
import { patientPortalAPI } from '@/services/api';
import type { Patient, Product, ProductType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Package } from 'lucide-react';
import { toast } from 'sonner';

const typeLabels: Record<ProductType, string> = {
  flor: 'Flor',
  aceite: 'Aceite',
  crema: 'Crema',
  capsula: 'Cápsula',
  tintura: 'Tintura',
  comestible: 'Comestible',
  otro: 'Otro',
};

const typeColors: Record<ProductType, string> = {
  flor: 'bg-green-100 text-green-800',
  aceite: 'bg-amber-100 text-amber-800',
  crema: 'bg-pink-100 text-pink-800',
  capsula: 'bg-blue-100 text-blue-800',
  tintura: 'bg-purple-100 text-purple-800',
  comestible: 'bg-orange-100 text-orange-800',
  otro: 'bg-gray-100 text-gray-800',
};

export function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(n);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = { page: page.toString(), limit: '12' };
      if (typeFilter) params.tipo = typeFilter;
      const [catalogRes, profileRes] = await Promise.all([
        patientPortalAPI.getCatalog(params),
        patientPortalAPI.getProfile(),
      ]);
      setProducts(catalogRes.data.data);
      setTotal(catalogRes.data.pagination.total);
      setPatient(profileRes.data);
    } catch {
      toast.error('Error al cargar el catálogo');
    } finally {
      setIsLoading(false);
    }
  }, [page, typeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isApproved = patient?.estado === 'aprobado';
  const totalPages = Math.ceil(total / 12);

  return (
    <div className="space-y-6">
      {!isApproved && patient && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Tu cuenta está en revisión. Puedes ver el catálogo pero no realizar pedidos hasta ser aprobado.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Catálogo de Productos</h1>
        <Select value={typeFilter} onValueChange={(v: string | null) => { setTypeFilter(v === 'all' || !v ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tipo de producto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(typeLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-40 animate-pulse bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No se encontraron productos</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <Card key={product._id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={typeColors[product.tipo]}>
                      {typeLabels[product.tipo]}
                    </Badge>
                    {product.cantidadDisponible <= 0 && (
                      <Badge variant="destructive">Agotado</Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg">{product.nombre}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  {product.descripcion && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{product.descripcion}</p>
                  )}
                  <div className="text-sm text-muted-foreground">
                    {product.concentracion && product.presentacion
                      ? `${product.concentracion} • ${product.presentacion}`
                      : product.concentracion || product.presentacion || ''}
                  </div>
                  {product.usoTerapeutico && (
                    <p className="text-xs text-muted-foreground italic">{product.usoTerapeutico}</p>
                  )}
                  <div className="pt-2 border-t flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">{formatCurrency(product.precio)}</span>
                    <span className="text-sm text-muted-foreground">
                      Disponible: {product.cantidadDisponible} unidades
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {total} productos encontrados
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Anterior
                </Button>
                <span className="flex items-center text-sm text-muted-foreground px-2">
                  {page} de {totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
