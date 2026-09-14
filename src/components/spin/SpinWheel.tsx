import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSpinState, useSpinWheel } from "@/hooks/useSpin";
import { ApiError } from "@/lib/apiClient";
import { cn } from "@/lib/utils";

const SEGMENT_COLORS = [
  "#f97316",
  "#facc15",
  "#4ade80",
  "#22d3ee",
  "#60a5fa",
  "#a78bfa",
  "#f472b6",
  "#fb7185",
];

const SPIN_DURATION_MS = 3800;
const EXTRA_FULL_SPINS = 5;

function buildConicGradient(colors: string[]): string {
  const segmentAngle = 360 / colors.length;
  const stops = colors.map(
    (color, i) => `${color} ${(i * segmentAngle).toFixed(3)}deg ${((i + 1) * segmentAngle).toFixed(3)}deg`,
  );
  return `conic-gradient(${stops.join(", ")})`;
}

/** Rotation (deg) that lands `segmentIndex`'s middle under the fixed top pointer, spinning forward from `from`. */
function targetRotation(from: number, segmentIndex: number, segmentCount: number): number {
  const segmentAngle = 360 / segmentCount;
  const midAngle = segmentIndex * segmentAngle + segmentAngle / 2;
  const baseTarget = (360 - midAngle) % 360;
  const currentMod = ((from % 360) + 360) % 360;
  let delta = baseTarget - currentMod;
  if (delta < 0) delta += 360;
  return from + delta + EXTRA_FULL_SPINS * 360;
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}

export function SpinWheel() {
  const { data: state, isLoading } = useSpinState();
  const spin = useSpinWheel();
  const [rotation, setRotation] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const segments = state?.segments ?? Array.from({ length: 8 }, () => 0);
  const nextSpinMs = state?.next_spin_at ? new Date(state.next_spin_at).getTime() - now : 0;
  const cooldownElapsed = !state?.next_spin_at || nextSpinMs <= 0;
  const canSpin = !!state && (state.can_spin || cooldownElapsed) && !animating && !spin.isPending;

  async function handleSpin() {
    if (!canSpin) return;
    try {
      const result = await spin.mutateAsync();
      setAnimating(true);
      setRotation((current) => targetRotation(current, result.segment_index, segments.length));

      timeoutRef.current = setTimeout(() => {
        setAnimating(false);
        if (result.value > 0) {
          toast.success(`You won ${result.value} points! 🎉`);
        } else {
          toast("No luck this time — come back tomorrow!");
        }
      }, SPIN_DURATION_MS);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't spin right now");
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative" style={{ width: 260, height: 260 }}>
        <div
          className="absolute left-1/2 top-0 z-10 h-0 w-0 -translate-x-1/2 -translate-y-1"
          style={{
            borderLeft: "10px solid transparent",
            borderRight: "10px solid transparent",
            borderTop: "16px solid hsl(var(--foreground))",
          }}
        />
        <div
          className="h-full w-full rounded-full border-4 border-border shadow-lg"
          style={{
            background: buildConicGradient(SEGMENT_COLORS),
            transform: `rotate(${rotation}deg)`,
            transition: animating ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.19, 1, 0.22, 1)` : "none",
          }}
        >
          {segments.map((value, i) => {
            const segmentAngle = 360 / segments.length;
            const angle = i * segmentAngle + segmentAngle / 2;
            return (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 origin-top text-sm font-bold text-white/90"
                style={{
                  transform: `rotate(${angle}deg) translateY(-95px)`,
                }}
              >
                {value}
              </div>
            );
          })}
        </div>
        <div className="absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full border-4 border-border bg-card text-xl">
          🎁
        </div>
      </div>

      {isLoading ? (
        <div className="h-10 w-40 animate-pulse rounded-lg bg-secondary" />
      ) : canSpin ? (
        <Button size="lg" onClick={handleSpin} disabled={spin.isPending || animating} className="min-w-40">
          {spin.isPending ? "Spinning…" : "Spin the wheel"}
        </Button>
      ) : (
        <div className={cn("text-center text-sm text-muted-foreground", animating && "opacity-50")}>
          {animating ? "Spinning…" : `Next free spin in ${formatCountdown(nextSpinMs)}`}
        </div>
      )}
    </div>
  );
}
