import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productionAPI } from '@/services/api';
import { toast } from 'sonner';

export const productionKeys = {
  all: ['production'] as const,
  lists: () => [...productionKeys.all, 'list'] as const,
  list: (params: Record<string, string>) => [...productionKeys.lists(), params] as const,
  details: () => [...productionKeys.all, 'detail'] as const,
  detail: (id: string) => [...productionKeys.details(), id] as const,
};

export function useProductions(params: Record<string, string> = {}) {
  return useQuery({
    queryKey: productionKeys.list(params),
    queryFn: () => productionAPI.list(params).then((r) => r.data),
  });
}

export function useProduction(id: string) {
  return useQuery({
    queryKey: productionKeys.detail(id),
    queryFn: () => productionAPI.get(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateProduction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => productionAPI.create(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productionKeys.lists() });
      toast.success('Producción iniciada');
    },
    onError: () => toast.error('Error al iniciar producción'),
  });
}

export function useCompleteProduction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { cantidadProducida: number } }) =>
      productionAPI.complete(id, data).then((r) => r.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: productionKeys.detail(id) });
      qc.invalidateQueries({ queryKey: productionKeys.lists() });
      toast.success('Producción completada');
    },
    onError: () => toast.error('Error al completar producción'),
  });
}

export function useAddWaste() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      productionAPI.addWaste(id, data).then((r) => r.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: productionKeys.detail(id) });
      toast.success('Merma registrada');
    },
    onError: () => toast.error('Error al registrar merma'),
  });
}
