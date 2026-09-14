import type { Color } from "@/types/database";
import { cn } from "@/lib/utils";

interface ColorSelectorProps {
  value: Color | null;
  onChange: (color: Color) => void;
  disabled?: boolean;
}

const OPTIONS: { color: Color; label: string; swatch: string; ring: string }[] = [
  { color: "red", label: "Red", swatch: "bg-red-500", ring: "border-red-500" },
  { color: "green", label: "Green", swatch: "bg-green-500", ring: "border-green-500" },
];

export function ColorSelector({ value, onChange, disabled }: ColorSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {OPTIONS.map((opt) => (
        <button
          key={opt.color}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt.color)}
          className={cn(
            "flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all disabled:cursor-not-allowed disabled:opacity-50",
            value === opt.color ? cn(opt.ring, "bg-accent shadow-md") : "border-border bg-card hover:border-primary/40",
          )}
        >
          <span className={cn("h-8 w-8 rounded-full shadow-inner", opt.swatch)} />
          <span className="text-sm font-bold">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
