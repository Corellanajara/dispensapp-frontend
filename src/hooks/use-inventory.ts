import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryAPI, apiErrorMessage } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const inventoryKeys = {
  all: ['inventory'] as const,
  movements: () => [...inventoryKeys.all, 'movements'] as const,
  movementList: (sucursal: string, params: Record<string, string>) =>
    [...inventoryKeys.movements(), sucursal, params] as const,
  stock: (sucursal: string, params: Record<string, string>) => [...inventoryKeys.all, 'stock', sucursal, params] as const,
  porUbicacion: (sucursal: string) => [...inventoryKeys.all, 'por-ubicacion', sucursal] as const,
  traceability: (lote: string) => [...inventoryKeys.all, 'traceability', lote] as const,
};

export function useInventoryMovements(params: Record<string, string> = {}) {
  const { sucursalActiva } = useAuth();
  return useQuery({
    queryKey: inventoryKeys.movementList(sucursalActiva?._id ?? 'todas', params),
    queryFn: () => inventoryAPI.movements(params).then((r) => r.data),
  });
}

/** Stock por lote y ubicación. Filtros: ubicacion (id o "ninguna"), producto, conStock. */
export function useStock(params: Record<string, string> = {}, enabled = true) {
  const { sucursalActiva } = useAuth();
  return useQuery({
    queryKey: inventoryKeys.stock(sucursalActiva?._id ?? 'todas', params),
    queryFn: () => inventoryAPI.stock(params).then((r) => r.data),
    enabled,
  });
}

export function useStockPorUbicacion() {
  const { sucursalActiva } = useAuth();
  return useQuery({
    queryKey: inventoryKeys.porUbicacion(sucursalActiva?._id ?? 'todas'),
    queryFn: () => inventoryAPI.stockPorUbicacion().then((r) => r.data),
  });
}

export function useTraceability(lote: string) {
  return useQuery({
    queryKey: inventoryKeys.traceability(lote),
    queryFn: () => inventoryAPI.traceability(lote).then((r) => r.data),
    enabled: !!lote,
    retry: false,
  });
}

export function useCreateMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => inventoryAPI.createMovement(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.all });
      toast.success('Movimiento registrado');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Error al registrar movimiento')),
  });
}
