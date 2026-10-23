import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientsAPI, cultivoAPI, apiErrorMessage } from '@/services/api';
import type { Patient } from '@/types';
import { toast } from 'sonner';

export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (params: Record<string, string>) => [...patientKeys.lists(), params] as const,
  details: () => [...patientKeys.all, 'detail'] as const,
  detail: (id: string) => [...patientKeys.details(), id] as const,
  expediente: (id: string) => [...patientKeys.all, 'expediente', id] as const,
  espacios: (id: string) => [...patientKeys.all, 'espacios', id] as const,
  alertas: () => [...patientKeys.all, 'alertas'] as const,
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

export function usePatientExpediente(id: string) {
  return useQuery({
    queryKey: patientKeys.expediente(id),
    queryFn: () => patientsAPI.expediente(id).then((r) => r.data),
    enabled: !!id,
    staleTime: 0,
  });
}

export function usePatientEspacios(id: string) {
  return useQuery({
    queryKey: patientKeys.espacios(id),
    queryFn: () => cultivoAPI.espacios({ paciente: id }).then((r) => r.data),
    enabled: !!id,
  });
}

export function useVigenciaAlerts() {
  return useQuery({
    queryKey: patientKeys.alertas(),
    queryFn: () => patientsAPI.alertasVigencia().then((r) => r.data),
  });
}

/** Guarda la respuesta como detalle y refresca listas. */
function useSetPatient() {
  const qc = useQueryClient();
  return (patient: Patient) => {
    qc.setQueryData(patientKeys.detail(patient._id), patient);
    qc.invalidateQueries({ queryKey: patientKeys.lists() });
    qc.invalidateQueries({ queryKey: patientKeys.alertas() });
  };
}

export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Patient>) => patientsAPI.create(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: patientKeys.lists() });
      toast.success('Paciente creado correctamente');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Error al crear paciente')),
  });
}

export function useUpdatePatient() {
  const setPatient = useSetPatient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Patient> }) =>
      patientsAPI.update(id, data).then((r) => r.data),
    onSuccess: (patient) => {
      setPatient(patient);
      toast.success('Paciente actualizado');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Error al actualizar paciente')),
  });
}

export function useUpdatePatientStatus() {
  const setPatient = useSetPatient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { estado: string; motivo?: string; observaciones?: string } }) =>
      patientsAPI.updateStatus(id, data).then((r) => r.data),
    onSuccess: (patient) => {
      setPatient(patient);
      toast.success('Estado actualizado');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Error al actualizar estado')),
  });
}

export function useAssignSucursal() {
  const setPatient = useSetPatient();
  return useMutation({
    mutationFn: ({ id, sucursal }: { id: string; sucursal: string }) =>
      patientsAPI.assignSucursal(id, sucursal).then((r) => r.data),
    onSuccess: (patient) => {
      setPatient(patient);
      toast.success('Dispensario asignado');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Error al asignar dispensario')),
  });
}

export function useUploadPatientDocument() {
  const setPatient = useSetPatient();
  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      patientsAPI.uploadDocument(id, formData).then((r) => r.data),
    onSuccess: (patient) => {
      setPatient(patient);
      toast.success('Documento subido correctamente');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Error al subir documento')),
  });
}

export function useReviewDocument() {
  const setPatient = useSetPatient();
  return useMutation({
    mutationFn: ({
      id,
      docId,
      data,
    }: {
      id: string;
      docId: string;
      data: { estado: 'aprobado' | 'rechazado'; observaciones?: string; fechaVencimiento?: string };
    }) => patientsAPI.reviewDocument(id, docId, data).then((r) => r.data),
    onSuccess: (patient, { data }) => {
      setPatient(patient);
      toast.success(data.estado === 'aprobado' ? 'Documento aprobado' : 'Documento rechazado');
      if (patient.reactivado) toast.success('El paciente fue reactivado con la receta nueva');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Error al revisar documento')),
  });
}

export function useRequestPatientSignature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, docId }: { id: string; docId: string }) =>
      patientsAPI.requestSignature(id, docId).then((r) => r.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: patientKeys.detail(id) });
      toast.success('Documento enviado a firma');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Error al enviar a firma')),
  });
}

export function useRefreshSignature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, docId }: { id: string; docId: string }) =>
      patientsAPI.signatureStatus(id, docId).then((r) => r.data),
    onSuccess: (data, { id }) => {
      qc.invalidateQueries({ queryKey: patientKeys.detail(id) });
      const estado = data.documento?.firma?.estado;
      toast.success(estado === 'firmado' ? 'Documento firmado' : 'Estado de firma actualizado');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Error al consultar la firma')),
  });
}
