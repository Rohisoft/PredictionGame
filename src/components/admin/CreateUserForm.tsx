import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { adminCreateUserSchema, type AdminCreateUserInput } from "@/schemas/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminCreateUser } from "@/hooks/useAdmin";

export function CreateUserForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AdminCreateUserInput>({ resolver: zodResolver(adminCreateUserSchema) });
  const createUser = useAdminCreateUser();

  async function onSubmit(values: AdminCreateUserInput) {
    try {
      await createUser.mutateAsync(values);
      toast.success(
        `Account created for ${values.email}. They can set their password with "Forgot password" on the sign-in page.`,
      );
      reset();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create the account";
      toast.error(message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="flex-1 space-y-1">
        <Label htmlFor="new-user-email" className="text-xs">
          Email
        </Label>
        <Input id="new-user-email" type="email" placeholder="player@example.com" {...register("email")} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <div className="flex-1 space-y-1">
        <Label htmlFor="new-user-name" className="text-xs">
          Full name
        </Label>
        <Input id="new-user-name" placeholder="Jane Doe" {...register("fullName")} />
        {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
      </div>
      <Button type="submit" disabled={createUser.isPending} className="sm:self-end">
        {createUser.isPending ? "Creating…" : "Create account"}
      </Button>
    </form>
  );
}
