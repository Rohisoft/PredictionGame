import { useEffect, useState } from "react";
import { secondsRemaining } from "@/types/game";
import { cn } from "@/lib/utils";

interface RoundTimerProps {
  targetMs: number;
  totalSeconds: number;
  getServerNow: () => number;
  label: string;
  tone?: "primary" | "destructive";
}

export function RoundTimer({
  targetMs,
  totalSeconds,
  getServerNow,
  label,
  tone = "primary",
}: RoundTimerProps) {
  const [remaining, setRemaining] = useState(() => secondsRemaining(getServerNow(), targetMs));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(secondsRemaining(getServerNow(), targetMs));
    }, 250);
    return () => clearInterval(interval);
  }, [targetMs, getServerNow]);

  const progress = Math.min(1, Math.max(0, remaining / totalSeconds));

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <svg className="absolute h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            strokeWidth="8"
            className="stroke-secondary"
          />
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 44}
            strokeDashoffset={2 * Math.PI * 44 * (1 - progress)}
            className={cn(
              "transition-[stroke-dashoffset] duration-200",
              tone === "primary" ? "stroke-primary" : "stroke-destructive",
            )}
          />
        </svg>
        <span className="text-3xl font-bold tabular-nums">{remaining}</span>
      </div>
      <span
        className={cn(
          "text-sm font-medium",
          tone === "primary" ? "text-primary" : "text-destructive",
        )}
      >
        {label}
      </span>
    </div>
  );
}
