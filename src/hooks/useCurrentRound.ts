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
  });
}
