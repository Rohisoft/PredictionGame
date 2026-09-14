import { Heart, Settings, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DIFFICULTY_SETTINGS, STARTING_HEARTS, type Difficulty } from "@/types/maze";
import { cn } from "@/lib/utils";

interface MazeHeaderProps {
  level: number;
  timeLeft: number;
  hearts: number;
  difficulty: Difficulty;
  onOpenSettings: () => void;
}

export function MazeHeader({ level, timeLeft, hearts, difficulty, onOpenSettings }: MazeHeaderProps) {
  const totalTime = DIFFICULTY_SETTINGS[difficulty].timerSeconds;
  const lowTime = timeLeft <= Math.min(5, totalTime);

  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-1.5">
        <Timer className={cn("h-4 w-4", lowTime ? "text-destructive" : "text-muted-foreground")} />
        <span className={cn("font-mono text-sm font-semibold", lowTime && "text-destructive")}>{timeLeft}s</span>
      </div>

      <div className="text-center">
        <p className="text-sm font-bold">Level {level}</p>
        <div className="mt-0.5 flex items-center justify-center gap-0.5">
          {Array.from({ length: STARTING_HEARTS }).map((_, i) => (
            <Heart
              key={i}
              className={cn("h-4 w-4", i < hearts ? "fill-destructive text-destructive" : "text-muted-foreground/30")}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="outline" className="hidden sm:inline-flex">
          {DIFFICULTY_SETTINGS[difficulty].label}
        </Badge>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Change difficulty"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
