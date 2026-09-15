import { Handshake, Trophy } from "lucide-react";
import { PlayingCardView } from "@/components/teenpatti/PlayingCardView";
import { HAND_TYPE_INFO, PLAYER_INFO } from "@/types/teenPatti";
import type { HandType, PlayingCard, TeenPattiBet, TeenPattiPlayer, TeenPattiWinner } from "@/types/database";
import { cn } from "@/lib/utils";

interface TeenPattiResultBoardProps {
  roundNumber: number;
  playerACards: PlayingCard[];
  playerBCards: PlayingCard[];
  playerAHandType: HandType | null;
  playerBHandType: HandType | null;
  winner: TeenPattiWinner;
  myBet: TeenPattiBet | null | undefined;
}

/**
 * The dedicated "Result Board" — separate from the live table above it,
 * a recap purely for display once a round is fully settled. All values
 * (cards, hand types, winner, bet outcome) come straight from what the
 * backend already decided; nothing here computes or guesses a result.
 */
export function TeenPattiResultBoard({
  roundNumber,
  playerACards,
  playerBCards,
  playerAHandType,
  playerBHandType,
  winner,
  myBet,
}: TeenPattiResultBoardProps) {
  const matchup =
    winner !== "tie" && playerAHandType && playerBHandType
      ? {
          winning: HAND_TYPE_INFO[winner === "playerA" ? playerAHandType : playerBHandType].label,
          losing: HAND_TYPE_INFO[winner === "playerA" ? playerBHandType : playerAHandType].label,
        }
      : null;

  return (
    <div className="animate-fade-in rounded-2xl border border-amber-400/30 bg-gradient-to-b from-slate-900 to-slate-950 p-4 shadow-lg sm:p-6">
      <div className="mb-4 flex items-center justify-center gap-2">
        <Trophy className="h-4 w-4 text-amber-400" />
        <span className="text-xs font-semibold uppercase tracking-wide text-amber-300">Round #{roundNumber} Result</span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-4">
        <ResultSide player="playerA" cards={playerACards} handType={playerAHandType} winner={winner} />
        <span className="text-lg font-black text-white/25 sm:text-2xl">VS</span>
        <ResultSide player="playerB" cards={playerBCards} handType={playerBHandType} winner={winner} />
      </div>

      <div className="mt-5 flex flex-col items-center gap-1 text-center">
        {winner === "tie" ? (
          <>
            <div className="flex items-center gap-2 text-lg font-extrabold text-white sm:text-xl">
              <Handshake className="h-5 w-5 text-white/70" />
              IT'S A TIE
            </div>
            <p className="text-xs text-white/50">Every prediction on this round was refunded in full.</p>
          </>
        ) : (
          <>
            <div className="animate-deal-in text-lg font-extrabold tracking-wide text-amber-300 sm:text-2xl">
              {PLAYER_INFO[winner].label.toUpperCase()} WINS
            </div>
            {matchup && (
              <p className="text-xs text-white/50 sm:text-sm">
                {matchup.winning} beats {matchup.losing}
              </p>
            )}
          </>
        )}
      </div>

      {myBet && (
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <div>
            <p className="text-[11px] text-white/40">Your Prediction</p>
            <p className="text-sm font-semibold text-white">{PLAYER_INFO[myBet.selected_player].label}</p>
          </div>
          <div>
            <p className="text-[11px] text-white/40">Result</p>
            <p
              className={cn(
                "text-sm font-semibold",
                myBet.status === "won" ? "text-emerald-400" : myBet.status === "lost" ? "text-rose-400" : "text-white/70",
              )}
            >
              {myBet.status === "won" ? "WIN" : myBet.status === "lost" ? "LOSS" : "REFUNDED"}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-white/40">
              {myBet.status === "won" ? "Points Won" : myBet.status === "refunded" ? "Refunded" : "Points Lost"}
            </p>
            <p
              className={cn(
                "text-sm font-bold",
                myBet.status === "won" ? "text-emerald-400" : myBet.status === "lost" ? "text-rose-400" : "text-white/70",
              )}
            >
              {myBet.status === "won"
                ? `+${myBet.payout_amount}`
                : myBet.status === "lost"
                  ? `-${myBet.amount}`
                  : `+${myBet.amount}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultSide({
  player,
  cards,
  handType,
  winner,
}: {
  player: TeenPattiPlayer;
  cards: PlayingCard[];
  handType: HandType | null;
  winner: TeenPattiWinner;
}) {
  const info = PLAYER_INFO[player];
  const isWinner = winner === player;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <p className={cn("text-xs font-bold sm:text-sm", isWinner ? "text-amber-300" : "text-white/70")}>{info.label}</p>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <PlayingCardView key={i} card={cards[i] ?? null} winning={isWinner} />
        ))}
      </div>
      <span className="text-[11px] font-medium text-white/50">{handType ? HAND_TYPE_INFO[handType].label : ""}</span>
    </div>
  );
}
