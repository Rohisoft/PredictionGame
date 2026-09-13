import { useState } from "react";
import { ChevronDown, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdjustPointsForm } from "@/components/admin/AdjustPointsForm";
import { UserActivity } from "@/components/admin/UserActivity";
import { formatPoints, cn } from "@/lib/utils";
import type { AdminUser } from "@/hooks/useAdmin";

export function UserRow({ user }: { user: AdminUser }) {
  const [panel, setPanel] = useState<"none" | "adjust" | "activity">("none");

  function toggle(next: "adjust" | "activity") {
    setPanel((current) => (current === next ? "none" : next));
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{user.full_name ?? "—"}</p>
            {user.is_admin && (
              <Badge variant="outline" className="gap-1">
                <ShieldCheck className="h-3 w-3" /> Admin
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" className="text-sm">
            {formatPoints(user.balance)} pts
          </Badge>
          <Button size="sm" variant={panel === "adjust" ? "default" : "outline"} onClick={() => toggle("adjust")}>
            Adjust
          </Button>
          <Button size="sm" variant="ghost" onClick={() => toggle("activity")}>
            Activity
            <ChevronDown className={cn("h-4 w-4 transition-transform", panel === "activity" && "rotate-180")} />
          </Button>
        </div>
      </div>

      {panel === "adjust" && (
        <div className="mt-3">
          <AdjustPointsForm userEmail={user.email} onDone={() => setPanel("none")} />
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
