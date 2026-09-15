import { Handshake, Spade, Trophy, User } from "lucide-react";
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

const PLAYER_ICON: Record<TeenPattiPlayer, typeof User> = { playerA: User, playerB: Spade };

/**
 * The game table — Player A (left), a dealer avatar (center), Player B
 * (right), on a dark felt-style background. Intentionally its own fixed
 * dark theme regardless of the app's light/dark setting, like a real card
 * table would be. Purely presentational: still driven entirely by the
 * cards/hand types/winner the backend already decided.
 */
export function CardsReveal({
  playerACards,
  playerBCards,
  playerAHandType,
  playerBHandType,
  winner,
  rolling,
}: CardsRevealProps) {
  return (
    <div className="relative w-full animate-fade-in overflow-hidden rounded-2xl border border-indigo-900/50 bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 px-2 py-6 shadow-[inset_0_0_60px_rgba(0,0,0,0.5)] sm:px-6">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-40 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.14),transparent_70%)]" />

      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-1 sm:gap-4">
        <PlayerSeat player="playerA" cards={playerACards} handType={playerAHandType} rolling={rolling} winner={winner} />
        <Dealer rolling={rolling} />
        <PlayerSeat player="playerB" cards={playerBCards} handType={playerBHandType} rolling={rolling} winner={winner} />
      </div>

      <div className="relative mt-4 flex justify-center">
        <WinnerBanner winner={winner} rolling={rolling} />
      </div>
    </div>
  );
}

function Dealer({ rolling }: { rolling: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-amber-400/50 bg-gradient-to-br from-amber-500/30 to-transparent text-sm shadow-[0_0_16px_rgba(251,191,36,0.25)] sm:h-14 sm:w-14 sm:text-lg",
          rolling && "animate-dealer-pulse",
        )}
        aria-hidden
      >
        🎩
      </div>
      <span className="text-[10px] font-semibold tracking-wide text-white/40">VS</span>
    </div>
  );
}

function PlayerSeat({
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
  const Icon = PLAYER_ICON[player];
  const isWinner = winner === player;

  return (
    <div
      className={cn(
        "flex min-w-0 animate-deal-in flex-col items-center gap-1.5 rounded-xl border p-1.5 transition-colors sm:gap-2 sm:p-3",
        isWinner ? "border-amber-400/70 bg-amber-400/5 shadow-[0_0_20px_rgba(250,204,21,0.15)]" : "border-white/10 bg-white/5",
      )}
    >
      <div className="flex items-center gap-1 sm:gap-1.5">
        <Icon className={cn("h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5", isWinner ? "text-amber-400" : "text-white/50")} />
        <div className="min-w-0 text-center leading-tight">
          <p className={cn("truncate text-[11px] font-bold sm:text-sm", isWinner ? "text-amber-300" : "text-white")}>
            {info.label}
          </p>
          <p className="truncate text-[9px] text-white/40 sm:text-[10px]">{info.sublabel}</p>
        </div>
      </div>
      <div className="flex justify-center gap-0.5 sm:gap-1">
        {[0, 1, 2].map((i) => (
          <PlayingCardView key={i} card={cards[i] ?? null} faceDown={rolling || !cards[i]} winning={isWinner} />
        ))}
      </div>
      <span className="h-4 text-center text-[10px] font-medium text-white/60 sm:text-[11px]">
        {!rolling && handType ? HAND_TYPE_INFO[handType].label : ""}
      </span>
    </div>
  );
}

function WinnerBanner({ winner, rolling }: { winner: TeenPattiWinner | null; rolling: boolean }) {
  if (rolling || !winner) {
    return <span className="h-6 text-center text-xs font-medium text-white/50">Dealing…</span>;
  }

  if (winner === "tie") {
    return (
      <div className="flex h-6 items-center gap-1.5 text-sm font-semibold text-white/70">
        <Handshake className="h-4 w-4" />
        It's a tie — every prediction on this round was refunded
      </div>
    );
  }

  return (
    <div className="flex h-6 animate-deal-in items-center gap-1.5 text-sm font-semibold text-amber-300">
      <Trophy className="h-4 w-4" />
      {PLAYER_INFO[winner].label} wins!
    </div>
  );
}
