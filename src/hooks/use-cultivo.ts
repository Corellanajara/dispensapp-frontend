import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cultivoAPI, apiErrorMessage } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { inventoryKeys } from './use-inventory';
import { toast } from 'sonner';

export const cultivoKeys = {
  all: ['cultivo'] as const,
  espacios: (sucursal: string, params: Record<string, string>) => [...cultivoKeys.all, 'espacios', sucursal, params] as const,
  espacio: (id: string) => [...cultivoKeys.all, 'espacio', id] as const,
  qr: (codigo: string) => [...cultivoKeys.all, 'qr', codigo] as const,
  cosechas: (sucursal: string, params: Record<string, string>) => [...cultivoKeys.all, 'cosechas', sucursal, params] as const,
};

export function useEspacios(params: Record<string, string> = {}) {
  const { sucursalActiva } = useAuth();
  return useQuery({
    queryKey: cultivoKeys.espacios(sucursalActiva?._id ?? 'todas', params),
    queryFn: () => cultivoAPI.espacios(params).then((r) => r.data),
  });
}

export function useEspacio(id: string) {
  return useQuery({
    queryKey: cultivoKeys.espacio(id),
    queryFn: () => cultivoAPI.espacio(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useEspacioPorQR(codigo: string) {
  return useQuery({
    queryKey: cultivoKeys.qr(codigo),
    queryFn: () => cultivoAPI.porQR(codigo).then((r) => r.data),
    enabled: !!codigo,
    retry: false,
  });
}

export function useCosechas(params: Record<string, string> = {}, enabled = true) {
  const { sucursalActiva } = useAuth();
  return useQuery({
    queryKey: cultivoKeys.cosechas(sucursalActiva?._id ?? 'todas', params),
    queryFn: () => cultivoAPI.cosechas(params).then((r) => r.data),
    enabled,
  });
}

/** Mutación genérica de cultivo: refresca cultivo e inventario y muestra el error de la API. */
export function useCultivoMutation<TVars, TResult>(
  fn: (vars: TVars) => Promise<TResult>,
  successMsg: string,
  errorMsg: string
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cultivoKeys.all });
      qc.invalidateQueries({ queryKey: inventoryKeys.all });
      toast.success(successMsg);
    },
    onError: (err) => toast.error(apiErrorMessage(err, errorMsg)),
  });
}
