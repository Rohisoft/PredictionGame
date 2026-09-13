import { Navigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddPointsForm } from "@/components/admin/AddPointsForm";
import { useProfile } from "@/hooks/useProfile";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminPage() {
  const { data: profile, isLoading } = useProfile();

  if (isLoading) {
    return <Skeleton className="mx-auto h-64 max-w-md" />;
  }

  if (!profile?.is_admin) {
    return <Navigate to="/play" replace />;
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Card>
        <CardHeader className="items-center text-center">
          <ShieldCheck className="mb-1 h-8 w-8 text-primary" />
          <CardTitle>Add points</CardTitle>
          <CardDescription>
            Credit a player's wallet. This is checked server-side against your admin flag too.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddPointsForm />
        </CardContent>
      </Card>
    </div>
  );
}
