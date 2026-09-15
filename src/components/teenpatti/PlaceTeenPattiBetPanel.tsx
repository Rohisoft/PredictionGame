import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { HandTypeSelector } from "@/components/teenpatti/HandTypeSelector";
import { StakeSelector } from "@/components/game/StakeSelector";
import { usePlaceTeenPattiBet } from "@/hooks/usePlaceTeenPattiBet";
import { HAND_TYPE_INFO } from "@/types/teenPatti";
import type { HandType, TeenPattiBet } from "@/types/database";
import type { StakeAmount } from "@/types/game";
import { cn } from "@/lib/utils";

interface PlaceTeenPattiBetPanelProps {
  roundId: string;
  disabled: boolean;
  existingBet: TeenPattiBet | null | undefined;
}

export function PlaceTeenPattiBetPanel({ roundId, disabled, existingBet }: PlaceTeenPattiBetPanelProps) {
  const [handType, setHandType] = useState<HandType | null>(null);
  const [stake, setStake] = useState<StakeAmount | null>(null);
  const placeBet = usePlaceTeenPattiBet();

  if (existingBet) {
    return (
      <div className="rounded-xl border border-primary/30 bg-accent p-4 text-center">
        <p className="text-sm text-muted-foreground">Your prediction this round</p>
        <p className="mt-1 text-lg font-bold text-accent-foreground">
          {existingBet.amount} pts on {HAND_TYPE_INFO[existingBet.selected_hand_type].label}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Good luck — results drop soon.</p>
      </div>
    );
  }

  async function handlePlaceBet() {
    if (!handType || !stake) {
      toast.error("Pick a hand type and how many points first");
      return;
    }
    try {
      await placeBet.mutateAsync({ roundId, selectedHandType: handType, amount: stake });
      toast.success(`Prediction submitted: ${stake} pts on ${HAND_TYPE_INFO[handType].label}`);
      setHandType(null);
      setStake(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not submit prediction";
      toast.error(message);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium">Choose a hand type</p>
        <HandTypeSelector value={handType} onChange={setHandType} disabled={disabled} />
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Choose your points</p>
        <StakeSelector value={stake} onChange={setStake} disabled={disabled} />
      </div>
      <Button
        className={cn("w-full")}
        size="lg"
        disabled={disabled || !handType || !stake || placeBet.isPending}
        onClick={handlePlaceBet}
      >
        {placeBet.isPending ? "Submitting…" : disabled ? "Predictions closed" : "Submit Prediction"}
      </Button>
    </div>
  );
}
