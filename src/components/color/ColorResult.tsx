import { useEffect, useRef, useState } from "react";
import type { Color } from "@/types/database";
import { cn } from "@/lib/utils";

const CYCLE: Color[] = ["red", "green"];

const SWATCH: Record<Color, string> = {
  red: "bg-red-500",
  green: "bg-green-500",
};

const LABEL: Record<Color, string> = {
  red: "Red",
  green: "Green",
};

interface ColorResultProps {
  winningColor: Color | null;
  rolling: boolean;
}

export function ColorResult({ winningColor, rolling }: ColorResultProps) {
  const [displayed, setDisplayed] = useState<Color>("red");
  const cycleIndex = useRef(0);

  useEffect(() => {
    if (!rolling) return;
    const interval = setInterval(() => {
      cycleIndex.current = (cycleIndex.current + 1) % CYCLE.length;
      setDisplayed(CYCLE[cycleIndex.current]);
    }, 140);
    return () => clearInterval(interval);
  }, [rolling]);

  useEffect(() => {
    if (!rolling && winningColor) {
      setDisplayed(winningColor);
    }
  }, [rolling, winningColor]);

  const caption = rolling ? "Rolling…" : winningColor ? `${LABEL[winningColor]} wins` : "";

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={cn(
          "h-20 w-20 rounded-full shadow-[0_10px_20px_rgba(0,0,0,0.2)] ring-4 ring-white/60 transition-transform",
          SWATCH[displayed],
          rolling ? "scale-90 animate-pulse" : "scale-100",
        )}
      />
      <span className="h-5 text-center text-xs font-medium text-white/60">{caption}</span>
    </div>
  );
}
