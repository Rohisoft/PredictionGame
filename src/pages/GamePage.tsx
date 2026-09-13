import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RoundTimer } from "@/components/game/RoundTimer";
import { PlaceBetPanel } from "@/components/game/PlaceBetPanel";
import { DiceResult } from "@/components/game/DiceResult";
import { RecentResults } from "@/components/game/RecentResults";
import { RulesPanel } from "@/components/game/RulesPanel";
import { BalanceCard } from "@/components/wallet/BalanceCard";
import { useCurrentRound } from "@/hooks/useCurrentRound";
import { useMyBetForRound } from "@/hooks/useMyBets";
import { useServerTimeOffset } from "@/lib/serverTime";
import { useServerTick } from "@/hooks/useServerTick";
import { useBetSettlementToasts } from "@/hooks/useBetSettlementToasts";
import { getRoundPhase } from "@/types/game";

export function GamePage() {
  const { getServerNow, synced } = useServerTimeOffset();
  const { data: round, isLoading } = useCurrentRound();
  const { data: myBet } = useMyBetForRound(round?.id);
  useBetSettlementToasts();

  const now = useServerTick(getServerNow, 500);

  if (isLoading || !synced || !round) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const bettingEndMs = new Date(round.betting_end_time).getTime();
  const resultEndMs = new Date(round.result_time).getTime();
  const phase = getRoundPhase(now, bettingEndMs);
  const isBetting = phase === "betting" && round.status === "betting";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <BalanceCard />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Round #{round.round_number}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {isBetting ? "Place your bet before betting closes" : "Betting closed — revealing result"}
            </p>
          </div>
          <Badge variant={isBetting ? "success" : "destructive"}>
            {isBetting ? "Betting open" : "Result phase"}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
          {isBetting ? (
            <RoundTimer
              targetMs={bettingEndMs}
              totalSeconds={50}
              getServerNow={getServerNow}
              label="Betting closes in"
              tone="primary"
            />
          ) : (
            <RoundTimer
              targetMs={resultEndMs}
              totalSeconds={10}
              getServerNow={getServerNow}
              label="Next round in"
              tone="destructive"
            />
          )}
          <DiceResult diceResult={round.dice_result} rolling={!isBetting && !round.dice_result} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your bet</CardTitle>
        </CardHeader>
        <CardContent>
          <PlaceBetPanel roundId={round.id} disabled={!isBetting} existingBet={myBet} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent results</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentResults />
        </CardContent>
      </Card>

      <RulesPanel />
    </div>
  );
}
