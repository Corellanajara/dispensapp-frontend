import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { patientPortalAPI, getProductImageUrl } from '@/services/api';
import type { Patient, ProductType, SucursalStock } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { PRODUCT_TYPE_LABELS } from '@/lib/constants';
import { formatCurrency } from '@/lib/format';
import { useAppConfig } from '@/hooks/use-app-config';
import { PageHeader } from '@/components/shared/PageHeader';
import { PatientStatusBanner } from '@/components/portal/PatientStatusBanner';
import { motivoBloqueoSolicitud, productoDe, precioDe, sucursalDe } from '@/components/portal/portal-helpers';

const typeColors: Record<ProductType, string> = {
  flor: 'bg-green-100 text-green-800',
  aceite: 'bg-amber-100 text-amber-800',
  crema: 'bg-pink-100 text-pink-800',
  capsula: 'bg-blue-100 text-blue-800',
  tintura: 'bg-purple-100 text-purple-800',
  comestible: 'bg-orange-100 text-orange-800',
  otro: 'bg-gray-100 text-gray-800',
};

const PAGE_SIZE = 12;

export function CatalogPage() {
  const config = useAppConfig();
  const [items, setItems] = useState<SucursalStock[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = { page: page.toString(), limit: String(PAGE_SIZE) };
      if (typeFilter) params.tipo = typeFilter;
      const [catalogRes, profileRes] = await Promise.all([
        patientPortalAPI.getCatalog(params),
        patientPortalAPI.getProfile(),
      ]);
      setItems(catalogRes.data.data);
      setTotal(catalogRes.data.pagination.total);
      setPatient(profileRes.data);
    } catch {
      toast.error('Error al cargar los productos');
    } finally {
      setIsLoading(false);
    }
  }, [page, typeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const bloqueo = motivoBloqueoSolicitud(patient);
  const sucursal = sucursalDe(patient);

  return (
    <div className="space-y-8 animate-fade-in">
      {patient && <PatientStatusBanner patient={patient} diasAviso={config.diasAvisoReceta} />}

      <PageHeader
        title="Productos disponibles"
        description={sucursal ? `Stock disponible en ${sucursal.nombre}` : undefined}
      >
        <Select
          value={typeFilter}
          onValueChange={(v: string | null) => {
            setTypeFilter(v === 'all' || !v ? '' : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px] rounded-xl h-11">
            <SelectValue placeholder="Tipo de producto">
              {(v: string) => (v ? PRODUCT_TYPE_LABELS[v as ProductType] ?? 'Todos' : 'Tipo de producto')}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(PRODUCT_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!bloqueo && (
          <Link to="/portal/pedidos/nuevo">
            <Button className="h-11 rounded-xl">
              <ClipboardList className="h-4 w-4 mr-2" />
              Nueva solicitud
            </Button>
          </Link>
        )}
      </PageHeader>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-40 animate-pulse bg-muted rounded-xl" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {sucursal ? 'No hay productos disponibles en tu dispensario' : 'Tu ficha aún no tiene dispensario asignado'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((item) => {
              const product = productoDe(item);
              if (!product) return null;
              const img = getProductImageUrl(product.imagen);
              return (
                <Card key={product._id} className="flex flex-col overflow-hidden">
                  {img ? (
                    <div className="h-48 w-full overflow-hidden bg-muted p-3 pb-0">
                      <img src={img} alt={product.nombre} className="h-full w-full object-cover rounded-xl shadow-sm" />
                    </div>
                  ) : (
                    <div className="flex h-48 items-center justify-center bg-muted/50 m-3 mb-0 rounded-xl">
                      <Package className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                  <CardHeader className="pb-3 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={`${typeColors[product.tipo] ?? typeColors.otro} rounded-full`}>
                        {PRODUCT_TYPE_LABELS[product.tipo] ?? product.tipo}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{product.nombre}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-3 pb-5">
                    {product.descripcion && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{product.descripcion}</p>
                    )}
                    <div className="text-sm text-muted-foreground">
                      {[product.concentracion, product.presentacion].filter(Boolean).join(' • ')}
                    </div>
                    {product.usoTerapeutico && (
                      <p className="text-xs text-muted-foreground italic">{product.usoTerapeutico}</p>
                    )}
                    <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                      {config.pagosHabilitados && precioDe(item) > 0 ? (
                        <span className="text-lg font-bold text-primary">{formatCurrency(precioDe(item))}</span>
                      ) : (
                        <span />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {item.cantidadDisponible} unidad{item.cantidadDisponible === 1 ? '' : 'es'} disponible
                        {item.cantidadDisponible === 1 ? '' : 's'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-between items-center pt-2">
              <p className="text-sm text-muted-foreground">{total} productos</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="rounded-xl" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Anterior
                </Button>
                <span className="flex items-center text-sm text-muted-foreground px-3">
                  {page} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
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
