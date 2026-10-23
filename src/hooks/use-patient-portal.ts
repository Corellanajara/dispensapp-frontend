import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientPortalAPI, apiErrorMessage } from '@/services/api';
import { toast } from 'sonner';

export const portalKeys = {
  all: ['portal'] as const,
  profile: () => [...portalKeys.all, 'profile'] as const,
  catalog: (params?: Record<string, string>) => [...portalKeys.all, 'catalog', params] as const,
  orders: () => [...portalKeys.all, 'orders'] as const,
  orderList: (params: Record<string, string>) => [...portalKeys.orders(), params] as const,
  orderDetail: (id: string) => [...portalKeys.orders(), id] as const,
};

export function usePatientProfile() {
  return useQuery({
    queryKey: portalKeys.profile(),
    queryFn: () => patientPortalAPI.getProfile().then((r) => r.data),
  });
}

export function useUpdatePatientProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => patientPortalAPI.updateProfile(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: portalKeys.profile() });
      toast.success('Perfil actualizado');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Error al actualizar perfil')),
  });
}

export function useUploadPortalDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => patientPortalAPI.uploadDocument(formData).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: portalKeys.profile() });
      toast.success('Documento subido. El dispensario lo revisará.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Error al subir documento')),
  });
}

export function useCatalog(params: Record<string, string> = {}) {
  return useQuery({
    queryKey: portalKeys.catalog(params),
    queryFn: () => patientPortalAPI.getCatalog(params).then((r) => r.data),
  });
}

export function usePatientOrders(params: Record<string, string> = {}) {
  return useQuery({
    queryKey: portalKeys.orderList(params),
    queryFn: () => patientPortalAPI.getMyOrders(params).then((r) => r.data),
  });
}

export function usePatientOrder(id: string) {
  return useQuery({
    queryKey: portalKeys.orderDetail(id),
    queryFn: () => patientPortalAPI.getMyOrder(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreatePatientOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => patientPortalAPI.createOrder(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: portalKeys.orders() });
      qc.invalidateQueries({ queryKey: portalKeys.profile() });
      toast.success('Solicitud enviada');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Error al crear la solicitud')),
  });
}

export function useCancelPatientOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => patientPortalAPI.cancelOrder(id).then((r) => r.data),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: portalKeys.orderDetail(id) });
      qc.invalidateQueries({ queryKey: portalKeys.orders() });
      toast.success('Solicitud anulada');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Error al anular la solicitud')),
  });
}

