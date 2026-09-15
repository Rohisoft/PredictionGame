import { useRecentTeenPattiRounds } from "@/hooks/useCurrentTeenPattiRound";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { HAND_TYPE_INFO } from "@/types/teenPatti";

export function RecentTeenPattiResults() {
  const { data: rounds, isLoading } = useRecentTeenPattiRounds(20);

  if (isLoading) {
    return (
      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-20 flex-shrink-0 rounded-lg" />
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
          round.winning_hand_type && (
            <div
              key={round.id}
              className="flex flex-shrink-0 flex-col items-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5"
            >
              <Badge variant="outline" className="whitespace-nowrap">
                {HAND_TYPE_INFO[round.winning_hand_type].label}
              </Badge>
              <span className="text-[10px] text-muted-foreground">#{round.round_number}</span>
            </div>
          ),
      )}
    </div>
  );
}
