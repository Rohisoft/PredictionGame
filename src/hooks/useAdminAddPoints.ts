import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";

interface AdminAddPointsParams {
  userEmail: string;
  amount: number;
  description?: string;
}

export function useAdminAddPoints() {
  return useMutation({
    mutationFn: (params: AdminAddPointsParams) => api.post<{ ok: true }>("/admin/add-points", params),
  });
}
