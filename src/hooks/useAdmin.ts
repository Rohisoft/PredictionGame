import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { Profile, WalletTransaction } from "@/types/database";

export type AdminUser = Profile & { balance: number };

export function useAdminUsers(search: string) {
  return useQuery({
    queryKey: ["admin-users", search],
    queryFn: () => api.get<AdminUser[]>(`/admin/users?search=${encodeURIComponent(search)}`),
    // Keep the list fresh since balances change as rounds settle.
    refetchInterval: 15_000,
  });
}

export function useAdminUserTransactions(userId: string | null) {
  return useQuery({
    queryKey: ["admin-user-transactions", userId],
    enabled: !!userId,
    queryFn: () => api.get<WalletTransaction[]>(`/admin/users/${userId}/transactions`),
  });
}

interface AdjustPointsParams {
  username: string;
  amount: number;
  description?: string;
}

export function useAdminAdjustPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: AdjustPointsParams) => api.post<{ ok: true }>("/admin/adjust-points", params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-transactions"] });
    },
  });
}

interface CreateUserParams {
  username: string;
  password: string;
  fullName: string;
  email?: string;
  phone?: string;
}

export function useAdminCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateUserParams) => api.post<Profile>("/admin/users", params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

interface UsernameAvailability {
  available: boolean;
  suggestions: string[];
}

/** On-demand check (call it yourself, e.g. debounced on blur/typing) — not a live query. */
export function useCheckUsername() {
  return useMutation({
    mutationFn: ({ username, phone }: { username: string; phone?: string }) => {
      const params = new URLSearchParams({ username });
      if (phone) params.set("phone", phone);
      return api.get<UsernameAvailability>(`/admin/users/check-username?${params.toString()}`);
    },
  });
}

export function useAdminSetPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { username: string; password: string }) =>
      api.post<{ ok: true }>("/admin/users/set-password", params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}
