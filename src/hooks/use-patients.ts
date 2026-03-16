import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientsAPI } from '@/services/api';
import type { Patient } from '@/types';
import { toast } from 'sonner';

export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (params: Record<string, string>) => [...patientKeys.lists(), params] as const,
  details: () => [...patientKeys.all, 'detail'] as const,
  detail: (id: string) => [...patientKeys.details(), id] as const,
};

export function usePatients(params: Record<string, string> = {}) {
  return useQuery({
    queryKey: patientKeys.list(params),
    queryFn: () => patientsAPI.list(params).then((r) => r.data),
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: patientKeys.detail(id),
    queryFn: () => patientsAPI.get(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Patient>) => patientsAPI.create(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: patientKeys.lists() });
      toast.success('Paciente creado correctamente');
    },
    onError: () => toast.error('Error al crear paciente'),
  });
}

export function useUpdatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Patient> }) =>
      patientsAPI.update(id, data).then((r) => r.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: patientKeys.detail(id) });
      qc.invalidateQueries({ queryKey: patientKeys.lists() });
      toast.success('Paciente actualizado');
    },
    onError: () => toast.error('Error al actualizar paciente'),
  });
}

export function useUpdatePatientStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { estado: string; observaciones?: string } }) =>
      patientsAPI.updateStatus(id, data).then((r) => r.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: patientKeys.detail(id) });
      qc.invalidateQueries({ queryKey: patientKeys.lists() });
      toast.success('Estado actualizado');
    },
    onError: () => toast.error('Error al actualizar estado'),
  });
}

export function useUploadPatientDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      patientsAPI.uploadDocument(id, formData).then((r) => r.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: patientKeys.detail(id) });
      toast.success('Documento subido correctamente');
    },
    onError: () => toast.error('Error al subir documento'),
  });
}
