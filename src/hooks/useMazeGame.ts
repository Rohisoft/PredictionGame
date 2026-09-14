import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { generateMaze } from "@/lib/mazeGenerator";
import {
  DIFFICULTY_SETTINGS,
  STARTING_HEARTS,
  WALL_HIT_PENALTY_SECONDS,
  type Difficulty,
  type Direction,
  type MazeCell,
  type MazeProgress,
} from "@/types/maze";

export type GameStatus = "playing" | "level-cleared" | "game-over";

interface Position {
  row: number;
  col: number;
}

function storageKey(userId: string) {
  return `maze-progress:${userId}`;
}

function loadProgress(userId: string): MazeProgress | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MazeProgress;
    if (!parsed.difficulty || typeof parsed.level !== "number" || typeof parsed.hearts !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveProgress(userId: string, progress: MazeProgress) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(progress));
  } catch {
    // Storage unavailable (private browsing, quota) — the game still works,
    // it just won't remember progress across reloads.
  }
}

export function useMazeGame() {
  const { user } = useAuth();
  const userId = user?.id ?? "anon";

  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [level, setLevel] = useState(1);
  const [hearts, setHearts] = useState(STARTING_HEARTS);
  const [maze, setMaze] = useState<MazeCell[][]>([]);
  const [player, setPlayer] = useState<Position>({ row: 0, col: 0 });
  const [timeLeft, setTimeLeft] = useState(0);
  const [status, setStatus] = useState<GameStatus>("playing");
  const [wallBump, setWallBump] = useState(0); // increments to trigger a one-off "shake" animation
  const [hydrated, setHydrated] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Hydrate saved progress once we know who's playing.
  useEffect(() => {
    const saved = loadProgress(userId);
    if (saved) {
      setDifficulty(saved.difficulty);
      setLevel(saved.level);
      setHearts(saved.hearts);
    }
    setHydrated(true);
  }, [userId]);

  const finish = useCallback(
    (rows: number, cols: number): Position => ({ row: rows - 1, col: cols - 1 }),
    [],
  );

  const newMaze = useCallback((diff: Difficulty) => {
    const { rows, cols, timerSeconds } = DIFFICULTY_SETTINGS[diff];
    setMaze(generateMaze(rows, cols));
    setPlayer({ row: 0, col: 0 });
    setTimeLeft(timerSeconds);
    setStatus("playing");
  }, []);

  const startGame = useCallback(
    (diff: Difficulty) => {
      setDifficulty(diff);
      setLevel(1);
      setHearts(STARTING_HEARTS);
      newMaze(diff);
      saveProgress(userId, { difficulty: diff, level: 1, hearts: STARTING_HEARTS });
    },
    [newMaze, userId],
  );

  // Countdown timer — only while actively playing a level.
  useEffect(() => {
    if (!difficulty || status !== "playing") return;

    timerRef.current = setInterval(() => {
      setTimeLeft((current) => (current > 0 ? current - 1 : current));
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [difficulty, status]);

  // Timer hit zero: lose a heart, then either game over or a fresh attempt.
  useEffect(() => {
    if (status !== "playing" || timeLeft > 0 || !difficulty) return;

    setHearts((current) => {
      const next = Math.max(0, current - 1);
      saveProgress(userId, { difficulty, level, hearts: next });
      if (next <= 0) {
        setStatus("game-over");
      } else {
        newMaze(difficulty);
      }
      return next;
    });
  }, [timeLeft, status, difficulty, level, newMaze, userId]);

  const move = useCallback(
    (dir: Direction) => {
      if (!difficulty || status !== "playing" || maze.length === 0) return;

      const cell = maze[player.row]?.[player.col];
      if (!cell) return;

      if (cell.walls[dir]) {
        // Hit a wall — small time penalty, no position change.
        setTimeLeft((current) => Math.max(0, current - WALL_HIT_PENALTY_SECONDS));
        setWallBump((n) => n + 1);
        return;
      }

      const delta: Record<Direction, Position> = {
        N: { row: -1, col: 0 },
        S: { row: 1, col: 0 },
        E: { row: 0, col: 1 },
        W: { row: 0, col: -1 },
      };

      const next = { row: player.row + delta[dir].row, col: player.col + delta[dir].col };
      setPlayer(next);

      const { rows, cols } = DIFFICULTY_SETTINGS[difficulty];
      const target = finish(rows, cols);
      if (next.row === target.row && next.col === target.col) {
        setStatus("level-cleared");
      }
    },
    [difficulty, status, maze, player, finish],
  );

  const nextLevel = useCallback(() => {
    if (!difficulty) return;
    const newLevel = level + 1;
    setLevel(newLevel);
    newMaze(difficulty);
    saveProgress(userId, { difficulty, level: newLevel, hearts });
  }, [difficulty, level, hearts, newMaze, userId]);

  const restart = useCallback(() => {
    if (!difficulty) return;
    startGame(difficulty);
  }, [difficulty, startGame]);

  const changeDifficulty = useCallback(
    (diff: Difficulty) => {
      startGame(diff);
    },
    [startGame],
  );

  return {
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
  };
}
