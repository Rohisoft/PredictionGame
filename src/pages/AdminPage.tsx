import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Crown, ShieldCheck, UserPlus, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { UserRow } from "@/components/admin/UserRow";
import { AdminRow } from "@/components/admin/AdminRow";
import { CreateUserForm } from "@/components/admin/CreateUserForm";
import { CreateAdminForm } from "@/components/admin/CreateAdminForm";
import { useProfile } from "@/hooks/useProfile";
import { useAdminUsers, useSuperAdminAdmins } from "@/hooks/useAdmin";
import { useWallet } from "@/hooks/useWallet";
import { formatPoints } from "@/lib/utils";

export function AdminPage() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: wallet } = useWallet();
  const [userSearch, setUserSearch] = useState("");
  const [adminSearch, setAdminSearch] = useState("");
  const { data: users, isLoading: usersLoading } = useAdminUsers(userSearch);
  const isSuperAdmin = profile?.is_super_admin ?? false;
  const { data: admins, isLoading: adminsLoading } = useSuperAdminAdmins(isSuperAdmin ? adminSearch : "");

  if (profileLoading) {
    return <Skeleton className="mx-auto h-64 max-w-2xl" />;
  }

  if (!profile?.is_admin) {
    return <Navigate to="/play" replace />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-sm opacity-80">Your balance — what you can give to your players</p>
            <p className="mt-1 text-3xl font-bold">{formatPoints(wallet?.balance ?? 0)} pts</p>
          </div>
          {isSuperAdmin ? <Crown className="h-10 w-10 opacity-70" /> : <ShieldCheck className="h-10 w-10 opacity-70" />}
        </CardContent>
      </Card>

      {isSuperAdmin && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Crown className="h-6 w-6 text-primary" />
                <CardTitle>Create an admin account</CardTitle>
              </div>
              <CardDescription>
                Superadmin only. Admins can create and manage their own players, but need points
                from you before they can give any out.
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
              <CardDescription>Recharge an admin's balance, reset their password, or review their activity.</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Search admins by name or username…"
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
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
        </>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" />
            <CardTitle>Create a player account</CardTitle>
          </div>
          <CardDescription>
            There's no public sign-up — every account starts here. The person sets their own
            password afterward using "Forgot password" on the sign-in page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateUserForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <CardTitle>Your players</CardTitle>
          </div>
          <CardDescription>
            {isSuperAdmin
              ? "Every player in the system. Giving points here comes out of your own balance above."
              : "Only players you created. Giving points here comes out of your own balance above — you can't adjust your own account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by name or username…"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
          />
        </CardContent>
      </Card>

      {usersLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : !users || users.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No players found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <UserRow key={user.id} user={user} />
          ))}
        </div>
      )}
    </div>
  );
}
