import { useEffect, useState } from "react";
import { PauseCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RoundTimer } from "@/components/game/RoundTimer";
import { PlaceColorBetPanel } from "@/components/color/PlaceColorBetPanel";
import { ColorResult } from "@/components/color/ColorResult";
import { ColorResultBoard } from "@/components/color/ColorResultBoard";
import { RecentColorResults } from "@/components/color/RecentColorResults";
import { ColorRulesPanel } from "@/components/color/ColorRulesPanel";
import { BalanceCard } from "@/components/wallet/BalanceCard";
import { useColorGameEnabled, useCurrentColorRound, useColorRoundById } from "@/hooks/useCurrentColorRound";
import { useMyColorBetForRound } from "@/hooks/useMyColorBets";
import { useServerTimeOffset } from "@/lib/serverTime";
import { useServerTick } from "@/hooks/useServerTick";
import { useColorBetSettlementToasts } from "@/hooks/useColorBetSettlementToasts";
import { getRoundPhase } from "@/types/game";
import { cn } from "@/lib/utils";

/** How long to keep showing a completed round's result before moving on. */
const REVEAL_HOLD_MS = 4_000;
/** Safety net in case a cron tick never settles a round (shouldn't happen). */
const STUCK_ROUND_MS = 20_000;

/**
 * Dark casino backdrop for the whole page — see the identical constant on
 * GamePage.tsx / TeenPattiPage.tsx for the reasoning; kept consistent
 * across all three games.
 */
const PAGE_SHELL_CLASS =
  "mx-auto max-w-2xl space-y-4 rounded-3xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-3 shadow-2xl sm:p-5";

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

  const isDisabled = gameEnabled?.enabled === false;

  if (!synced || (!round && !isDisabled)) {
    return (
      <div className={PAGE_SHELL_CLASS}>
        <Skeleton className="h-40 w-full bg-white/10" />
        <Skeleton className="h-64 w-full bg-white/10" />
      </div>
    );
  }

  if (isDisabled && !round) {
    return (
      <div className={PAGE_SHELL_CLASS}>
        <BalanceCard />
        <Card className="border-dashed border-white/15 bg-white/5">
          <CardContent className="flex items-center gap-3 py-6 text-sm text-white/60">
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
      <div className={PAGE_SHELL_CLASS}>
        <Skeleton className="h-40 w-full bg-white/10" />
        <Skeleton className="h-64 w-full bg-white/10" />
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
    <div className={PAGE_SHELL_CLASS}>
      <BalanceCard />

      {isDisabled && (
        <Card className="border-dashed border-white/15 bg-white/5">
          <CardContent className="flex items-center gap-3 py-4 text-sm text-white/60">
            <PauseCircle className="h-5 w-5 shrink-0" />
            Color Prediction is currently unavailable — an admin will resume it shortly.
          </CardContent>
        </Card>
      )}

      <div className="overflow-hidden rounded-2xl border border-indigo-900/40 bg-gradient-to-b from-slate-900 to-slate-950 shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-400">Round ID</p>
            <p className="text-lg font-bold text-white">#{round.round_number}</p>
          </div>
          <span
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold",
              isCancelled
                ? "bg-white/10 text-white/50"
                : isCompleted
                  ? "bg-amber-400/15 text-amber-300"
                  : isBetting
                    ? "bg-emerald-400/15 text-emerald-400"
                    : "bg-rose-400/15 text-rose-400",
            )}
          >
            {isCancelled ? "Cancelled" : isCompleted ? "Round Complete" : isBetting ? "Predictions Open" : "Rolling…"}
          </span>
        </div>

        <div className="flex flex-col items-center gap-4 px-3 pb-5 sm:px-6">
          {isCancelled ? (
            <p className="py-6 text-center text-sm text-white/50">
              This round was stopped before it finished. Every prediction on it was refunded in full.
            </p>
          ) : (
            <>
              {!isCompleted && (
                <RoundTimer
                  targetMs={isBetting ? bettingEndMs : resultEndMs}
                  totalSeconds={isBetting ? 50 : 10}
                  getServerNow={getServerNow}
                  bettingOpen={isBetting}
                />
              )}
              <ColorResult winningColor={round.winning_color} rolling={isRevealing} />
            </>
          )}
        </div>
      </div>

      {isCompleted && round.winning_color && (
        <ColorResultBoard roundNumber={round.round_number} winningColor={round.winning_color} myBet={myBet} />
      )}

      <PlaceColorBetPanel roundId={round.id} disabled={!isBetting} existingBet={myBet} />

      <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 p-4 shadow-lg sm:p-5">
        <p className="mb-2 text-sm font-semibold text-white/70">Recent Results</p>
        <RecentColorResults />
      </div>

      <ColorRulesPanel />
    </div>
  );
}
