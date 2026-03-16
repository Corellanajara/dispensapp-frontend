import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeAPI } from '@/services/api';
import { toast } from 'sonner';

export const financeKeys = {
  all: ['finance'] as const,
  transactions: () => [...financeKeys.all, 'transactions'] as const,
  transactionList: (params: Record<string, string>) => [...financeKeys.transactions(), params] as const,
  summary: (params?: Record<string, string>) => [...financeKeys.all, 'summary', params] as const,
  cashflow: (params?: Record<string, string>) => [...financeKeys.all, 'cashflow', params] as const,
};

export function useFinanceTransactions(params: Record<string, string> = {}) {
  return useQuery({
    queryKey: financeKeys.transactionList(params),
    queryFn: () => financeAPI.transactions(params).then((r) => r.data),
  });
}

export function useFinanceSummary(params: Record<string, string> = {}) {
  return useQuery({
    queryKey: financeKeys.summary(params),
    queryFn: () => financeAPI.summary(params).then((r) => r.data),
  });
}

export function useFinanceCashflow(params: Record<string, string> = {}) {
  return useQuery({
    queryKey: financeKeys.cashflow(params),
    queryFn: () => financeAPI.cashflow(params).then((r) => r.data),
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => financeAPI.createTransaction(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: financeKeys.all });
      toast.success('Transacción registrada');
    },
    onError: () => toast.error('Error al registrar transacción'),
  });
}
