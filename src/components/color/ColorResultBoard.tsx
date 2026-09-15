import { Trophy } from "lucide-react";
import type { Color, ColorBet } from "@/types/database";
import { cn } from "@/lib/utils";

interface ColorResultBoardProps {
  roundNumber: number;
  winningColor: Color;
  myBet: ColorBet | null | undefined;
}

const COLOR_LABEL: Record<Color, string> = { red: "Red", green: "Green" };
const COLOR_TEXT: Record<Color, string> = { red: "text-red-400", green: "text-emerald-400" };
const COLOR_SWATCH: Record<Color, string> = { red: "bg-red-500", green: "bg-emerald-500" };

/**
 * The dedicated "Result Board" — a settled-round recap separate from the
 * live table above it, mirroring Teen Patti's and Dice's. Purely display:
 * the winning color is exactly what the backend already decided.
 */
export function ColorResultBoard({ roundNumber, winningColor, myBet }: ColorResultBoardProps) {
  return (
    <div className="animate-fade-in rounded-2xl border border-amber-400/30 bg-gradient-to-b from-slate-900 to-slate-950 p-4 shadow-lg sm:p-6">
      <div className="mb-4 flex items-center justify-center gap-2">
        <Trophy className="h-4 w-4 text-amber-400" />
        <span className="text-xs font-semibold uppercase tracking-wide text-amber-300">Round #{roundNumber} Result</span>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <span className={cn("h-10 w-10 rounded-full shadow-[0_0_16px_rgba(250,204,21,0.25)] ring-2 ring-white/20", COLOR_SWATCH[winningColor])} />
        <div className={cn("animate-deal-in text-lg font-extrabold tracking-wide sm:text-2xl", COLOR_TEXT[winningColor])}>
          {COLOR_LABEL[winningColor].toUpperCase()} WINS
        </div>
      </div>

      {myBet && (
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <div>
            <p className="text-[11px] text-white/40">Your Prediction</p>
            <p className="text-sm font-semibold text-white">{COLOR_LABEL[myBet.selected_color]}</p>
          </div>
          <div>
            <p className="text-[11px] text-white/40">Result</p>
            <p
              className={cn(
                "text-sm font-semibold",
                myBet.status === "won" ? "text-emerald-400" : "text-rose-400",
              )}
            >
              {myBet.status === "won" ? "WIN" : "LOSS"}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-white/40">{myBet.status === "won" ? "Points Won" : "Points Lost"}</p>
            <p
              className={cn(
                "text-sm font-bold",
                myBet.status === "won" ? "text-emerald-400" : "text-rose-400",
              )}
            >
              {myBet.status === "won" ? `+${myBet.payout_amount}` : `-${myBet.amount}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
