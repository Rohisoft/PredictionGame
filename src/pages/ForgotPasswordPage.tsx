import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dices } from "lucide-react";
import { toast } from "sonner";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/schemas/auth";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: ForgotPasswordInput) {
    setSubmitting(true);
    const { error } = await sendPasswordReset(values.username);
    setSubmitting(false);
    if (error) {
      toast.error(error);
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-accent to-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Dices className="mb-1 h-8 w-8 text-primary" />
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            If your account has an email on file, we'll send a reset link there. Otherwise, ask
            your admin to reset it for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-center text-sm text-muted-foreground">
              If that account has an email on file, a reset link is on its way.
            </p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input id="username" placeholder="janedoe" {...register("username")} />
                {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          )}
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link to="/login" className="font-medium text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
