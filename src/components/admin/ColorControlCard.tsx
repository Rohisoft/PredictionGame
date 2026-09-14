import { toast } from "sonner";
import { Ban, Palette } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDisableColorGame, useEnableColorGame, useSuperAdminColorState } from "@/hooks/useAdmin";
import { ApiError } from "@/lib/apiClient";

export function ColorControlCard() {
  const { data: state, isLoading } = useSuperAdminColorState();
  const enableColor = useEnableColorGame();
  const disableColor = useDisableColorGame();

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Color Prediction control</CardTitle>
          <CardDescription>
            Turn the Red/Green/Violet game on or off for every player. Disabling it stops new
            rounds from opening; a round already in progress still settles and pays out normally.
          </CardDescription>
        </div>
        {!isLoading && <Badge variant={enabled ? "success" : "destructive"}>{enabled ? "Enabled" : "Disabled"}</Badge>}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}
