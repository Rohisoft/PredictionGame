import { useState } from "react";
import { ChevronDown, KeyRound, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RechargeAdminForm } from "@/components/admin/RechargeAdminForm";
import { SetPasswordForm } from "@/components/admin/SetPasswordForm";
import { UserActivity } from "@/components/admin/UserActivity";
import { formatPoints, cn } from "@/lib/utils";
import type { AdminUser } from "@/hooks/useAdmin";

export function AdminRow({ admin }: { admin: AdminUser }) {
  const [panel, setPanel] = useState<"none" | "recharge" | "activity" | "password">("none");

  function toggle(next: "recharge" | "activity" | "password") {
    setPanel((current) => (current === next ? "none" : next));
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">@{admin.username}</p>
            <Badge variant="outline" className="gap-1">
              <ShieldCheck className="h-3 w-3" /> Admin
            </Badge>
            {admin.must_change_password && <Badge variant="secondary">Pending activation</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {admin.full_name ?? "—"}
            {admin.email ? ` · ${admin.email}` : ""}
            {admin.phone ? ` · ${admin.phone}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" className="text-sm">
            {formatPoints(admin.balance)} pts
          </Badge>
          <Button size="sm" variant={panel === "recharge" ? "default" : "outline"} onClick={() => toggle("recharge")}>
            Recharge
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

      {panel === "recharge" && (
        <div className="mt-3">
          <RechargeAdminForm username={admin.username} onDone={() => setPanel("none")} />
        </div>
      )}
      {panel === "password" && (
        <div className="mt-3">
          <SetPasswordForm username={admin.username} onDone={() => setPanel("none")} />
        </div>
      )}
      {panel === "activity" && (
        <div className="mt-3">
          <UserActivity userId={admin.id} />
        </div>
      )}
    </div>
  );
}
