import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { TeenPattiRoundBetStats } from "@/hooks/useCurrentTeenPattiRound";
import { PLAYER_INFO } from "@/types/teenPatti";
import type { TeenPattiPlayer } from "@/types/database";
import { formatPoints } from "@/lib/utils";

const PLAYER_ORDER: TeenPattiPlayer[] = ["playerA", "playerB"];

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
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const totalPts = PLAYER_ORDER.reduce((sum, player) => sum + stats[player].total, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Betting pool</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {PLAYER_ORDER.map((player) => {
          const { count, total } = stats[player];
          const share = totalPts > 0 ? (total / totalPts) * 100 : 50;
          return (
            <div key={player} className="space-y-1.5">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{PLAYER_INFO[player].label}</span>
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
