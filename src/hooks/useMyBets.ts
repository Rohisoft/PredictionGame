import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";
import type { Bet, GameRound } from "@/types/database";

export type BetWithRound = Bet & {
  game_rounds: Pick<
    GameRound,
    "round_number" | "dice_result" | "winning_side" | "status" | "completed_at"
  > | null;
};

export function useMyBetForRound(roundId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-bet", roundId, user?.id],
    enabled: !!user && !!roundId,
    queryFn: () => api.get<Bet | null>(`/bets/mine/round/${roundId}`),
    // Only matters while the round is still live; cheap enough to just
    // always poll rather than track round status here too.
    refetchInterval: 2_000,
  });
}

export function useMyBetHistory(limit = 50) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-bet-history", user?.id, limit],
    enabled: !!user,
    queryFn: () => api.get<BetWithRound[]>(`/bets/mine?limit=${limit}`),
    refetchInterval: 10_000,
  });
}
