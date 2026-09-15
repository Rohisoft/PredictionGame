import { useRecentColorRounds } from "@/hooks/useCurrentColorRound";
import { Skeleton } from "@/components/ui/skeleton";
import type { Color } from "@/types/database";
import { cn } from "@/lib/utils";

const COLOR_LABEL: Record<Color, string> = { red: "Red", green: "Green" };
const DOT_COLOR: Record<Color, string> = { red: "bg-red-400", green: "bg-emerald-400" };

export function RecentColorResults() {
  const { data: rounds, isLoading } = useRecentColorRounds(10);

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
          round.winning_color && (
            <div
              key={round.id}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs"
            >
              <div className="flex items-center gap-2">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", DOT_COLOR[round.winning_color])} aria-hidden />
                <span className="font-semibold text-white/70">#{round.round_number}</span>
              </div>
              <span className="font-medium text-white/60">{COLOR_LABEL[round.winning_color]}</span>
            </div>
          ),
      )}
    </div>
  );
}
