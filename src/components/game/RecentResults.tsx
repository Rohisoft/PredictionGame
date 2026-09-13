import { useRecentRounds } from "@/hooks/useCurrentRound";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function RecentResults() {
  const { data: rounds, isLoading } = useRecentRounds(20);

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
      {rounds.map((round) => (
        <div
          key={round.id}
          title={`Round #${round.round_number} · dice ${round.dice_result}`}
          className={cn(
            "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold",
            round.winning_side === "odd"
              ? "bg-primary/10 text-primary"
              : "bg-success/10 text-success",
          )}
        >
          {round.dice_result}
        </div>
      ))}
    </div>
  );
}
