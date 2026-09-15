import { User, Spade } from "lucide-react";
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
  { player: "playerB", icon: Spade },
];

export function PlayerSelector({ value, onChange, disabled }: PlayerSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {OPTIONS.map((opt) => {
        const info = PLAYER_INFO[opt.player];
        const selected = value === opt.player;
        return (
          <button
            key={opt.player}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.player)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 text-center transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40",
              selected
                ? "border-amber-400 bg-amber-400/10 shadow-[0_0_16px_rgba(250,204,21,0.25)]"
                : "border-white/10 bg-white/5 hover:border-white/25",
            )}
          >
            <opt.icon className={cn("h-7 w-7", selected ? "text-amber-400" : "text-white/50")} />
            <span className={cn("text-sm font-bold", selected ? "text-amber-300" : "text-white")}>{info.label}</span>
            <span className="text-xs text-white/40">{info.sublabel}</span>
          </button>
        );
      })}
    </div>
  );
}
