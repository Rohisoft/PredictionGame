import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import type { Bet } from "@/types/database";

export function useBetSettlementToasts() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`bet-settlements-${user.id}`)
      .on<Bet>(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bets", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const bet = payload.new;
          if (bet.status === "won") {
            toast.success(`You won! +₹${bet.payout_amount} credited to your wallet.`);
          } else if (bet.status === "lost") {
            toast.error(`No luck this round — you lost ₹${bet.amount}.`);
          } else if (bet.status === "refunded") {
            toast.info(`Round cancelled — ₹${bet.amount} refunded.`);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
}
