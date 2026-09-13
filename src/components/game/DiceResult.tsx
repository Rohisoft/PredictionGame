import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { Side } from "@/types/database";

const FACE_PIPS: Record<number, [row: number, col: number][]> = {
  1: [[2, 2]],
  2: [
    [1, 1],
    [3, 3],
  ],
  3: [
    [1, 1],
    [2, 2],
    [3, 3],
  ],
  4: [
    [1, 1],
    [1, 3],
    [3, 1],
    [3, 3],
  ],
  5: [
    [1, 1],
    [1, 3],
    [2, 2],
    [3, 1],
    [3, 3],
  ],
  6: [
    [1, 1],
    [2, 1],
    [3, 1],
    [1, 3],
    [2, 3],
    [3, 3],
  ],
};

function DiceFace({ value }: { value: number }) {
  const pips = FACE_PIPS[value] ?? [];
  const isActive = (row: number, col: number) => pips.some(([r, c]) => r === row && c === col);

  return (
    <div className="grid h-full w-full grid-cols-3 grid-rows-3 gap-0.5 p-3">
      {[1, 2, 3].map((row) =>
        [1, 2, 3].map((col) => (
          <div key={`${row}-${col}`} className="flex items-center justify-center">
            {isActive(row, col) && <span className="h-2.5 w-2.5 rounded-full bg-slate-800 shadow-inner" />}
          </div>
        )),
      )}
    </div>
  );
}

interface DiceResultProps {
  diceResult: number | null;
  winningSide: Side | null;
  rolling: boolean;
}

export function DiceResult({ diceResult, winningSide, rolling }: DiceResultProps) {
  const [face, setFace] = useState(diceResult ?? 1);

  useEffect(() => {
    if (!rolling) {
      if (diceResult) setFace(diceResult);
      return;
    }
    const interval = setInterval(() => {
      setFace(1 + Math.floor(Math.random() * 6));
    }, 90);
    return () => clearInterval(interval);
  }, [rolling, diceResult]);

  const caption = rolling
    ? "Rolling…"
    : diceResult
      ? `Rolled a ${diceResult} — ${winningSide === "odd" ? "Odd" : "Even"} wins`
      : "";

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          "flex h-20 w-20 items-center justify-center rounded-xl border border-slate-300 bg-white shadow-[0_2px_0_rgba(0,0,0,0.08),0_10px_18px_-6px_rgba(0,0,0,0.25)] transition-transform",
          rolling && "animate-dice-roll",
        )}
      >
        <DiceFace value={face} />
      </div>
      <span className="h-5 text-center text-xs font-medium text-muted-foreground">{caption}</span>
    </div>
  );
}
