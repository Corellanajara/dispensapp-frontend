import { useQuery } from '@tanstack/react-query';
import { reportsAPI } from '@/services/api';

export const reportKeys = {
  all: ['reports'] as const,
  dashboard: () => [...reportKeys.all, 'dashboard'] as const,
  sales: (params?: Record<string, string>) => [...reportKeys.all, 'sales', params] as const,
  production: () => [...reportKeys.all, 'production'] as const,
};

export function useDashboard() {
  return useQuery({
    queryKey: reportKeys.dashboard(),
    queryFn: () => reportsAPI.dashboard().then((r) => r.data),
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
