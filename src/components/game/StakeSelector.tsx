import { STAKE_AMOUNTS, type StakeAmount } from "@/types/game";
import { cn } from "@/lib/utils";

interface StakeSelectorProps {
  value: StakeAmount | null;
  onChange: (amount: StakeAmount) => void;
  disabled?: boolean;
}

export function StakeSelector({ value, onChange, disabled }: StakeSelectorProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {STAKE_AMOUNTS.map((amount) => (
        <button
          key={amount}
          type="button"
          disabled={disabled}
          onClick={() => onChange(amount)}
          className={cn(
            "rounded-lg border-2 py-2.5 text-sm font-semibold transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40",
            value === amount
              ? "border-amber-400 bg-amber-400 text-slate-950"
              : "border-white/10 bg-white/5 text-white hover:border-white/25",
          )}
        >
          {amount} pts
        </button>
      ))}
    </div>
  );
}
