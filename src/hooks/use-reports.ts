import { useQuery } from '@tanstack/react-query';
import { reportsAPI } from '@/services/api';

export const reportKeys = {
  all: ['reports'] as const,
  dashboard: () => [...reportKeys.all, 'dashboard'] as const,
  sales: (params?: Record<string, string>) => [...reportKeys.all, 'sales', params] as const,
  production: () => [...reportKeys.all, 'production'] as const,
};

/** Solo admin y operador tienen acceso a /reports/dashboard. */
export function useDashboard(enabled = true) {
  return useQuery({
    queryKey: reportKeys.dashboard(),
    queryFn: () => reportsAPI.dashboard().then((r) => r.data),
    enabled,
  });
}

/** `scope` (ej. id de la sucursal activa) solo separa la caché; no se envía a la API. */
export function useDispensacionesReport(params: Record<string, string>, scope = '', enabled = true) {
  return useQuery({
    queryKey: [...reportKeys.all, 'dispensaciones', scope, params] as const,
    queryFn: () => reportsAPI.dispensaciones(params).then((r) => r.data),
    enabled,
  });
}

export function useSalesReport(params: Record<string, string> = {}) {
  return useQuery({
    queryKey: reportKeys.sales(params),
    queryFn: () => reportsAPI.sales(params).then((r) => r.data),
  });
}

export function useProductionReport() {
  return useQuery({
    queryKey: reportKeys.production(),
    queryFn: () => reportsAPI.production().then((r) => r.data),
  });
}
