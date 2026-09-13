import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { GameRound } from "@/types/database";

export function useCurrentRound() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["current-round"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_rounds")
        .select("*")
        .order("round_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as GameRound | null;
    },
    refetchInterval: 5_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("game-rounds")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_rounds" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["current-round"] });
          queryClient.invalidateQueries({ queryKey: ["recent-rounds"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useRecentRounds(limit = 20) {
  return useQuery({
    queryKey: ["recent-rounds", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_rounds")
        .select("*")
        .eq("status", "completed")
        .order("round_number", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as GameRound[];
    },
    // Realtime invalidates this on every round change; this is just a safety net.
    refetchInterval: 15_000,
  });
}

/**
 * Fetches one specific round by id and keeps polling it (fast, while it's
 * still unsettled) until it's completed.
 *
 * This exists because `useCurrentRound` always returns the row with the
 * highest round_number — which is fine for driving the betting UI, but
 * means the instant a round is settled, `create_next_round()` (run in the
 * same cron tick) already gives it a successor, so the completed round is
 * *never* the "latest" one a round_number-desc query would return. Polling
 * by a pinned id is the only reliable way to observe that round's own
 * dice_result/winning_side.
 */
export function useRoundById(roundId: string | null) {
  return useQuery({
    queryKey: ["round", roundId],
    enabled: !!roundId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_rounds")
        .select("*")
        .eq("id", roundId!)
        .maybeSingle();
      if (error) throw error;
      return data as GameRound | null;
    },
    refetchInterval: (query) => (query.state.data?.status === "completed" ? false : 1_000),
  });
}
