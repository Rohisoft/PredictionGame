import { useEffect, useState } from "react";
import { secondsRemaining } from "@/types/game";
import { cn } from "@/lib/utils";

interface RoundTimerProps {
  targetMs: number;
  totalSeconds: number;
  getServerNow: () => number;
  bettingOpen: boolean;
}

const WARNING_THRESHOLD_SECONDS = 10;

/**
 * Shared across Dice, Color Prediction and Teen Patti — a big circular
 * countdown ring on the games' dark casino-table backdrop: green while
 * betting is open, amber-pulsing in the last 10s, red once closed.
 */
export function RoundTimer({ targetMs, totalSeconds, getServerNow, bettingOpen }: RoundTimerProps) {
  const [remaining, setRemaining] = useState(() => secondsRemaining(getServerNow(), targetMs));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(secondsRemaining(getServerNow(), targetMs));
    }, 250);
    return () => clearInterval(interval);
  }, [targetMs, getServerNow]);

  const progress = Math.min(1, Math.max(0, remaining / totalSeconds));
  const isWarning = bettingOpen && remaining <= WARNING_THRESHOLD_SECONDS;
  const ringColor = !bettingOpen ? "stroke-rose-400" : isWarning ? "stroke-amber-400" : "stroke-emerald-400";
  const textColor = !bettingOpen ? "text-rose-400" : isWarning ? "text-amber-400" : "text-emerald-400";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={cn(
          "relative flex h-16 w-16 items-center justify-center sm:h-20 sm:w-20",
          isWarning && "animate-timer-warning",
        )}
      >
        <svg className="absolute h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" strokeWidth="8" className="stroke-white/10" />
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 44}
            strokeDashoffset={2 * Math.PI * 44 * (1 - progress)}
            className={cn("transition-[stroke-dashoffset] duration-200", ringColor)}
          />
        </svg>
        <span className={cn("text-xl font-bold tabular-nums sm:text-2xl", textColor)}>{remaining}</span>
      </div>
      <span
        className={cn(
          "whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
          bettingOpen ? "bg-emerald-400/15 text-emerald-400" : "bg-rose-400/15 text-rose-400",
        )}
      >
        {bettingOpen ? "Betting Open" : "Betting Closed"}
      </span>
    </div>
  );
}
