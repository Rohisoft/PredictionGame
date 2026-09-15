import { PlayingCardView } from "@/components/teenpatti/PlayingCardView";
import { HAND_TYPE_INFO } from "@/types/teenPatti";
import type { HandType, PlayingCard } from "@/types/database";

interface CardsRevealProps {
  cards: PlayingCard[];
  winningHandType: HandType | null;
  rolling: boolean;
}

export function CardsReveal({ cards, winningHandType, rolling }: CardsRevealProps) {
  const caption = rolling ? "Dealing…" : winningHandType ? `${HAND_TYPE_INFO[winningHandType].label} wins` : "";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <PlayingCardView key={i} card={cards[i] ?? null} faceDown={rolling || !cards[i]} />
        ))}
      </div>
      <span className="h-5 text-center text-xs font-medium text-muted-foreground">{caption}</span>
    </div>
  );
}
