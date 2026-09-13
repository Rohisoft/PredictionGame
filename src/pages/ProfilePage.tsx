import { Link, useNavigate } from "react-router-dom";
import { KeyRound, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { formatDateTime } from "@/lib/utils";

export function ProfilePage() {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate("/login");
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Card>
        <CardHeader className="items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent">
            <User className="h-8 w-8 text-accent-foreground" />
          </div>
          <CardTitle>{profile?.full_name ?? "Player"}</CardTitle>
          <p className="text-sm text-muted-foreground">@{user?.username}</p>
          {profile?.is_admin && <Badge>Admin</Badge>}
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {profile?.email && (
            <div className="flex justify-between border-t border-border pt-3">
              <span className="text-muted-foreground">Email</span>
              <span>{profile.email}</span>
            </div>
          )}
          {profile?.phone && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span>{profile.phone}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-3">
            <span className="text-muted-foreground">Member since</span>
            <span>{profile ? formatDateTime(profile.created_at) : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Account status</span>
            <Badge variant="success">Active</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Responsible play</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Odd/Even is a game of chance played with virtual points, not real currency.</p>
          <p>Only play with points you're comfortable losing, and take breaks between sessions.</p>
          <p>This game is intended for players aged 18 and over.</p>
        </CardContent>
      </Card>

      <Button asChild variant="outline" className="w-full gap-2">
        <Link to="/change-password">
          <KeyRound className="h-4 w-4" />
          Change password
        </Link>
      </Button>

      <Button variant="outline" className="w-full" onClick={handleLogout}>
        Log out
      </Button>
    </div>
  );
}
