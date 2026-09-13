import { useState } from "react";
import { Navigate } from "react-router-dom";
import { ShieldCheck, UserPlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { UserRow } from "@/components/admin/UserRow";
import { CreateUserForm } from "@/components/admin/CreateUserForm";
import { useProfile } from "@/hooks/useProfile";
import { useAdminUsers } from "@/hooks/useAdmin";

export function AdminPage() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const [search, setSearch] = useState("");
  const { data: users, isLoading: usersLoading } = useAdminUsers(search);

  if (profileLoading) {
    return <Skeleton className="mx-auto h-64 max-w-2xl" />;
  }

  if (!profile?.is_admin) {
    return <Navigate to="/play" replace />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" />
            <CardTitle>Create an account</CardTitle>
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
            <ShieldCheck className="h-6 w-6 text-primary" />
            <CardTitle>Manage users</CardTitle>
          </div>
          <CardDescription>
            Search for a player to credit or debit their points, or review their recent
            activity. Every change is checked server-side against your admin flag too.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
            No users found.
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
