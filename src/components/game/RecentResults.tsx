import { useRecentRounds } from "@/hooks/useCurrentRound";
import { Skeleton } from "@/components/ui/skeleton";
import type { Side } from "@/types/database";
import { cn } from "@/lib/utils";

const SIDE_LABEL: Record<Side, string> = { odd: "Odd", even: "Even" };
const DOT_COLOR: Record<Side, string> = { odd: "bg-sky-400", even: "bg-emerald-400" };

export function RecentResults() {
  const { data: rounds, isLoading } = useRecentRounds(10);

  if (isLoading) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-lg bg-white/10" />
        ))}
      </div>
    );
  }

  if (!rounds || rounds.length === 0) {
    return <p className="text-sm text-white/40">No rounds completed yet.</p>;
  }

  return (
    <div className="space-y-1.5">
      {rounds.map(
        (round) =>
          round.winning_side && (
            <div
              key={round.id}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs"
            >
              <div className="flex items-center gap-2">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", DOT_COLOR[round.winning_side])} aria-hidden />
                <span className="font-semibold text-white/70">#{round.round_number}</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/50">
                <span className="font-medium text-white">{SIDE_LABEL[round.winning_side]}</span>
                <span>Rolled {round.dice_result}</span>
              </div>
            </div>
          ),
      )}
    </div>
  );
}
