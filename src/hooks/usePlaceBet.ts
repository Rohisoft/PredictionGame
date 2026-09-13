import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { Bet, Side } from "@/types/database";
import { useAuth } from "@/hooks/useAuth";

interface PlaceBetParams {
  roundId: string;
  selectedSide: Side;
  amount: number;
}

export function usePlaceBet() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ roundId, selectedSide, amount }: PlaceBetParams) =>
      api.post<Bet>("/bets", { roundId, selectedSide, amount }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["wallet", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["my-bet", variables.roundId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions", user?.id] });
    },
  });
}
