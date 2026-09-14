import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ColorSelector } from "@/components/color/ColorSelector";
import { StakeSelector } from "@/components/game/StakeSelector";
import { usePlaceColorBet } from "@/hooks/usePlaceColorBet";
import type { Color, ColorBet } from "@/types/database";
import type { StakeAmount } from "@/types/game";
import { cn } from "@/lib/utils";

const COLOR_LABEL: Record<Color, string> = { red: "Red", green: "Green" };

interface PlaceColorBetPanelProps {
  roundId: string;
  disabled: boolean;
  existingBet: ColorBet | null | undefined;
}

export function PlaceColorBetPanel({ roundId, disabled, existingBet }: PlaceColorBetPanelProps) {
  const [color, setColor] = useState<Color | null>(null);
  const [stake, setStake] = useState<StakeAmount | null>(null);
  const placeBet = usePlaceColorBet();

  if (existingBet) {
    return (
      <div className="rounded-xl border border-primary/30 bg-accent p-4 text-center">
        <p className="text-sm text-muted-foreground">Your prediction this round</p>
        <p className="mt-1 text-lg font-bold text-accent-foreground">
          {existingBet.amount} pts on {COLOR_LABEL[existingBet.selected_color]}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Good luck — results drop soon.</p>
      </div>
    );
  }

  async function handlePlaceBet() {
    if (!color || !stake) {
      toast.error("Pick a color and how many points first");
      return;
    }
    try {
      await placeBet.mutateAsync({ roundId, selectedColor: color, amount: stake });
      toast.success(`Prediction submitted: ${stake} pts on ${COLOR_LABEL[color]}`);
      setColor(null);
      setStake(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not submit prediction";
      toast.error(message);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium">Choose a color</p>
        <ColorSelector value={color} onChange={setColor} disabled={disabled} />
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Choose your points</p>
        <StakeSelector value={stake} onChange={setStake} disabled={disabled} />
      </div>
      <Button
        className={cn("w-full")}
        size="lg"
        disabled={disabled || !color || !stake || placeBet.isPending}
        onClick={handlePlaceBet}
      >
        {placeBet.isPending ? "Submitting…" : disabled ? "Predictions closed" : "Submit Prediction"}
      </Button>
    </div>
  );
}
