import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PlayerSelector } from "@/components/teenpatti/PlayerSelector";
import { StakeSelector } from "@/components/game/StakeSelector";
import { usePlaceTeenPattiBet } from "@/hooks/usePlaceTeenPattiBet";
import { useWallet } from "@/hooks/useWallet";
import { PLAYER_INFO } from "@/types/teenPatti";
import type { TeenPattiBet, TeenPattiPlayer } from "@/types/database";
import type { StakeAmount } from "@/types/game";
import { cn, formatPoints } from "@/lib/utils";

interface PlaceTeenPattiBetPanelProps {
  roundId: string;
  disabled: boolean;
  existingBet: TeenPattiBet | null | undefined;
}

export function PlaceTeenPattiBetPanel({ roundId, disabled, existingBet }: PlaceTeenPattiBetPanelProps) {
  const [player, setPlayer] = useState<TeenPattiPlayer | null>(null);
  const [stake, setStake] = useState<StakeAmount | null>(null);
  const placeBet = usePlaceTeenPattiBet();
  const { data: wallet } = useWallet();

  return (
    <div className="rounded-2xl border border-indigo-900/40 bg-gradient-to-b from-slate-900 to-slate-950 p-4 shadow-lg sm:p-5">
      <div className="mb-4 flex items-center justify-between text-xs">
        <span className="text-white/50">
          Balance: <span className="font-bold text-white">{formatPoints(wallet?.balance ?? 0)} pts</span>
        </span>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 font-semibold",
            disabled ? "bg-rose-400/15 text-rose-400" : "bg-emerald-400/15 text-emerald-400",
          )}
        >
          {disabled ? "Betting Closed" : "Betting Open"}
        </span>
      </div>

      {existingBet ? (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-center">
          <p className="text-xs text-white/50">Your prediction this round</p>
          <p className="mt-1 text-lg font-bold text-amber-300">
            {existingBet.amount} pts on {PLAYER_INFO[existingBet.selected_player].label}
          </p>
          <p className="mt-1 text-xs text-white/40">Good luck — results drop soon.</p>
        </div>
      ) : (
        <PlaceTeenPattiBetForm
          roundId={roundId}
          disabled={disabled}
          player={player}
          stake={stake}
          onPlayerChange={setPlayer}
          onStakeChange={setStake}
          placeBet={placeBet}
          onSubmitted={() => {
            setPlayer(null);
            setStake(null);
          }}
        />
      )}
    </div>
  );
}

interface PlaceTeenPattiBetFormProps {
  roundId: string;
  disabled: boolean;
  player: TeenPattiPlayer | null;
  stake: StakeAmount | null;
  onPlayerChange: (player: TeenPattiPlayer) => void;
  onStakeChange: (stake: StakeAmount) => void;
  placeBet: ReturnType<typeof usePlaceTeenPattiBet>;
  onSubmitted: () => void;
}

function PlaceTeenPattiBetForm({
  roundId,
  disabled,
  player,
  stake,
  onPlayerChange,
  onStakeChange,
  placeBet,
  onSubmitted,
}: PlaceTeenPattiBetFormProps) {
  async function handlePlaceBet() {
    if (!player || !stake) {
      toast.error("Pick Player A or Player B, and how many points, first");
      return;
    }
    try {
      await placeBet.mutateAsync({ roundId, selectedPlayer: player, amount: stake });
      toast.success(`Prediction submitted: ${stake} pts on ${PLAYER_INFO[player].label}`);
      onSubmitted();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not submit prediction";
      toast.error(message);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium text-white/70">Choose Your Player</p>
        <PlayerSelector value={player} onChange={onPlayerChange} disabled={disabled} />
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-white/70">Choose Your Bet</p>
        <StakeSelector value={stake} onChange={onStakeChange} disabled={disabled} />
      </div>

      {(player || stake) && (
        <div className="flex items-center justify-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/60">
          <span>
            {player ? PLAYER_INFO[player].label : "No player selected"}
            {" · "}
            {stake ? `${stake} pts` : "No bet selected"}
          </span>
        </div>
      )}

      <Button
        className="w-full bg-amber-400 text-slate-950 hover:bg-amber-300"
        size="lg"
        disabled={disabled || !player || !stake || placeBet.isPending}
        onClick={handlePlaceBet}
      >
        {placeBet.isPending ? "Submitting…" : disabled ? "Predictions closed" : "Place Bet"}
      </Button>
    </div>
  );
}
