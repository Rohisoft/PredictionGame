import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { Color, ColorBet } from "@/types/database";
import { useAuth } from "@/hooks/useAuth";

interface PlaceColorBetParams {
  roundId: string;
  selectedColor: Color;
  amount: number;
}

export function usePlaceColorBet() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ roundId, selectedColor, amount }: PlaceColorBetParams) =>
      api.post<ColorBet>("/color/bets", { roundId, selectedColor, amount }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["wallet", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["my-color-bet", variables.roundId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions", user?.id] });
    },
  });
}
