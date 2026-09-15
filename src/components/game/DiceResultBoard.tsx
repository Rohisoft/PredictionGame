import { Trophy } from "lucide-react";
import type { Bet, Side } from "@/types/database";
import { cn } from "@/lib/utils";

interface DiceResultBoardProps {
  roundNumber: number;
  diceResult: number;
  winningSide: Side;
  myBet: Bet | null | undefined;
}

const SIDE_LABEL: Record<Side, string> = { odd: "Odd", even: "Even" };

/**
 * The dedicated "Result Board" — a settled-round recap separate from the
 * live table above it, mirroring Teen Patti's result board and Color
 * Prediction's. Purely display: the dice result and winner are exactly
 * what the backend already decided.
 */
export function DiceResultBoard({ roundNumber, diceResult, winningSide, myBet }: DiceResultBoardProps) {
  return (
    <div className="animate-fade-in rounded-2xl border border-amber-400/30 bg-gradient-to-b from-slate-900 to-slate-950 p-4 shadow-lg sm:p-6">
      <div className="mb-4 flex items-center justify-center gap-2">
        <Trophy className="h-4 w-4 text-amber-400" />
        <span className="text-xs font-semibold uppercase tracking-wide text-amber-300">Round #{roundNumber} Result</span>
      </div>

      <div className="flex flex-col items-center gap-1 text-center">
        <div className="animate-deal-in text-lg font-extrabold tracking-wide text-amber-300 sm:text-2xl">
          {SIDE_LABEL[winningSide].toUpperCase()} WINS
        </div>
        <p className="text-xs text-white/50 sm:text-sm">Rolled a {diceResult}</p>
      </div>

      {myBet && (
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <div>
            <p className="text-[11px] text-white/40">Your Prediction</p>
            <p className="text-sm font-semibold text-white">{SIDE_LABEL[myBet.selected_side]}</p>
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
