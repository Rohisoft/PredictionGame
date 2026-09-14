import { toast } from "sonner";
import { Ban, Palette } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ColorPoolCard } from "@/components/color/ColorPoolCard";
import { useDisableColorGame, useEnableColorGame, useSuperAdminColorState } from "@/hooks/useAdmin";
import { useColorRoundBetStats } from "@/hooks/useCurrentColorRound";
import { ApiError } from "@/lib/apiClient";

export function ColorControlCard() {
  const { data: state, isLoading } = useSuperAdminColorState();
  const enableColor = useEnableColorGame();
  const disableColor = useDisableColorGame();
  const { data: betStats, isLoading: betStatsLoading } = useColorRoundBetStats(state?.current_round?.id ?? null);

  async function handleEnable() {
    try {
      await enableColor.mutateAsync();
      toast.success("Color Prediction enabled — players can play again.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to enable Color Prediction");
    }
  }

  async function handleDisable() {
    try {
      await disableColor.mutateAsync();
      toast.success("Color Prediction disabled.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to disable Color Prediction");
    }
  }

  const enabled = state?.enabled ?? false;
  const round = state?.current_round;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Color Prediction control</CardTitle>
            <CardDescription>
              Turn the Red/Green game on or off for every player. Disabling it stops new
              rounds from opening; a round already in progress still settles and pays out normally.
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
            <Button onClick={handleEnable} disabled={enabled || enableColor.isPending} className="gap-1.5">
              <Palette className="h-4 w-4" />
              Enable
            </Button>
            <Button
              onClick={handleDisable}
              disabled={!enabled || disableColor.isPending}
              variant="destructive"
              className="gap-1.5"
            >
              <Ban className="h-4 w-4" />
              Disable
            </Button>
          </div>
        </CardContent>
      </Card>

      {round && <ColorPoolCard stats={betStats} isLoading={betStatsLoading} />}
    </>
  );
}
