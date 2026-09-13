import { useEffect, useRef, useState } from "react";
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

const SIZE = 80; // px
const HALF = SIZE / 2;

/** Where each numbered face physically sits on the cube (opposite faces sum to 7, like a real die). */
const FACE_PLACEMENT: Record<number, string> = {
  1: `translateZ(${HALF}px)`,
  6: `rotateY(180deg) translateZ(${HALF}px)`,
  2: `rotateY(90deg) translateZ(${HALF}px)`,
  5: `rotateY(-90deg) translateZ(${HALF}px)`,
  3: `rotateX(-90deg) translateZ(${HALF}px)`,
  4: `rotateX(90deg) translateZ(${HALF}px)`,
};

/** Cube rotation (mod 360) that brings a given face to point straight at the viewer. */
const FACE_SHOW_ROTATION: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  6: { x: 0, y: 180 },
  2: { x: 0, y: -90 },
  5: { x: 0, y: 90 },
  3: { x: 90, y: 0 },
  4: { x: -90, y: 0 },
};

function DieFace({ value, placement }: { value: number; placement: string }) {
  const pips = FACE_PIPS[value] ?? [];
  const isActive = (row: number, col: number) => pips.some(([r, c]) => r === row && c === col);

  return (
    <div
      className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0.5 rounded-xl border border-slate-300 bg-gradient-to-br from-white to-slate-100 p-3 shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)]"
      style={{ transform: placement, backfaceVisibility: "hidden" }}
    >
      {[1, 2, 3].map((row) =>
        [1, 2, 3].map((col) => (
          <div key={`${row}-${col}`} className="flex items-center justify-center">
            {isActive(row, col) && (
              <span className="h-2.5 w-2.5 rounded-full bg-slate-700 shadow-[inset_0_1px_1px_rgba(0,0,0,0.4)]" />
            )}
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
  const [rotation, setRotation] = useState({ x: -20, y: 30 });
  const rotationRef = useRef(rotation);
  rotationRef.current = rotation;

  useEffect(() => {
    if (!rolling) return;
    const interval = setInterval(() => {
      setRotation((r) => ({
        x: r.x + 90 + Math.round(Math.random() * 90),
        y: r.y + 90 + Math.round(Math.random() * 90),
      }));
    }, 220);
    return () => clearInterval(interval);
  }, [rolling]);

  useEffect(() => {
    if (rolling || !diceResult) return;
    const target = FACE_SHOW_ROTATION[diceResult];
    const current = rotationRef.current;
    // Snap forward (never backward) to the nearest rotation that both shows
    // the right face and continues the same spin direction, plus one extra
    // full turn as a little flourish on landing.
    const snap = (cur: number, targetMod: number) => {
      const delta = ((targetMod - cur) % 360 + 360) % 360;
      return cur + delta + 360;
    };
    setRotation({ x: snap(current.x, target.x), y: snap(current.y, target.y) });
  }, [rolling, diceResult]);

  const caption = rolling
    ? "Rolling…"
    : diceResult
      ? `Rolled a ${diceResult} — ${winningSide === "odd" ? "Odd" : "Even"} wins`
      : "";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="[perspective:400px]" style={{ width: SIZE, height: SIZE }}>
        <div
          className={cn(
            "relative h-full w-full ease-out [transform-style:preserve-3d]",
            rolling ? "transition-transform duration-200" : "transition-transform duration-700",
          )}
          style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }}
        >
          {([1, 2, 3, 4, 5, 6] as const).map((value) => (
            <DieFace key={value} value={value} placement={FACE_PLACEMENT[value]} />
          ))}
        </div>
      </div>
      <span className="h-5 text-center text-xs font-medium text-muted-foreground">{caption}</span>
    </div>
  );
}
