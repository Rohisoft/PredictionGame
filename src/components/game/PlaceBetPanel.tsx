import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SideSelector } from "@/components/game/SideSelector";
import { StakeSelector } from "@/components/game/StakeSelector";
import { usePlaceBet } from "@/hooks/usePlaceBet";
import type { Bet, Side } from "@/types/database";
import type { StakeAmount } from "@/types/game";
import { cn } from "@/lib/utils";

interface PlaceBetPanelProps {
  roundId: string;
  disabled: boolean;
  existingBet: Bet | null | undefined;
}

export function PlaceBetPanel({ roundId, disabled, existingBet }: PlaceBetPanelProps) {
  const [side, setSide] = useState<Side | null>(null);
  const [stake, setStake] = useState<StakeAmount | null>(null);
  const placeBet = usePlaceBet();

  if (existingBet) {
    return (
      <div className="rounded-xl border border-primary/30 bg-accent p-4 text-center">
        <p className="text-sm text-muted-foreground">Your bet this round</p>
        <p className="mt-1 text-lg font-bold text-accent-foreground">
          {existingBet.amount} pts on {existingBet.selected_side === "odd" ? "Odd" : "Even"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Good luck — results drop soon.</p>
      </div>
    );
  }

  async function handlePlaceBet() {
    if (!side || !stake) {
      toast.error("Pick a side and a stake amount first");
      return;
    }
    try {
      await placeBet.mutateAsync({ roundId, selectedSide: side, amount: stake });
      toast.success(`Bet placed: ${stake} pts on ${side === "odd" ? "Odd" : "Even"}`);
      setSide(null);
      setStake(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not place bet";
      toast.error(message);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium">Choose a side</p>
        <SideSelector value={side} onChange={setSide} disabled={disabled} />
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Choose your stake</p>
        <StakeSelector value={stake} onChange={setStake} disabled={disabled} />
      </div>
      <Button
        className={cn("w-full")}
        size="lg"
        disabled={disabled || !side || !stake || placeBet.isPending}
        onClick={handlePlaceBet}
      >
        {placeBet.isPending
          ? "Placing bet…"
          : disabled
            ? "Betting closed"
            : "Place Bet"}
      </Button>
    </div>
  );
}
