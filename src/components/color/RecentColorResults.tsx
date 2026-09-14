import { useRecentColorRounds } from "@/hooks/useCurrentColorRound";
import { Skeleton } from "@/components/ui/skeleton";
import type { Color } from "@/types/database";
import { cn } from "@/lib/utils";

const SWATCH: Record<Color, string> = {
  red: "bg-red-500",
  green: "bg-green-500",
  violet: "bg-violet-500",
};

export function RecentColorResults() {
  const { data: rounds, isLoading } = useRecentColorRounds(20);

  if (isLoading) {
    return (
      <div className="flex gap-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-9 flex-shrink-0 rounded-full" />
        ))}
      </div>
    );
  }

  if (!rounds || rounds.length === 0) {
    return <p className="text-sm text-muted-foreground">No rounds completed yet.</p>;
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {rounds.map(
        (round) =>
          round.winning_color && (
            <div
              key={round.id}
              title={`Round #${round.round_number} · ${round.winning_color}`}
              className={cn("h-9 w-9 flex-shrink-0 rounded-full shadow-inner", SWATCH[round.winning_color])}
            />
          ),
      )}
    </div>
  );
}
