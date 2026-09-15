import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";
import type { TeenPattiBet, TeenPattiRound } from "@/types/database";

export type TeenPattiBetWithRound = TeenPattiBet & {
  teen_patti_rounds: Pick<TeenPattiRound, "round_number" | "cards" | "winning_hand_type" | "status" | "completed_at"> | null;
};

export function useMyTeenPattiBetForRound(roundId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-teenpatti-bet", roundId, user?.id],
    enabled: !!user && !!roundId,
    queryFn: () => api.get<TeenPattiBet | null>(`/teenpatti/bets/mine/round/${roundId}`),
    refetchInterval: 2_000,
  });
}

export function useMyTeenPattiBetHistory(limit = 50) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-teenpatti-bet-history", user?.id, limit],
    enabled: !!user,
    queryFn: () => api.get<TeenPattiBetWithRound[]>(`/teenpatti/bets/mine?limit=${limit}`),
    refetchInterval: 10_000,
  });
}
