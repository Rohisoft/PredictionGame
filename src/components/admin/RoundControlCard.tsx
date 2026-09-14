import { toast } from "sonner";
import { Play, Square } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BetPoolCard } from "@/components/game/BetPoolCard";
import { useAdminRoundState, useStartRound, useStopRound } from "@/hooks/useAdmin";
import { useRoundBetStats } from "@/hooks/useCurrentRound";
import { ApiError } from "@/lib/apiClient";

export function RoundControlCard() {
  const { data: state, isLoading } = useAdminRoundState();
  const startRound = useStartRound();
  const stopRound = useStopRound();
  const { data: betStats, isLoading: betStatsLoading } = useRoundBetStats(state?.current_round?.id ?? null);

  async function handleStart() {
    try {
      await startRound.mutateAsync();
      toast.success("Game started — a new round is open for predictions.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to start the game");
    }
  }

  async function handleStop() {
    try {
      await stopRound.mutateAsync();
      toast.success("Game stopped — the open round was cancelled and every prediction on it refunded.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to stop the game");
    }
  }

  const round = state?.current_round;
  const isRunning = state?.is_game_running ?? false;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Round control</CardTitle>
            <CardDescription>
              While stopped, no new rounds open. Stopping mid-round cancels it and refunds every
              prediction on it in full.
            </CardDescription>
          </div>
          {!isLoading && <Badge variant={isRunning ? "success" : "destructive"}>{isRunning ? "Running" : "Stopped"}</Badge>}
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <p className="text-sm text-muted-foreground">
              {round
                ? `Round #${round.round_number} — ${round.status}`
                : "No round has been played yet."}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleStart}
              disabled={isRunning || startRound.isPending}
              className="gap-1.5"
            >
              <Play className="h-4 w-4" />
              Start
            </Button>
            <Button
              onClick={handleStop}
              disabled={!isRunning || stopRound.isPending}
              variant="destructive"
              className="gap-1.5"
            >
              <Square className="h-4 w-4" />
              Stop
            </Button>
          </div>
        </CardContent>
      </Card>

      {round && <BetPoolCard stats={betStats} isLoading={betStatsLoading} />}
    </>
  );
}
