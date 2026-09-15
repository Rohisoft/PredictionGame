import { Handshake, Trophy } from "lucide-react";
import { PlayingCardView } from "@/components/teenpatti/PlayingCardView";
import { HAND_TYPE_INFO, PLAYER_INFO } from "@/types/teenPatti";
import type { HandType, PlayingCard, TeenPattiPlayer, TeenPattiWinner } from "@/types/database";
import { cn } from "@/lib/utils";

interface CardsRevealProps {
  playerACards: PlayingCard[];
  playerBCards: PlayingCard[];
  playerAHandType: HandType | null;
  playerBHandType: HandType | null;
  winner: TeenPattiWinner | null;
  rolling: boolean;
}

export function CardsReveal({
  playerACards,
  playerBCards,
  playerAHandType,
  playerBHandType,
  winner,
  rolling,
}: CardsRevealProps) {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="grid w-full grid-cols-2 gap-3">
        <PlayerHand player="playerA" cards={playerACards} handType={playerAHandType} rolling={rolling} winner={winner} />
        <PlayerHand player="playerB" cards={playerBCards} handType={playerBHandType} rolling={rolling} winner={winner} />
      </div>
      <WinnerBanner winner={winner} rolling={rolling} />
    </div>
  );
}

function PlayerHand({
  player,
  cards,
  handType,
  rolling,
  winner,
}: {
  player: TeenPattiPlayer;
  cards: PlayingCard[];
  handType: HandType | null;
  rolling: boolean;
  winner: TeenPattiWinner | null;
}) {
  const info = PLAYER_INFO[player];
  const isWinner = winner === player;

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-colors",
        isWinner ? "border-success bg-success/5" : "border-border",
      )}
    >
      <div className="text-center">
        <p className="text-sm font-bold">{info.label}</p>
        <p className="text-xs text-muted-foreground">{info.sublabel}</p>
      </div>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <PlayingCardView key={i} card={cards[i] ?? null} faceDown={rolling || !cards[i]} />
        ))}
      </div>
      <span className="h-4 text-xs font-medium text-muted-foreground">
        {!rolling && handType ? HAND_TYPE_INFO[handType].label : ""}
      </span>
    </div>
  );
}

function WinnerBanner({ winner, rolling }: { winner: TeenPattiWinner | null; rolling: boolean }) {
  if (rolling || !winner) {
    return <span className="h-6 text-center text-xs font-medium text-muted-foreground">Dealing…</span>;
  }

  if (winner === "tie") {
    return (
      <div className="flex h-6 items-center gap-1.5 text-sm font-semibold text-muted-foreground">
        <Handshake className="h-4 w-4" />
        It's a tie — every prediction on this round was refunded
      </div>
    );
  }

  return (
    <div className="flex h-6 items-center gap-1.5 text-sm font-semibold text-success">
      <Trophy className="h-4 w-4" />
      {PLAYER_INFO[winner].label} wins!
    </div>
  );
}
