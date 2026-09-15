import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { TeenPattiBet, TeenPattiPlayer } from "@/types/database";
import { useAuth } from "@/hooks/useAuth";

interface PlaceTeenPattiBetParams {
  roundId: string;
  selectedPlayer: TeenPattiPlayer;
  amount: number;
}

export function usePlaceTeenPattiBet() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ roundId, selectedPlayer, amount }: PlaceTeenPattiBetParams) =>
      api.post<TeenPattiBet>("/teenpatti/bets", { roundId, selectedPlayer, amount }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["wallet", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["my-teenpatti-bet", variables.roundId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions", user?.id] });
    },
  });
}
