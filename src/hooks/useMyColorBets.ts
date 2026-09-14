import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";
import type { ColorBet, ColorRound } from "@/types/database";

export type ColorBetWithRound = ColorBet & {
  color_rounds: Pick<ColorRound, "round_number" | "winning_color" | "status" | "completed_at"> | null;
};

export function useMyColorBetForRound(roundId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-color-bet", roundId, user?.id],
    enabled: !!user && !!roundId,
    queryFn: () => api.get<ColorBet | null>(`/color/bets/mine/round/${roundId}`),
    refetchInterval: 2_000,
  });
}

export function useMyColorBetHistory(limit = 50) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-color-bet-history", user?.id, limit],
    enabled: !!user,
    queryFn: () => api.get<ColorBetWithRound[]>(`/color/bets/mine?limit=${limit}`),
    refetchInterval: 10_000,
  });
}
