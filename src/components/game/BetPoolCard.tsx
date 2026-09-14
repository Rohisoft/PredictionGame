import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { RoundBetStats } from "@/hooks/useCurrentRound";
import { formatPoints, cn } from "@/lib/utils";

interface BetPoolCardProps {
  stats: RoundBetStats | undefined;
  isLoading: boolean;
}

export function BetPoolCard({ stats, isLoading }: BetPoolCardProps) {
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

  const totalPts = stats.odd.total + stats.even.total;
  const oddShare = totalPts > 0 ? (stats.odd.total / totalPts) * 100 : 50;
  const evenShare = 100 - oddShare;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Betting pool</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <PoolRow label="Odd" count={stats.odd.count} total={stats.odd.total} share={oddShare} tone="primary" />
        <PoolRow label="Even" count={stats.even.count} total={stats.even.total} share={evenShare} tone="success" />
      </CardContent>
    </Card>
  );
}

function PoolRow({
  label,
  count,
  total,
  share,
  tone,
}: {
  label: string;
  count: number;
  total: number;
  share: number;
  tone: "primary" | "success";
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {count} {count === 1 ? "player" : "players"} · {formatPoints(total)} pts
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full transition-all", tone === "primary" ? "bg-primary" : "bg-success")}
          style={{ width: `${share}%` }}
        />
      </div>
    </div>
  );
}
