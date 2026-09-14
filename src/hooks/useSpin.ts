import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";

export interface SpinState {
  enabled: boolean;
  can_spin: boolean;
  next_spin_at: string | null;
  segments: number[];
}

export interface SpinResult {
  segment_index: number;
  value: number;
  next_spin_at: string;
}

export function useSpinState() {
  return useQuery({
    queryKey: ["spin-state"],
    queryFn: () => api.get<SpinState>("/spin/state"),
  });
}

export function useSpinWheel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post<SpinResult>("/spin"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spin-state"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
    },
  });
}
