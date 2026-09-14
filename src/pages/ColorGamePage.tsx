import { useEffect, useState } from "react";
import { PauseCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RoundTimer } from "@/components/game/RoundTimer";
import { PlaceColorBetPanel } from "@/components/color/PlaceColorBetPanel";
import { ColorResult } from "@/components/color/ColorResult";
import { RecentColorResults } from "@/components/color/RecentColorResults";
import { ColorPoolCard } from "@/components/color/ColorPoolCard";
import { ColorRulesPanel } from "@/components/color/ColorRulesPanel";
import { BalanceCard } from "@/components/wallet/BalanceCard";
import {
  useColorGameEnabled,
  useColorRoundBetStats,
  useCurrentColorRound,
  useColorRoundById,
} from "@/hooks/useCurrentColorRound";
import { useMyColorBetForRound } from "@/hooks/useMyColorBets";
import { useServerTimeOffset } from "@/lib/serverTime";
import { useServerTick } from "@/hooks/useServerTick";
import { useColorBetSettlementToasts } from "@/hooks/useColorBetSettlementToasts";
import { getRoundPhase } from "@/types/game";
import type { Color } from "@/types/database";
import { cn } from "@/lib/utils";

/** How long to keep showing a completed round's result before moving on. */
const REVEAL_HOLD_MS = 4_000;
/** Safety net in case a cron tick never settles a round (shouldn't happen). */
const STUCK_ROUND_MS = 20_000;

const COLOR_LABEL: Record<Color, string> = { red: "Red", green: "Green" };

export function ColorGamePage() {
  const { getServerNow, synced } = useServerTimeOffset();
  const { data: latest } = useCurrentColorRound();
  const { data: gameEnabled } = useColorGameEnabled();
  useColorBetSettlementToasts();

  const now = useServerTick(getServerNow, 500);

  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);
  const { data: round } = useColorRoundById(activeRoundId);

  useEffect(() => {
    if (!latest) return;

    if (activeRoundId === null) {
      setActiveRoundId(latest.id);
      return;
    }

    if (latest.id === activeRoundId) return;
    const isTerminal = round?.status === "completed" || round?.status === "cancelled";
    if (!isTerminal) return;

    const timeout = setTimeout(
      () => setActiveRoundId(latest.id),
      round?.status === "cancelled" ? 0 : REVEAL_HOLD_MS,
    );
    return () => clearTimeout(timeout);
  }, [latest, round, activeRoundId]);

  useEffect(() => {
    if (!round || round.status === "completed" || round.status === "cancelled") return;
    const resultDeadlineMs = new Date(round.result_time).getTime();
    if (now - resultDeadlineMs < STUCK_ROUND_MS) return;
    if (latest && latest.id !== activeRoundId) {
      setActiveRoundId(latest.id);
    }
  }, [round, now, latest, activeRoundId]);

  const { data: myBet } = useMyColorBetForRound(round?.id);
  const { data: betStats, isLoading: betStatsLoading } = useColorRoundBetStats(round?.id ?? null);

  const isDisabled = gameEnabled?.enabled === false;

  if (!synced || (!round && !isDisabled)) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isDisabled && !round) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <BalanceCard />
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
            <PauseCircle className="h-5 w-5 shrink-0" />
            Color Prediction is currently unavailable — check back later.
          </CardContent>
        </Card>
        <ColorRulesPanel />
      </div>
    );
  }

  if (!round) {
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
  const isBetting = phase === "betting" && round.status === "betting" && !isDisabled;
  const isCancelled = round.status === "cancelled";
  const isCompleted = round.status === "completed";
  const isRevealing = !isCancelled && !isCompleted && !isBetting;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <BalanceCard />

      {isDisabled && (
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
            <PauseCircle className="h-5 w-5 shrink-0" />
            Color Prediction is currently unavailable — an admin will resume it shortly.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Round #{round.round_number}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {isBetting
                ? "Submit your prediction before the window closes"
                : isCompleted
                  ? "Round complete"
                  : isCancelled
                    ? "Round cancelled by admin"
                    : "Predictions closed — revealing result"}
            </p>
          </div>
          <Badge variant={isBetting ? "success" : isCancelled ? "outline" : "destructive"}>
            {isBetting ? "Predictions open" : isCancelled ? "Cancelled" : "Result phase"}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
          {isCancelled ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              This round was stopped before it finished. Every prediction on it was refunded in
              full.
            </p>
          ) : (
            <>
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
              <ColorResult winningColor={round.winning_color} rolling={isRevealing} />
            </>
          )}
        </CardContent>
        {isCompleted && (
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
                {round.winning_color && COLOR_LABEL[round.winning_color]} wins
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

      <ColorPoolCard stats={betStats} isLoading={betStatsLoading} />

      <Card>
        <CardHeader>
          <CardTitle>Your prediction</CardTitle>
        </CardHeader>
        <CardContent>
          <PlaceColorBetPanel roundId={round.id} disabled={!isBetting} existingBet={myBet} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent results</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentColorResults />
        </CardContent>
      </Card>

      <ColorRulesPanel />
    </div>
  );
}
