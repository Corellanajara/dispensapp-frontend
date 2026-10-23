import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transferenciasAPI, apiErrorMessage } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { inventoryKeys } from './use-inventory';
import { toast } from 'sonner';

export const transferenciaKeys = {
  all: ['transferencias'] as const,
  list: (sucursal: string, params: Record<string, string>) => [...transferenciaKeys.all, 'list', sucursal, params] as const,
};

export function useTransferencias(params: Record<string, string> = {}) {
  const { sucursalActiva } = useAuth();
  return useQuery({
    queryKey: transferenciaKeys.list(sucursalActiva?._id ?? 'todas', params),
    queryFn: () => transferenciasAPI.list(params).then((r) => r.data),
  });
}

export function useTransferenciaMutation<TVars, TResult>(
  fn: (vars: TVars) => Promise<TResult>,
  successMsg: string,
  errorMsg: string
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: transferenciaKeys.all });
      qc.invalidateQueries({ queryKey: inventoryKeys.all });
      toast.success(successMsg);
    },
    onError: (err) => toast.error(apiErrorMessage(err, errorMsg)),
  });
}
