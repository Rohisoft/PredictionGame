import type { PlayingCard } from "@/types/database";
import { cn } from "@/lib/utils";

interface PlayingCardViewProps {
  card: PlayingCard | null;
  faceDown?: boolean;
  className?: string;
}

export function PlayingCardView({ card, faceDown, className }: PlayingCardViewProps) {
  if (faceDown || !card) {
    return (
      <div
        className={cn(
          "flex h-20 w-14 items-center justify-center rounded-lg border-2 border-primary/30 bg-primary/10 text-primary",
          className,
        )}
      >
        <span className="text-lg font-bold">?</span>
      </div>
    );
  }

  const isRed = card.suit === "♥" || card.suit === "♦";

  return (
    <div
      className={cn(
        "flex h-20 w-14 flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-border bg-card shadow-sm",
        className,
      )}
    >
      <span className={cn("text-lg font-bold leading-none", isRed ? "text-red-600" : "text-foreground")}>
        {card.rank}
      </span>
      <span className={cn("text-xl leading-none", isRed ? "text-red-600" : "text-foreground")}>{card.suit}</span>
    </div>
  );
}
