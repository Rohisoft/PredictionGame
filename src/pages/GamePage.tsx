import { useEffect, useState } from "react";
import { PauseCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RoundTimer } from "@/components/game/RoundTimer";
import { PlaceBetPanel } from "@/components/game/PlaceBetPanel";
import { DiceResult } from "@/components/game/DiceResult";
import { DiceResultBoard } from "@/components/game/DiceResultBoard";
import { RecentResults } from "@/components/game/RecentResults";
import { RulesPanel } from "@/components/game/RulesPanel";
import { BalanceCard } from "@/components/wallet/BalanceCard";
import { useCurrentRound, useGameRunning, useRoundById } from "@/hooks/useCurrentRound";
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

/**
 * Dark casino backdrop for the whole page — every section has its own dark
 * panel, but without this the light app background would show through the
 * gaps between them. Matches the same treatment on Color Prediction and
 * Teen Patti for a consistent look across all three games.
 */
const PAGE_SHELL_CLASS =
  "mx-auto max-w-2xl space-y-4 rounded-3xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-3 shadow-2xl sm:p-5";

export function GamePage() {
  const { getServerNow, synced } = useServerTimeOffset();
  const { data: latest } = useCurrentRound();
  const { data: gameRunning } = useGameRunning();
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
    // "cancelled" is terminal too (an admin stopped it) — nothing left to
    // reveal, so there's no reason to hold on it the way a completed round
    // is held to show its dice result.
    const isTerminal = round?.status === "completed" || round?.status === "cancelled";
    if (!isTerminal) return; // still revealing; wait for it

    const timeout = setTimeout(
      () => setActiveRoundId(latest.id),
      round?.status === "cancelled" ? 0 : REVEAL_HOLD_MS,
    );
    return () => clearTimeout(timeout);
  }, [latest, round, activeRoundId]);

  // If a round somehow never settles (e.g. the scheduler isn't running),
  // don't strand the UI on it forever once its result_time has long passed.
  useEffect(() => {
    if (!round || round.status === "completed" || round.status === "cancelled") return;
    const resultDeadlineMs = new Date(round.result_time).getTime();
    if (now - resultDeadlineMs < STUCK_ROUND_MS) return;
    if (latest && latest.id !== activeRoundId) {
      setActiveRoundId(latest.id);
    }
  }, [round, now, latest, activeRoundId]);

  const { data: myBet } = useMyBetForRound(round?.id);

  if (!synced || !round) {
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
  const isBetting = phase === "betting" && round.status === "betting";
  const isCancelled = round.status === "cancelled";
  const isCompleted = round.status === "completed";
  const isRevealing = !isCancelled && !isCompleted && !isBetting;
  // Default to true while the flag is still loading, so the paused banner
  // doesn't flash on for a moment on every page load.
  const isGamePaused = gameRunning?.is_game_running === false;

  return (
    <div className={PAGE_SHELL_CLASS}>
      <BalanceCard />

      {isGamePaused && (
        <Card className="border-dashed border-white/15 bg-white/5">
          <CardContent className="flex items-center gap-3 py-4 text-sm text-white/60">
            <PauseCircle className="h-5 w-5 shrink-0" />
            Predictions are paused right now — an admin will resume the game shortly.
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
              <DiceResult diceResult={round.dice_result} winningSide={round.winning_side} rolling={isRevealing} />
            </>
          )}
        </div>
      </div>

      {isCompleted && round.dice_result && round.winning_side && (
        <DiceResultBoard
          roundNumber={round.round_number}
          diceResult={round.dice_result}
          winningSide={round.winning_side}
          myBet={myBet}
        />
      )}

      <PlaceBetPanel roundId={round.id} disabled={!isBetting} existingBet={myBet} />

      <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 p-4 shadow-lg sm:p-5">
        <p className="mb-2 text-sm font-semibold text-white/70">Recent Results</p>
        <RecentResults />
      </div>

      <RulesPanel />
    </div>
  );
}
