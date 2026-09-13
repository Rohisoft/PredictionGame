import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { Profile, WalletTransaction } from "@/types/database";

// email is always present on a real user (required at the schema level),
// unlike the general Profile type which allows it to be null.
export type AdminUser = Omit<Profile, "email"> & { email: string; balance: number };

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
  userEmail: string;
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
