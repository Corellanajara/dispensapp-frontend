import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersAPI, apiErrorMessage } from '@/services/api';
import type { User } from '@/types';
import { toast } from 'sonner';

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params: Record<string, string>) => [...userKeys.lists(), params] as const,
};

export function useUsers(params: Record<string, string> = {}) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => usersAPI.list(params).then((r) => r.data),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) =>
      usersAPI.update(id, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.lists() });
      toast.success('Usuario actualizado');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Error al actualizar usuario')),
  });
}

export function useToggleUserActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersAPI.toggleActive(id).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.lists() });
      toast.success('Estado de usuario actualizado');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Error al cambiar estado del usuario')),
  });
}

export function useUnlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersAPI.unlock(id).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.lists() });
      toast.success('Cuenta desbloqueada');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Error al desbloquear la cuenta')),
  });
}
