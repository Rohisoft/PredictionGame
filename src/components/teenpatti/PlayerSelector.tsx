import { User, Bot } from "lucide-react";
import type { TeenPattiPlayer } from "@/types/database";
import { PLAYER_INFO } from "@/types/teenPatti";
import { cn } from "@/lib/utils";

interface PlayerSelectorProps {
  value: TeenPattiPlayer | null;
  onChange: (player: TeenPattiPlayer) => void;
  disabled?: boolean;
}

const OPTIONS: { player: TeenPattiPlayer; icon: typeof User }[] = [
  { player: "playerA", icon: User },
  { player: "playerB", icon: Bot },
];

export function PlayerSelector({ value, onChange, disabled }: PlayerSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {OPTIONS.map((opt) => {
        const info = PLAYER_INFO[opt.player];
        return (
          <button
            key={opt.player}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.player)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 text-center transition-all disabled:cursor-not-allowed disabled:opacity-50",
              value === opt.player ? "border-primary bg-accent shadow-md" : "border-border bg-card hover:border-primary/40",
            )}
          >
            <opt.icon className={cn("h-7 w-7", value === opt.player ? "text-primary" : "text-muted-foreground")} />
            <span className="text-sm font-bold">{info.label}</span>
            <span className="text-xs text-muted-foreground">{info.sublabel}</span>
          </button>
        );
      })}
    </div>
  );
}
