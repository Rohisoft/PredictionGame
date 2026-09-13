import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dices } from "lucide-react";
import { toast } from "sonner";
import { loginSchema, type LoginInput } from "@/schemas/auth";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LoginPage() {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  if (user) {
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/play";
    return <Navigate to={from} replace />;
  }

  async function onSubmit(values: LoginInput) {
    setSubmitting(true);
    const { error } = await signIn(values);
    setSubmitting(false);
    if (error) {
      toast.error(error);
      return;
    }
    navigate("/play");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-accent to-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Dices className="mb-1 h-8 w-8 text-primary" />
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Sign in to keep playing Odd/Even.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input id="username" placeholder="janedoe" autoComplete="username" {...register("username")} />
              {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don't have a username yet? Accounts are created by an admin — ask them for access.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
