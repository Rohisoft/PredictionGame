import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SideSelector } from "@/components/game/SideSelector";
import { StakeSelector } from "@/components/game/StakeSelector";
import { usePlaceBet } from "@/hooks/usePlaceBet";
import { useWallet } from "@/hooks/useWallet";
import type { Bet, Side } from "@/types/database";
import type { StakeAmount } from "@/types/game";
import { cn, formatPoints } from "@/lib/utils";

const SIDE_LABEL: Record<Side, string> = { odd: "Odd", even: "Even" };

interface PlaceBetPanelProps {
  roundId: string;
  disabled: boolean;
  existingBet: Bet | null | undefined;
}

export function PlaceBetPanel({ roundId, disabled, existingBet }: PlaceBetPanelProps) {
  const [side, setSide] = useState<Side | null>(null);
  const [stake, setStake] = useState<StakeAmount | null>(null);
  const placeBet = usePlaceBet();
  const { data: wallet } = useWallet();

  async function handlePlaceBet() {
    if (!side || !stake) {
      toast.error("Pick a side and how many points first");
      return;
    }
    try {
      await placeBet.mutateAsync({ roundId, selectedSide: side, amount: stake });
      toast.success(`Prediction submitted: ${stake} pts on ${SIDE_LABEL[side]}`);
      setSide(null);
      setStake(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not submit prediction";
      toast.error(message);
    }
  }

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
            {existingBet.amount} pts on {SIDE_LABEL[existingBet.selected_side]}
          </p>
          <p className="mt-1 text-xs text-white/40">Good luck — results drop soon.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-white/70">Choose a Side</p>
            <SideSelector value={side} onChange={setSide} disabled={disabled} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-white/70">Choose Your Bet</p>
            <StakeSelector value={stake} onChange={setStake} disabled={disabled} />
          </div>

          {(side || stake) && (
            <div className="flex items-center justify-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/60">
              <span>
                {side ? SIDE_LABEL[side] : "No side selected"}
                {" · "}
                {stake ? `${stake} pts` : "No bet selected"}
              </span>
            </div>
          )}

          <Button
            className="w-full bg-amber-400 text-slate-950 hover:bg-amber-300"
            size="lg"
            disabled={disabled || !side || !stake || placeBet.isPending}
            onClick={handlePlaceBet}
          >
            {placeBet.isPending ? "Submitting…" : disabled ? "Predictions closed" : "Place Bet"}
          </Button>
        </div>
      )}
    </div>
  );
}
