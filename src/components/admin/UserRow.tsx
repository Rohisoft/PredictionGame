import { useState } from "react";
import { ChevronDown, KeyRound, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdjustPointsForm } from "@/components/admin/AdjustPointsForm";
import { SetPasswordForm } from "@/components/admin/SetPasswordForm";
import { UserActivity } from "@/components/admin/UserActivity";
import { formatPoints, cn } from "@/lib/utils";
import type { AdminUser } from "@/hooks/useAdmin";

export function UserRow({ user }: { user: AdminUser }) {
  const [panel, setPanel] = useState<"none" | "adjust" | "activity" | "password">("none");

  function toggle(next: "adjust" | "activity" | "password") {
    setPanel((current) => (current === next ? "none" : next));
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">@{user.username}</p>
            {user.is_admin && (
              <Badge variant="outline" className="gap-1">
                <ShieldCheck className="h-3 w-3" /> Admin
              </Badge>
            )}
            {user.must_change_password && (
              <Badge variant="secondary" className="gap-1">
                Pending activation
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {user.full_name ?? "—"}
            {user.email ? ` · ${user.email}` : ""}
            {user.phone ? ` · ${user.phone}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" className="text-sm">
            {formatPoints(user.balance)} pts
          </Badge>
          <Button size="sm" variant={panel === "adjust" ? "default" : "outline"} onClick={() => toggle("adjust")}>
            Adjust
          </Button>
          <Button size="sm" variant="ghost" onClick={() => toggle("password")} title="Reset password">
            <KeyRound className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => toggle("activity")}>
            Activity
            <ChevronDown className={cn("h-4 w-4 transition-transform", panel === "activity" && "rotate-180")} />
          </Button>
        </div>
      </div>

      {panel === "adjust" && (
        <div className="mt-3">
          <AdjustPointsForm username={user.username} onDone={() => setPanel("none")} />
        </div>
      )}
      {panel === "password" && (
        <div className="mt-3">
          <SetPasswordForm username={user.username} onDone={() => setPanel("none")} />
        </div>
      )}
      {panel === "activity" && (
        <div className="mt-3">
          <UserActivity userId={user.id} />
        </div>
      )}
    </div>
  );
}
