import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { ColorRound } from "@/types/database";

export function useCurrentColorRound() {
  return useQuery({
    queryKey: ["current-color-round"],
    queryFn: () => api.get<ColorRound | null>("/color/rounds/current"),
    refetchInterval: 5_000,
  });
}

export function useRecentColorRounds(limit = 20) {
  return useQuery({
    queryKey: ["recent-color-rounds", limit],
    queryFn: () => api.get<ColorRound[]>(`/color/rounds/recent?limit=${limit}`),
    refetchInterval: 15_000,
  });
}

/** Whether a superadmin currently has Color Prediction switched on. */
export function useColorGameEnabled() {
  return useQuery({
    queryKey: ["color-game-enabled"],
    queryFn: () => api.get<{ enabled: boolean }>("/color/rounds/game-state"),
    refetchInterval: 5_000,
  });
}

/** Same "pin by id" pattern as useRoundById — see that hook for why. */
export function useColorRoundById(roundId: string | null) {
  return useQuery({
    queryKey: ["color-round", roundId],
    enabled: !!roundId,
    queryFn: () => api.get<ColorRound>(`/color/rounds/${roundId}`),
    refetchInterval: (query) => (query.state.data?.status === "completed" ? false : 1_000),
  });
}

export interface ColorRoundBetStats {
  red: { count: number; total: number };
  green: { count: number; total: number };
}

/** How many players bet on each color, and how many points total — live while betting is open. */
export function useColorRoundBetStats(roundId: string | null) {
  return useQuery({
    queryKey: ["color-round-bet-stats", roundId],
    enabled: !!roundId,
    queryFn: () => api.get<ColorRoundBetStats>(`/color/rounds/${roundId}/stats`),
    refetchInterval: 3_000,
  });
}
