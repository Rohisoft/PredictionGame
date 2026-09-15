import { Handshake } from "lucide-react";
import { useRecentTeenPattiRounds } from "@/hooks/useCurrentTeenPattiRound";
import { Skeleton } from "@/components/ui/skeleton";
import { HAND_TYPE_INFO, PLAYER_INFO } from "@/types/teenPatti";
import type { TeenPattiWinner } from "@/types/database";
import { cn } from "@/lib/utils";

const DOT_COLOR: Record<TeenPattiWinner, string> = {
  playerA: "bg-sky-400",
  playerB: "bg-rose-400",
  tie: "bg-white/40",
};

export function RecentTeenPattiResults() {
  const { data: rounds, isLoading } = useRecentTeenPattiRounds(10);

  if (isLoading) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!rounds || rounds.length === 0) {
    return <p className="text-sm text-white/40">No rounds completed yet.</p>;
  }

  return (
    <div className="space-y-1.5">
      {rounds.map((round) => {
        if (!round.winner) return null;
        const winningHandType = round.winner === "playerA" ? round.player_a_hand_type : round.winner === "playerB" ? round.player_b_hand_type : null;

        return (
          <div
            key={round.id}
            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs"
          >
            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", DOT_COLOR[round.winner])} aria-hidden />
              <span className="font-semibold text-white/70">#{round.round_number}</span>
            </div>
            <div className="flex items-center gap-1.5 text-white/50">
              {round.winner === "tie" ? (
                <span className="flex items-center gap-1 font-medium text-white/60">
                  <Handshake className="h-3 w-3" />
                  Tie
                </span>
              ) : (
                <>
                  <span className="font-medium text-white">{PLAYER_INFO[round.winner].label}</span>
                  {winningHandType && <span>{HAND_TYPE_INFO[winningHandType].label}</span>}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
