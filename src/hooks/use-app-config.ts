import { useQuery } from '@tanstack/react-query';
import { configAPI } from '@/services/api';
import type { AppConfig } from '@/types';

/** Valores por defecto mientras carga (pagos apagados, como el backend). */
const DEFAULT_CONFIG: AppConfig = {
  pagosHabilitados: false,
  diasAvisoReceta: 30,
  documentosRequeridos: [],
  tiposDocumento: {
    receta_medica: 'Receta médica',
    certificado_antecedentes: 'Certificado de antecedentes',
    reglamento_interno: 'Reglamento interno',
    mandato_contrato: 'Mandato o contrato',
    cedula_identidad: 'Cédula de identidad',
    otro: 'Otro',
  },
};

/**
 * Configuración pública del backend: si hay cobros, qué documentos se exigen, días de aviso de receta.
 * Usar `pagosHabilitados` para mostrar u ocultar precios y pagos.
 */
export function useAppConfig(): AppConfig & { isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['app-config'],
    queryFn: () => configAPI.get().then((r) => r.data),
    staleTime: 10 * 60_000,
  });
  return { ...(data ?? DEFAULT_CONFIG), isLoading };
}
