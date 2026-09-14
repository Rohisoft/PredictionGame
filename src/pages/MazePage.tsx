import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MazeHeader } from "@/components/maze/MazeHeader";
import { MazeCanvas } from "@/components/maze/MazeCanvas";
import { DifficultySelector } from "@/components/maze/DifficultySelector";
import { GameOverScreen } from "@/components/maze/GameOverScreen";
import { useMazeGame } from "@/hooks/useMazeGame";
import type { Direction } from "@/types/maze";

const SWIPE_THRESHOLD_PX = 24;

export function MazePage() {
  const {
    hydrated,
    difficulty,
    level,
    hearts,
    maze,
    player,
    timeLeft,
    status,
    wallBump,
    startGame,
    move,
    nextLevel,
    restart,
    changeDifficulty,
  } = useMazeGame();

  const [showSettings, setShowSettings] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const levelCompleteToastLevel = useRef<number | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const map: Record<string, Direction> = {
        ArrowUp: "N",
        ArrowDown: "S",
        ArrowLeft: "W",
        ArrowRight: "E",
      };
      const dir = map[e.key];
      if (!dir) return;
      e.preventDefault();
      move(dir);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [move]);

  useEffect(() => {
    if (status === "level-cleared" && levelCompleteToastLevel.current !== level) {
      levelCompleteToastLevel.current = level;
      toast.success(`Level ${level} complete!`);
    }
  }, [status, level]);

  function handleTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;

    if (Math.abs(dx) < SWIPE_THRESHOLD_PX && Math.abs(dy) < SWIPE_THRESHOLD_PX) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      move(dx > 0 ? "E" : "W");
    } else {
      move(dy > 0 ? "S" : "N");
    }
  }

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!difficulty) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Maze</CardTitle>
          </CardHeader>
        </Card>
        <DifficultySelector onSelect={startGame} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <MazeHeader
        level={level}
        timeLeft={timeLeft}
        hearts={hearts}
        difficulty={difficulty}
        onOpenSettings={() => setShowSettings((v) => !v)}
      />

      {showSettings && (
        <DifficultySelector
          current={difficulty}
          onSelect={(diff) => {
            changeDifficulty(diff);
            setShowSettings(false);
          }}
        />
      )}

      {status === "game-over" ? (
        <GameOverScreen level={level} onRestart={restart} />
      ) : (
        <Card>
          <CardContent
            className="flex flex-col items-center gap-4 p-4"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <MazeCanvas maze={maze} player={player} wallBump={wallBump} />

            {status === "level-cleared" ? (
              <Button size="lg" className="w-full" onClick={nextLevel}>
                Next Level
              </Button>
            ) : (
              <p className="text-center text-xs text-muted-foreground">
                Swipe or use the arrow keys to navigate to the flag.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
