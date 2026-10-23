import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product, SucursalStock } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Warehouse } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PRODUCT_STATUS_LABELS, PRODUCT_STATUS_VARIANTS } from '@/lib/constants';
import { formatCurrency, formatDateOnly } from '@/lib/format';
import { useAuth } from '@/contexts/AuthContext';
import { useStock } from '@/hooks/use-inventory';
import { EditarStockDialog } from './StockDialogs';
import { populated, ubicacionLabel, nombreDe } from './helpers';
import { Spinner } from './Spinner';

/** Filas de stock de la sucursal activa, con edición de fechas, precio y activo (no cantidades). */
export function StockSucursalTab({ pagosHabilitados }: { pagosHabilitados: boolean }) {
  const { hasRole, sucursalActiva } = useAuth();
  const puedeEditar = hasRole('admin', 'operador');
  const { data: stock = [], isLoading } = useStock({});
  const [editando, setEditando] = useState<SucursalStock | null>(null);

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          Stock de {sucursalActiva?.nombre ?? 'tus sucursales'} por lote y ubicación. Las cantidades se cambian en{' '}
          <Link to="/inventario" className="underline">Inventario</Link> con un movimiento.
        </p>
        {isLoading ? (
          <Spinner />
        ) : stock.length === 0 ? (
          <EmptyState icon={Warehouse} title="Sin stock" description="Usa “Ingresar stock” en el catálogo para sumar existencias." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead className="text-right">Disponible</TableHead>
                  <TableHead className="text-right">Reservado</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  {pagosHabilitados && <TableHead className="text-right">Precio local</TableHead>}
                  <TableHead>Estado</TableHead>
                  {puedeEditar && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {stock.map((s) => (
                  <TableRow key={s._id} className={s.activo ? '' : 'opacity-60'}>
                    <TableCell className="font-medium">{nombreDe(populated<Product>(s.producto), 'Producto')}</TableCell>
                    <TableCell className="font-mono text-xs">{s.lote}</TableCell>
                    <TableCell className="text-sm">{ubicacionLabel(s.ubicacion)}</TableCell>
                    <TableCell className="text-right">{s.cantidadDisponible}</TableCell>
                    <TableCell className="text-right">{s.cantidadReservada}</TableCell>
                    <TableCell>{formatDateOnly(s.fechaVencimiento)}</TableCell>
                    {pagosHabilitados && (
                      <TableCell className="text-right">{s.precioLocal ? formatCurrency(s.precioLocal) : '—'}</TableCell>
                    )}
                    <TableCell>
                      <StatusBadge label={PRODUCT_STATUS_LABELS[s.estado]} variant={PRODUCT_STATUS_VARIANTS[s.estado]} />
                    </TableCell>
                    {puedeEditar && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" title="Editar" onClick={() => setEditando(s)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <EditarStockDialog stock={editando} onClose={() => setEditando(null)} pagosHabilitados={pagosHabilitados} />
    </Card>
  );
}
