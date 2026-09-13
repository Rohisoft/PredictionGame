import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
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
    mutationFn: async ({ roundId, selectedSide, amount }: PlaceBetParams) => {
      const { data, error } = await supabase.rpc("place_bet", {
        p_round_id: roundId,
        p_selected_side: selectedSide,
        p_amount: amount,
      });
      if (error) throw error;
      return data as Bet;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["wallet", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["my-bet", variables.roundId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions", user?.id] });
    },
  });
}
