import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { adminCreateUserSchema, type AdminCreateUserInput } from "@/schemas/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminCreateUser, useCheckUsername } from "@/hooks/useAdmin";
import { cn } from "@/lib/utils";

export function CreateUserForm() {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AdminCreateUserInput>({ resolver: zodResolver(adminCreateUserSchema) });
  const createUser = useAdminCreateUser();
  const checkUsername = useCheckUsername();
  const [checkedUsername, setCheckedUsername] = useState<string | null>(null);

  async function handleUsernameBlur() {
    const username = watch("username")?.trim();
    const phone = watch("phone")?.trim();
    if (!username || username.length < 3) return;
    try {
      await checkUsername.mutateAsync({ username, phone: phone || undefined });
      setCheckedUsername(username);
    } catch {
      // Invalid shape etc. — the form's own validation will already flag it on submit.
    }
  }

  function pickSuggestion(suggestion: string) {
    setValue("username", suggestion, { shouldValidate: true });
    setCheckedUsername(suggestion);
    checkUsername.reset();
  }

  async function onSubmit(values: AdminCreateUserInput) {
    try {
      await createUser.mutateAsync(values);
      toast.success(`Account created for @${values.username}. Share the username and initial password with them.`);
      reset();
      setCheckedUsername(null);
      checkUsername.reset();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create the account";
      toast.error(message);
    }
  }

  const availability = checkedUsername === watch("username") ? checkUsername.data : undefined;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="new-user-username">Username</Label>
          <Input
            id="new-user-username"
            placeholder="janedoe, or a phone number"
            {...register("username")}
            onBlur={handleUsernameBlur}
          />
          {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
          {availability?.available === false && (
            <div className="space-y-1.5 pt-1">
              <p className="text-xs text-destructive">That username is taken. Try one of these:</p>
              <div className="flex flex-wrap gap-1.5">
                {availability.suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => pickSuggestion(s)}
                    className="rounded-full border border-primary/40 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {availability?.available === true && (
            <p className="text-xs text-success">Available</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="new-user-password">Initial password</Label>
          <Input id="new-user-password" type="text" placeholder="At least 8 characters" {...register("password")} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="new-user-name">Full name</Label>
          <Input id="new-user-name" placeholder="Jane Doe" {...register("fullName")} />
          {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="new-user-email">Email (optional)</Label>
          <Input id="new-user-email" type="email" placeholder="jane@example.com" {...register("email")} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="new-user-phone">Phone (optional)</Label>
          <Input id="new-user-phone" placeholder="+1 555 0100" {...register("phone")} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        The person signs in with this username and password, then changes the password themselves
        on first login.
      </p>
      <Button type="submit" disabled={createUser.isPending} className={cn("w-full sm:w-auto")}>
        {createUser.isPending ? "Creating…" : "Create account"}
      </Button>
    </form>
  );
}
