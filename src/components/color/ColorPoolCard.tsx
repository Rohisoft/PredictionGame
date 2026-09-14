import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ColorRoundBetStats } from "@/hooks/useCurrentColorRound";
import { formatPoints } from "@/lib/utils";

interface ColorPoolCardProps {
  stats: ColorRoundBetStats | undefined;
  isLoading: boolean;
}

export function ColorPoolCard({ stats, isLoading }: ColorPoolCardProps) {
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

  const totalPts = stats.red.total + stats.green.total;
  const redShare = totalPts > 0 ? (stats.red.total / totalPts) * 100 : 50;
  const greenShare = 100 - redShare;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Betting pool</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <PoolRow label="Red" count={stats.red.count} total={stats.red.total} share={redShare} swatch="bg-red-500" />
        <PoolRow
          label="Green"
          count={stats.green.count}
          total={stats.green.total}
          share={greenShare}
          swatch="bg-green-500"
        />
      </CardContent>
    </Card>
  );
}

function PoolRow({
  label,
  count,
  total,
  share,
  swatch,
}: {
  label: string;
  count: number;
  total: number;
  share: number;
  swatch: string;
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
        <div className={`h-full rounded-full transition-all ${swatch}`} style={{ width: `${share}%` }} />
      </div>
    </div>
  );
}
