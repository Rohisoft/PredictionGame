import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const DICE_ICONS: Record<number, LucideIcon> = {
  1: Dice1,
  2: Dice2,
  3: Dice3,
  4: Dice4,
  5: Dice5,
  6: Dice6,
};

interface DiceResultProps {
  diceResult: number | null;
  rolling: boolean;
}

export function DiceResult({ diceResult, rolling }: DiceResultProps) {
  const Icon = diceResult ? DICE_ICONS[diceResult] : Dice1;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          "flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-border bg-card shadow-sm",
          rolling && "animate-dice-roll border-primary",
        )}
      >
        <Icon className={cn("h-12 w-12", diceResult ? "text-primary" : "text-muted-foreground")} />
      </div>
      {!rolling && diceResult && (
        <span className="animate-fade-in text-sm font-medium text-muted-foreground">
          Rolled a {diceResult}
        </span>
      )}
    </div>
  );
}
