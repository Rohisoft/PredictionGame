import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { adminSetPasswordSchema, type AdminSetPasswordInput } from "@/schemas/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminSetPassword } from "@/hooks/useAdmin";

interface SetPasswordFormProps {
  username: string;
  onDone?: () => void;
}

export function SetPasswordForm({ username, onDone }: SetPasswordFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AdminSetPasswordInput>({ resolver: zodResolver(adminSetPasswordSchema) });
  const setPassword = useAdminSetPassword();

  async function onSubmit(values: AdminSetPasswordInput) {
    try {
      await setPassword.mutateAsync({ username, ...values });
      toast.success(`Password reset for @${username}. They'll be asked to change it on next login.`);
      reset();
      onDone?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not reset the password";
      toast.error(message);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-2 rounded-lg border border-border bg-secondary/40 p-3 sm:flex-row sm:items-start"
    >
      <div className="flex-1 space-y-1">
        <Label htmlFor={`new-password-${username}`} className="text-xs">
          New password for @{username}
        </Label>
        <Input id={`new-password-${username}`} placeholder="At least 8 characters" {...register("password")} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <Button type="submit" size="sm" disabled={setPassword.isPending} className="sm:self-end">
        {setPassword.isPending ? "Resetting…" : "Reset password"}
      </Button>
    </form>
  );
}
