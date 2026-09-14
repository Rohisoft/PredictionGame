import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DIFFICULTY_SETTINGS, type Difficulty } from "@/types/maze";
import { cn } from "@/lib/utils";

const ORDER: Difficulty[] = ["easy", "medium", "hard"];

interface DifficultySelectorProps {
  current?: Difficulty | null;
  onSelect: (difficulty: Difficulty) => void;
}

export function DifficultySelector({ current, onSelect }: DifficultySelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose a difficulty</CardTitle>
        <CardDescription>Harder mazes give you less time, but every maze is always solvable.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {ORDER.map((diff) => {
          const settings = DIFFICULTY_SETTINGS[diff];
          return (
            <button
              key={diff}
              type="button"
              onClick={() => onSelect(diff)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border-2 p-4 text-center transition-all hover:border-primary/40",
                current === diff ? "border-primary bg-accent shadow-md" : "border-border bg-card",
              )}
            >
              <span className="text-base font-bold">{settings.label}</span>
              <span className="text-xs text-muted-foreground">
                {settings.rows}×{settings.cols} maze
              </span>
              <span className="text-xs text-muted-foreground">{settings.timerSeconds}s per level</span>
            </button>
          );
        })}
      </CardContent>
      {current && (
        <CardContent className="pt-0">
          <Button variant="outline" className="w-full" onClick={() => onSelect(current)}>
            Restart at {DIFFICULTY_SETTINGS[current].label}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
