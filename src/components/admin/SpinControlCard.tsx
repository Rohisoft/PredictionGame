import { toast } from "sonner";
import { Ban, Gift } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDisableSpin, useEnableSpin, useSuperAdminSpinState } from "@/hooks/useAdmin";
import { ApiError } from "@/lib/apiClient";

export function SpinControlCard() {
  const { data: state, isLoading } = useSuperAdminSpinState();
  const enableSpin = useEnableSpin();
  const disableSpin = useDisableSpin();

  async function handleEnable() {
    try {
      await enableSpin.mutateAsync();
      toast.success("Spin & Win enabled — players can spin again.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to enable Spin & Win");
    }
  }

  async function handleDisable() {
    try {
      await disableSpin.mutateAsync();
      toast.success("Spin & Win disabled.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to disable Spin & Win");
    }
  }

  const enabled = state?.enabled ?? false;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Spin & Win control</CardTitle>
          <CardDescription>
            Turn the daily bonus wheel on or off for every player. Disabling it doesn't affect a
            spin already claimed today — only new spins are blocked until it's re-enabled.
          </CardDescription>
        </div>
        {!isLoading && <Badge variant={enabled ? "success" : "destructive"}>{enabled ? "Enabled" : "Disabled"}</Badge>}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleEnable} disabled={enabled || enableSpin.isPending} className="gap-1.5">
              <Gift className="h-4 w-4" />
              Enable
            </Button>
            <Button
              onClick={handleDisable}
              disabled={!enabled || disableSpin.isPending}
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
