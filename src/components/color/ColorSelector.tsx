import type { Color } from "@/types/database";
import { cn } from "@/lib/utils";

interface ColorSelectorProps {
  value: Color | null;
  onChange: (color: Color) => void;
  disabled?: boolean;
}

const OPTIONS: { color: Color; label: string; swatch: string }[] = [
  { color: "red", label: "Red", swatch: "bg-red-500" },
  { color: "green", label: "Green", swatch: "bg-emerald-500" },
];

export function ColorSelector({ value, onChange, disabled }: ColorSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {OPTIONS.map((opt) => {
        const selected = value === opt.color;
        return (
          <button
            key={opt.color}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.color)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40",
              selected
                ? "border-amber-400 bg-amber-400/10 shadow-[0_0_16px_rgba(250,204,21,0.25)]"
                : "border-white/10 bg-white/5 hover:border-white/25",
            )}
          >
            <span className={cn("h-8 w-8 rounded-full shadow-inner ring-2 ring-white/20", opt.swatch)} />
            <span className={cn("text-sm font-bold", selected ? "text-amber-300" : "text-white")}>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
