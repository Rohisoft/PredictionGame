import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { UseMutationResult } from "@tanstack/react-query";
import { adminCreateUserSchema, type AdminCreateUserInput } from "@/schemas/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCheckUsername } from "@/hooks/useAdmin";
import type { Profile } from "@/types/database";

interface CreateAccountFormProps {
  idPrefix: string;
  submitLabel: string;
  successMessage: (username: string) => string;
  helpText: string;
  useCreateAccount: () => UseMutationResult<Profile, Error, AdminCreateUserInput>;
}

/** Shared by CreateUserForm and CreateAdminForm — same fields and username-availability flow, different endpoint/copy. */
export function CreateAccountForm({ idPrefix, submitLabel, successMessage, helpText, useCreateAccount }: CreateAccountFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AdminCreateUserInput>({ resolver: zodResolver(adminCreateUserSchema) });
  const createAccount = useCreateAccount();
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
      await createAccount.mutateAsync(values);
      toast.success(successMessage(values.username));
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
          <Label htmlFor={`${idPrefix}-username`}>Username</Label>
          <Input
            id={`${idPrefix}-username`}
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
          {availability?.available === true && <p className="text-xs text-success">Available</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-password`}>Initial password</Label>
          <Input id={`${idPrefix}-password`} type="text" placeholder="At least 8 characters" {...register("password")} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-name`}>Full name</Label>
          <Input id={`${idPrefix}-name`} placeholder="Jane Doe" {...register("fullName")} />
          {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-email`}>Email (optional)</Label>
          <Input id={`${idPrefix}-email`} type="email" placeholder="jane@example.com" {...register("email")} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-phone`}>Phone (optional)</Label>
          <Input id={`${idPrefix}-phone`} placeholder="+1 555 0100" {...register("phone")} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{helpText}</p>
      <Button type="submit" disabled={createAccount.isPending} className="w-full sm:w-auto">
        {createAccount.isPending ? "Creating…" : submitLabel}
      </Button>
    </form>
  );
}
