import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bets")
        .select("*")
        .eq("round_id", roundId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Bet | null;
    },
  });
}

export function useMyBetHistory(limit = 50) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["my-bet-history", user?.id, limit],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bets")
        .select("*, game_rounds(round_number, dice_result, winning_side, status, completed_at)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as BetWithRound[];
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`bets-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bets", filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["my-bet-history", user.id] });
          queryClient.invalidateQueries({ queryKey: ["my-bet"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return query;
}
