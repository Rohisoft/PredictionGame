import type { PlayingCard } from "@/types/database";
import { cn } from "@/lib/utils";

interface PlayingCardViewProps {
  card: PlayingCard | null;
  faceDown?: boolean;
  winning?: boolean;
  className?: string;
}

export function PlayingCardView({ card, faceDown, winning, className }: PlayingCardViewProps) {
  const revealed = !faceDown && !!card;
  const isRed = card?.suit === "♥" || card?.suit === "♦";

  return (
    <div className={cn("h-16 w-11 shrink-0 [perspective:600px] sm:h-20 sm:w-14", className)}>
      <div
        className={cn(
          "relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]",
          revealed && "[transform:rotateY(180deg)]",
        )}
      >
        {/* Back face — shown face-down, before the reveal */}
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-lg border-2 border-amber-400/40 bg-gradient-to-br from-indigo-800 to-indigo-950 shadow-[0_0_10px_rgba(0,0,0,0.4)] [backface-visibility:hidden]",
          )}
        >
          <div className="h-[70%] w-[65%] rounded-md border border-amber-400/30 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.18),transparent_70%)]" />
        </div>

        {/* Front face — the actual card, revealed after the flip */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-0.5 rounded-lg border-2 bg-white shadow-md [backface-visibility:hidden] [transform:rotateY(180deg)]",
            winning ? "border-amber-400 shadow-[0_0_14px_rgba(250,204,21,0.6)] animate-glow-pulse" : "border-slate-200",
          )}
        >
          {card && (
            <>
              <span className={cn("text-base font-bold leading-none sm:text-lg", isRed ? "text-red-600" : "text-slate-900")}>
                {card.rank}
              </span>
              <span className={cn("text-lg leading-none sm:text-xl", isRed ? "text-red-600" : "text-slate-900")}>
                {card.suit}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
