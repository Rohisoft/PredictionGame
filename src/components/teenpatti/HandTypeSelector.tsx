import type { HandType } from "@/types/database";
import { HAND_TYPE_INFO, HAND_TYPE_ORDER } from "@/types/teenPatti";
import { cn } from "@/lib/utils";

interface HandTypeSelectorProps {
  value: HandType | null;
  onChange: (handType: HandType) => void;
  disabled?: boolean;
}

export function HandTypeSelector({ value, onChange, disabled }: HandTypeSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {HAND_TYPE_ORDER.map((handType) => {
        const info = HAND_TYPE_INFO[handType];
        return (
          <button
            key={handType}
            type="button"
            disabled={disabled}
            onClick={() => onChange(handType)}
            className={cn(
              "flex items-start justify-between gap-2 rounded-xl border-2 p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50",
              value === handType ? "border-primary bg-accent shadow-md" : "border-border bg-card hover:border-primary/40",
            )}
          >
            <div>
              <p className={cn("text-sm font-bold", value === handType ? "text-primary" : "text-foreground")}>
                {info.label}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{info.description}</p>
            </div>
            <span className="shrink-0 rounded-full bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">
              {info.multiplier}x
            </span>
          </button>
        );
      })}
    </div>
  );
}
