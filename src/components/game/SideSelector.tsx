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
      {options.map((opt) => (
        <button
          key={opt.side}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt.side)}
          className={cn(
            "flex flex-col items-center gap-1 rounded-xl border-2 p-5 text-center transition-all disabled:cursor-not-allowed disabled:opacity-50",
            value === opt.side
              ? "border-primary bg-accent shadow-md"
              : "border-border bg-card hover:border-primary/40",
          )}
        >
          <span
            className={cn(
              "text-xl font-bold",
              value === opt.side ? "text-primary" : "text-foreground",
            )}
          >
            {opt.label}
          </span>
          <span className="text-xs text-muted-foreground">{opt.hint}</span>
        </button>
      ))}
    </div>
  );
}
