import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RoundTimer } from "@/components/game/RoundTimer";
import { PlaceBetPanel } from "@/components/game/PlaceBetPanel";
import { DiceResult } from "@/components/game/DiceResult";
import { RecentResults } from "@/components/game/RecentResults";
import { RulesPanel } from "@/components/game/RulesPanel";
import { BalanceCard } from "@/components/wallet/BalanceCard";
import { useCurrentRound, useRoundById } from "@/hooks/useCurrentRound";
import { useMyBetForRound } from "@/hooks/useMyBets";
import { useServerTimeOffset } from "@/lib/serverTime";
import { useServerTick } from "@/hooks/useServerTick";
import { useBetSettlementToasts } from "@/hooks/useBetSettlementToasts";
import { getRoundPhase } from "@/types/game";
import { cn } from "@/lib/utils";

/** How long to keep showing a completed round's result before moving on. */
const REVEAL_HOLD_MS = 4_000;
/** Safety net in case a cron tick never settles a round (shouldn't happen). */
const STUCK_ROUND_MS = 20_000;

export function GamePage() {
  const { getServerNow, synced } = useServerTimeOffset();
  const { data: latest } = useCurrentRound();
  useBetSettlementToasts();

  const now = useServerTick(getServerNow, 500);

  // The round actually shown on screen. Deliberately decoupled from
  // `latest`: the moment a round is settled, create_next_round() (in the
  // same cron tick) gives it a successor, so `latest` skips straight past
  // the completed round without ever showing it. Pinning by id and holding
  // it a few seconds after it completes is what makes the reveal visible.
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);
  const { data: round } = useRoundById(activeRoundId);

  // Re-evaluated whenever EITHER the pinned round's own data changes (it
  // finishes revealing) OR a newer round becomes known — whichever of the
  // two arrives last is what should trigger the switch. Depending on only
  // one of them (as an earlier version of this did) leaves a gap: if the
  // newer round becomes known first, nothing was watching for the pinned
  // round to finish anymore, and the UI never advances.
  useEffect(() => {
    if (!latest) return;

    if (activeRoundId === null) {
      setActiveRoundId(latest.id);
      return;
    }

    if (latest.id === activeRoundId) return;
    if (round?.status !== "completed") return; // still revealing; wait for it

    const timeout = setTimeout(() => setActiveRoundId(latest.id), REVEAL_HOLD_MS);
    return () => clearTimeout(timeout);
  }, [latest, round, activeRoundId]);

  // If a round somehow never settles (e.g. the scheduler isn't running),
  // don't strand the UI on it forever once its result_time has long passed.
  useEffect(() => {
    if (!round || round.status === "completed") return;
    const resultDeadlineMs = new Date(round.result_time).getTime();
    if (now - resultDeadlineMs < STUCK_ROUND_MS) return;
    if (latest && latest.id !== activeRoundId) {
      setActiveRoundId(latest.id);
    }
  }, [round, now, latest, activeRoundId]);

  const { data: myBet } = useMyBetForRound(round?.id);

  if (!synced || !round) {
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
  const isRevealing = round.status !== "completed" && !isBetting;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <BalanceCard />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Round #{round.round_number}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {isBetting
                ? "Submit your prediction before the window closes"
                : round.status === "completed"
                  ? "Round complete"
                  : "Predictions closed — revealing result"}
            </p>
          </div>
          <Badge variant={isBetting ? "success" : "destructive"}>
            {isBetting ? "Predictions open" : "Result phase"}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
          {isBetting ? (
            <RoundTimer
              targetMs={bettingEndMs}
              totalSeconds={50}
              getServerNow={getServerNow}
              label="Predictions close in"
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
          <DiceResult
            diceResult={round.dice_result}
            winningSide={round.winning_side}
            rolling={isRevealing}
          />
        </CardContent>
        {round.status === "completed" && (
          <CardContent className="pt-0">
            <div
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border p-3 text-center",
                myBet?.status === "won"
                  ? "border-success/40 bg-success/10"
                  : myBet?.status === "lost"
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-border bg-secondary/50",
              )}
            >
              <p className="text-sm font-semibold">
                {round.winning_side === "odd" ? "Odd" : "Even"} wins with a {round.dice_result}
              </p>
              {myBet?.status === "won" && (
                <p className="text-sm font-medium text-success">
                  You won {myBet.payout_amount} points! 🎉
                </p>
              )}
              {myBet?.status === "lost" && (
                <p className="text-sm font-medium text-destructive">
                  You lost {myBet.amount} points.
                </p>
              )}
              {!myBet && (
                <p className="text-xs text-muted-foreground">
                  You didn't make a prediction this round.
                </p>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your prediction</CardTitle>
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
