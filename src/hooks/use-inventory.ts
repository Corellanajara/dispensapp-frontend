import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryAPI } from '@/services/api';
import { toast } from 'sonner';

export const inventoryKeys = {
  all: ['inventory'] as const,
  movements: () => [...inventoryKeys.all, 'movements'] as const,
  movementList: (params: Record<string, string>) => [...inventoryKeys.movements(), params] as const,
  stock: () => [...inventoryKeys.all, 'stock'] as const,
  traceability: (lote: string) => [...inventoryKeys.all, 'traceability', lote] as const,
};

export function useInventoryMovements(params: Record<string, string> = {}) {
  return useQuery({
    queryKey: inventoryKeys.movementList(params),
    queryFn: () => inventoryAPI.movements(params).then((r) => r.data),
  });
}

export function useStock() {
  return useQuery({
    queryKey: inventoryKeys.stock(),
    queryFn: () => inventoryAPI.stock().then((r) => r.data),
  });
}

export function useTraceability(lote: string) {
  return useQuery({
    queryKey: inventoryKeys.traceability(lote),
    queryFn: () => inventoryAPI.traceability(lote).then((r) => r.data),
    enabled: !!lote,
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
    onError: () => toast.error('Error al registrar movimiento'),
  });
}
