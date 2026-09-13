import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { adminAddPointsSchema, type AdminAddPointsInput } from "@/schemas/bet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminAddPoints } from "@/hooks/useAdminAddPoints";

export function AddPointsForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AdminAddPointsInput>({ resolver: zodResolver(adminAddPointsSchema) });
  const addPoints = useAdminAddPoints();

  async function onSubmit(values: AdminAddPointsInput) {
    try {
      await addPoints.mutateAsync(values);
      toast.success(`Added ${values.amount} points to ${values.userEmail}`);
      reset();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not add points";
      toast.error(message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="userEmail">User email</Label>
        <Input id="userEmail" type="email" placeholder="player@example.com" {...register("userEmail")} />
        {errors.userEmail && <p className="text-xs text-destructive">{errors.userEmail.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="amount">Points to add</Label>
        <Input
          id="amount"
          type="number"
          step="1"
          placeholder="100"
          {...register("amount", { valueAsNumber: true })}
        />
        {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Note (optional)</Label>
        <Input id="description" placeholder="Manual top-up" {...register("description")} />
      </div>
      <Button type="submit" disabled={addPoints.isPending} className="w-full">
        {addPoints.isPending ? "Adding…" : "Add points"}
      </Button>
    </form>
  );
}
