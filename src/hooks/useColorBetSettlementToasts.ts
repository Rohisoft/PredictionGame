import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";
import type { ColorBet } from "@/types/database";

const POLL_MS = 3_000;
const RECENT_BETS_LIMIT = 5;

/** Same polling-diff pattern as useBetSettlementToasts, for color bets. */
export function useColorBetSettlementToasts() {
  const { user } = useAuth();
  const lastStatusById = useRef<Map<string, ColorBet["status"]>>(new Map());

  const { data: bets } = useQuery({
    queryKey: ["recent-color-bets-for-toasts", user?.id],
    enabled: !!user,
    queryFn: () => api.get<ColorBet[]>(`/color/bets/mine?limit=${RECENT_BETS_LIMIT}`),
    refetchInterval: POLL_MS,
  });

  useEffect(() => {
    if (!bets) return;

    for (const bet of bets) {
      const previousStatus = lastStatusById.current.get(bet.id);
      if (previousStatus === "pending" && bet.status !== "pending") {
        if (bet.status === "won") {
          toast.success(`You won! +${bet.payout_amount} points credited to your wallet.`);
        } else if (bet.status === "lost") {
          toast.error(`No luck this round — you lost ${bet.amount} points.`);
        } else if (bet.status === "refunded") {
          toast.info(`Round cancelled — ${bet.amount} points refunded.`);
        }
      }
      lastStatusById.current.set(bet.id, bet.status);
    }
  }, [bets]);
}
