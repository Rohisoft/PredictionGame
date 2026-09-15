import { toast } from "sonner";
import { Ban, Spade } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TeenPattiPoolCard } from "@/components/teenpatti/TeenPattiPoolCard";
import { useDisableTeenPattiGame, useEnableTeenPattiGame, useSuperAdminTeenPattiState } from "@/hooks/useAdmin";
import { useTeenPattiRoundBetStats } from "@/hooks/useCurrentTeenPattiRound";
import { ApiError } from "@/lib/apiClient";

export function TeenPattiControlCard() {
  const { data: state, isLoading } = useSuperAdminTeenPattiState();
  const enableTeenPatti = useEnableTeenPattiGame();
  const disableTeenPatti = useDisableTeenPattiGame();
  const { data: betStats, isLoading: betStatsLoading } = useTeenPattiRoundBetStats(state?.current_round?.id ?? null);

  async function handleEnable() {
    try {
      await enableTeenPatti.mutateAsync();
      toast.success("Teen Patti Prediction enabled — players can play again.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to enable Teen Patti Prediction");
    }
  }

  async function handleDisable() {
    try {
      await disableTeenPatti.mutateAsync();
      toast.success("Teen Patti Prediction disabled.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to disable Teen Patti Prediction");
    }
  }

  const enabled = state?.enabled ?? false;
  const round = state?.current_round;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Teen Patti Prediction control</CardTitle>
            <CardDescription>
              Turn the Teen Patti hand-prediction game on or off for every player. Disabling it hides
              the game and blocks new bets; a round already in progress still settles and pays out
              normally.
            </CardDescription>
          </div>
          {!isLoading && <Badge variant={enabled ? "success" : "destructive"}>{enabled ? "Enabled" : "Disabled"}</Badge>}
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <p className="text-sm text-muted-foreground">
              {round ? `Round #${round.round_number} — ${round.status}` : "No round has been played yet."}
            </p>
          )}

          <div className="flex gap-2">
            <Button onClick={handleEnable} disabled={enabled || enableTeenPatti.isPending} className="gap-1.5">
              <Spade className="h-4 w-4" />
              Enable
            </Button>
            <Button
              onClick={handleDisable}
              disabled={!enabled || disableTeenPatti.isPending}
              variant="destructive"
              className="gap-1.5"
            >
              <Ban className="h-4 w-4" />
              Disable
            </Button>
          </div>
        </CardContent>
      </Card>

      {round && <TeenPattiPoolCard stats={betStats} isLoading={betStatsLoading} />}
    </>
  );
}
