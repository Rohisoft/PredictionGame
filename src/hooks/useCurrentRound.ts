import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { GameRound } from "@/types/database";

export function useCurrentRound() {
  return useQuery({
    queryKey: ["current-round"],
    queryFn: () => api.get<GameRound | null>("/rounds/current"),
    refetchInterval: 5_000,
  });
}

/** Whether an admin currently has the game switched on — drives the "paused" banner. */
export function useGameRunning() {
  return useQuery({
    queryKey: ["game-running"],
    queryFn: () => api.get<{ is_game_running: boolean }>("/rounds/game-state"),
    refetchInterval: 5_000,
  });
}

export function useRecentRounds(limit = 20) {
  return useQuery({
    queryKey: ["recent-rounds", limit],
    queryFn: () => api.get<GameRound[]>(`/rounds/recent?limit=${limit}`),
    refetchInterval: 15_000,
  });
}

/**
 * Fetches one specific round by id and keeps polling it (fast, while it's
 * still unsettled) until it's completed.
 *
 * This exists because `useCurrentRound` always returns the round with the
 * highest round_number — which is fine for driving the betting UI, but
 * means the instant a round is settled, the scheduler's next tick already
 * gives it a successor, so the completed round is *never* the "latest" one
 * that query would return. Polling by a pinned id is the only reliable way
 * to observe that round's own dice_result/winning_side.
 */
export function useRoundById(roundId: string | null) {
  return useQuery({
    queryKey: ["round", roundId],
    enabled: !!roundId,
    queryFn: () => api.get<GameRound>(`/rounds/${roundId}`),
    refetchInterval: (query) => (query.state.data?.status === "completed" ? false : 1_000),
  });
}

export interface RoundBetStats {
  odd: { count: number; total: number };
  even: { count: number; total: number };
}

/** How many players bet on each side, and how many points total — live while betting is open. */
export function useRoundBetStats(roundId: string | null) {
  return useQuery({
    queryKey: ["round-bet-stats", roundId],
    enabled: !!roundId,
    queryFn: () => api.get<RoundBetStats>(`/rounds/${roundId}/stats`),
    refetchInterval: 3_000,
  });
}
