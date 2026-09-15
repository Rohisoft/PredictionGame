import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Crown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminRow } from "@/components/admin/AdminRow";
import { CreateAdminForm } from "@/components/admin/CreateAdminForm";
import { SpinControlCard } from "@/components/admin/SpinControlCard";
import { ColorControlCard } from "@/components/admin/ColorControlCard";
import { TeenPattiControlCard } from "@/components/admin/TeenPattiControlCard";
import { useProfile } from "@/hooks/useProfile";
import { useSuperAdminAdmins } from "@/hooks/useAdmin";
import { useWallet } from "@/hooks/useWallet";
import { formatPoints } from "@/lib/utils";

export function SuperAdminPage() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: wallet } = useWallet();
  const [search, setSearch] = useState("");
  const { data: admins, isLoading: adminsLoading } = useSuperAdminAdmins(search);

  if (profileLoading) {
    return <Skeleton className="mx-auto h-64 max-w-2xl" />;
  }

  if (!profile?.is_super_admin) {
    return <Navigate to={profile?.is_admin ? "/admin" : "/play"} replace />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-sm opacity-80">Your balance — for giving points to players directly</p>
            <p className="mt-1 text-3xl font-bold">{formatPoints(wallet?.balance ?? 0)} pts</p>
          </div>
          <Crown className="h-10 w-10 opacity-70" />
        </CardContent>
      </Card>

      <SpinControlCard />

      <ColorControlCard />

      <TeenPattiControlCard />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-primary" />
            <CardTitle>Create an admin account</CardTitle>
          </div>
          <CardDescription>
            Admins can create and manage their own players, but need points from you before they
            can give any out — new admins start at 0 balance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateAdminForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-primary" />
            <CardTitle>Manage admins</CardTitle>
          </div>
          <CardDescription>
            Recharge an admin's balance, reset their password, or review their activity. Recharging
            mints points directly — it isn't taken from your own balance above.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search admins by name or username…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardContent>
      </Card>

      {adminsLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : !admins || admins.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No admin accounts yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {admins.map((admin) => (
            <AdminRow key={admin.id} admin={admin} />
          ))}
        </div>
      )}
    </div>
  );
}
