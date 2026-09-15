import type { Side } from "@/types/database";
import { cn } from "@/lib/utils";

interface SideSelectorProps {
  value: Side | null;
  onChange: (side: Side) => void;
  disabled?: boolean;
}

export function SideSelector({ value, onChange, disabled }: SideSelectorProps) {
  const options: { side: Side; label: string; hint: string }[] = [
    { side: "odd", label: "Odd", hint: "1 · 3 · 5" },
    { side: "even", label: "Even", hint: "2 · 4 · 6" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((opt) => {
        const selected = value === opt.side;
        return (
          <button
            key={opt.side}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.side)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border-2 p-5 text-center transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40",
              selected
                ? "border-amber-400 bg-amber-400/10 shadow-[0_0_16px_rgba(250,204,21,0.25)]"
                : "border-white/10 bg-white/5 hover:border-white/25",
            )}
          >
            <span className={cn("text-xl font-bold", selected ? "text-amber-300" : "text-white")}>{opt.label}</span>
            <span className="text-xs text-white/40">{opt.hint}</span>
          </button>
        );
      })}
    </div>
  );
}
