import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { adminAdjustPointsSchema } from "@/schemas/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSuperAdminAdjustAdminPoints } from "@/hooks/useAdmin";
import { cn } from "@/lib/utils";

const PRESETS = [-500, 500, 1000, 5000] as const;

const formSchema = adminAdjustPointsSchema.omit({ username: true });
type FormInput = z.infer<typeof formSchema>;

interface RechargeAdminFormProps {
  username: string;
  onDone?: () => void;
}

export function RechargeAdminForm({ username, onDone }: RechargeAdminFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormInput>({ resolver: zodResolver(formSchema) });
  const adjustAdminPoints = useSuperAdminAdjustAdminPoints();

  async function onSubmit(values: FormInput) {
    try {
      await adjustAdminPoints.mutateAsync({ ...values, username });
      toast.success(
        values.amount > 0
          ? `Credited ${values.amount} points to @${username}`
          : `Deducted ${Math.abs(values.amount)} points from @${username}`,
      );
      reset();
      onDone?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not adjust points";
      toast.error(message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 rounded-lg border border-border bg-secondary/40 p-3">
      <p className="text-xs text-muted-foreground">
        This mints points directly for @{username} — it isn't taken from your own balance.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setValue("amount", preset, { shouldValidate: true })}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              preset > 0
                ? "border-success/40 text-success hover:bg-success/10"
                : "border-destructive/40 text-destructive hover:bg-destructive/10",
            )}
          >
            {preset > 0 ? `+${preset}` : preset}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="flex-1 space-y-1">
          <Label htmlFor={`recharge-amount-${username}`} className="text-xs">
            Amount (negative to deduct)
          </Label>
          <Input
            id={`recharge-amount-${username}`}
            type="number"
            step="1"
            placeholder="e.g. 1000 or -500"
            {...register("amount", { valueAsNumber: true })}
          />
          {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
        </div>
        <div className="flex-1 space-y-1">
          <Label htmlFor={`recharge-note-${username}`} className="text-xs">
            Note (optional)
          </Label>
          <Input id={`recharge-note-${username}`} placeholder="Monthly recharge" {...register("description")} />
        </div>
      </div>
      <Button type="submit" size="sm" disabled={adjustAdminPoints.isPending} className="w-full sm:w-auto">
        {adjustAdminPoints.isPending ? "Applying…" : "Apply"}
      </Button>
    </form>
  );
}
