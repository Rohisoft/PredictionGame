import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyBetHistory, type BetWithRound } from "@/hooks/useMyBets";
import { formatDateTime, formatPoints, cn } from "@/lib/utils";
import type { BetStatus } from "@/types/database";

const STATUS_VARIANT: Record<BetStatus, "default" | "success" | "destructive" | "secondary"> = {
  pending: "secondary",
  won: "success",
  lost: "destructive",
  refunded: "default",
};

export function HistoryPage() {
  const { data: bets, isLoading } = useMyBetHistory(50);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  const rows: BetWithRound[] = bets ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <h1 className="text-xl font-bold">Game history</h1>
      {rows.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            You haven't placed a bet yet — head to the game page to get started.
          </CardContent>
        </Card>
      )}
      {rows.map((bet) => (
        <Card key={bet.id}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">
              Round #{bet.game_rounds?.round_number ?? "—"}
            </CardTitle>
            <Badge variant={STATUS_VARIANT[bet.status]}>{bet.status}</Badge>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Your pick</p>
              <p className="font-medium capitalize">{bet.selected_side}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Stake</p>
              <p className="font-medium">₹{formatPoints(bet.amount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Dice result</p>
              <p className="font-medium">
                {bet.game_rounds?.dice_result ?? "—"}{" "}
                {bet.game_rounds?.winning_side && (
                  <span className="capitalize text-muted-foreground">
                    ({bet.game_rounds.winning_side})
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Payout</p>
              <p
                className={cn(
                  "font-medium",
                  bet.payout_amount > 0 ? "text-success" : "text-muted-foreground",
                )}
              >
                {bet.payout_amount > 0 ? `+₹${formatPoints(bet.payout_amount)}` : "—"}
              </p>
            </div>
          </CardContent>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Placed {formatDateTime(bet.created_at)}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
