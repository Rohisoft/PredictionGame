import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { TeenPattiRoundBetStats } from "@/hooks/useCurrentTeenPattiRound";
import { HAND_TYPE_INFO, HAND_TYPE_ORDER } from "@/types/teenPatti";
import { formatPoints } from "@/lib/utils";

interface TeenPattiPoolCardProps {
  stats: TeenPattiRoundBetStats | undefined;
  isLoading: boolean;
}

export function TeenPattiPoolCard({ stats, isLoading }: TeenPattiPoolCardProps) {
  if (isLoading || !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Betting pool</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const totalPts = HAND_TYPE_ORDER.reduce((sum, handType) => sum + stats[handType].total, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Betting pool</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {HAND_TYPE_ORDER.map((handType) => {
          const { count, total } = stats[handType];
          const share = totalPts > 0 ? (total / totalPts) * 100 : 0;
          return (
            <div key={handType} className="space-y-1.5">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{HAND_TYPE_INFO[handType].label}</span>
                <span className="text-muted-foreground">
                  {count} {count === 1 ? "player" : "players"} · {formatPoints(total)} pts
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${share}%` }} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
