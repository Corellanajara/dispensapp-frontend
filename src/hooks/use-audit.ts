import { useQuery } from '@tanstack/react-query';
import { auditAPI } from '@/services/api';

export const auditKeys = {
  all: ['audit'] as const,
  lists: () => [...auditKeys.all, 'list'] as const,
  list: (params: Record<string, string>) => [...auditKeys.lists(), params] as const,
};

export function useAuditLogs(params: Record<string, string> = {}) {
  return useQuery({
    queryKey: auditKeys.list(params),
    queryFn: () => auditAPI.list(params).then((r) => r.data),
  });
}
