import { useRecentColorRounds } from "@/hooks/useCurrentColorRound";
import { Skeleton } from "@/components/ui/skeleton";
import type { Color } from "@/types/database";
import { cn } from "@/lib/utils";

const SWATCH: Record<Color, string> = {
  red: "bg-red-500",
  green: "bg-green-500",
};

export function RecentColorResults() {
  const { data: rounds, isLoading } = useRecentColorRounds(20);

  if (isLoading) {
    return (
      <div className="flex gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-9 flex-shrink-0 rounded-full" />
        ))}
      </div>
    );
  }

  if (!rounds || rounds.length === 0) {
    return <p className="text-sm text-muted-foreground">No rounds completed yet.</p>;
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {rounds.map(
        (round) =>
          round.winning_color && (
            <div key={round.id} className="flex flex-shrink-0 flex-col items-center gap-1">
              <div
                title={round.winning_color}
                className={cn("h-9 w-9 rounded-full shadow-inner", SWATCH[round.winning_color])}
              />
              <span className="text-[10px] text-muted-foreground">#{round.round_number}</span>
            </div>
          ),
      )}
    </div>
  );
}
