import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { HandType, TeenPattiRound } from "@/types/database";

export function useCurrentTeenPattiRound() {
  return useQuery({
    queryKey: ["current-teenpatti-round"],
    queryFn: () => api.get<TeenPattiRound | null>("/teenpatti/rounds/current"),
    refetchInterval: 5_000,
  });
}

export function useRecentTeenPattiRounds(limit = 20) {
  return useQuery({
    queryKey: ["recent-teenpatti-rounds", limit],
    queryFn: () => api.get<TeenPattiRound[]>(`/teenpatti/rounds/recent?limit=${limit}`),
    refetchInterval: 15_000,
  });
}

/** Whether a superadmin currently has Teen Patti Prediction switched on. */
export function useTeenPattiGameEnabled() {
  return useQuery({
    queryKey: ["teenpatti-game-enabled"],
    queryFn: () => api.get<{ enabled: boolean }>("/teenpatti/rounds/game-state"),
    refetchInterval: 5_000,
  });
}

/** Same "pin by id" pattern as useRoundById — see that hook for why. */
export function useTeenPattiRoundById(roundId: string | null) {
  return useQuery({
    queryKey: ["teenpatti-round", roundId],
    enabled: !!roundId,
    queryFn: () => api.get<TeenPattiRound>(`/teenpatti/rounds/${roundId}`),
    refetchInterval: (query) => (query.state.data?.status === "completed" ? false : 1_000),
  });
}

export type TeenPattiRoundBetStats = Record<HandType, { count: number; total: number }>;

/** How many players bet on each hand type, and how many points total — superadmin only. */
export function useTeenPattiRoundBetStats(roundId: string | null) {
  return useQuery({
    queryKey: ["teenpatti-round-bet-stats", roundId],
    enabled: !!roundId,
    queryFn: () => api.get<TeenPattiRoundBetStats>(`/teenpatti/rounds/${roundId}/stats`),
    refetchInterval: 3_000,
  });
}
