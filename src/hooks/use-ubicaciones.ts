import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ubicacionesAPI, apiErrorMessage } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Ubicacion } from '@/types';
import { toast } from 'sonner';

export const ubicacionKeys = {
  all: ['ubicaciones'] as const,
  list: (sucursal: string, params: Record<string, string>) => [...ubicacionKeys.all, 'list', sucursal, params] as const,
  detail: (id: string) => [...ubicacionKeys.all, 'detail', id] as const,
};

/** Ubicaciones de la sucursal activa (la API filtra por X-Sucursal-Id). */
export function useUbicaciones(params: Record<string, string> = {}, enabled = true) {
  const { sucursalActiva } = useAuth();
  return useQuery({
    queryKey: ubicacionKeys.list(sucursalActiva?._id ?? 'todas', params),
    queryFn: () => ubicacionesAPI.list(params).then((r) => r.data),
    enabled,
  });
}

export function useUbicacion(id: string | null) {
  return useQuery({
    queryKey: ubicacionKeys.detail(id ?? ''),
    queryFn: () => ubicacionesAPI.get(id!).then((r) => r.data),
    enabled: !!id,
  });
}

export function useSaveUbicacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Partial<Ubicacion> }) =>
      (id ? ubicacionesAPI.update(id, data) : ubicacionesAPI.create(data)).then((r) => r.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ubicacionKeys.all });
      toast.success(id ? 'Ubicación actualizada' : 'Ubicación creada');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Error al guardar la ubicación')),
  });
}

export function useToggleUbicacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ubicacionesAPI.toggleActive(id).then((r) => r.data),
    onSuccess: (u) => {
      qc.invalidateQueries({ queryKey: ubicacionKeys.all });
      toast.success(u.activo ? 'Ubicación activada' : 'Ubicación desactivada');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Error al cambiar el estado')),
  });
}
