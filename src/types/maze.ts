export type Difficulty = "easy" | "medium" | "hard";

export type Direction = "N" | "E" | "S" | "W";

export interface MazeCell {
  row: number;
  col: number;
  walls: Record<Direction, boolean>;
}

export interface DifficultySettings {
  rows: number;
  cols: number;
  timerSeconds: number;
  label: string;
}

export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySettings> = {
  easy: { rows: 8, cols: 10, timerSeconds: 30, label: "Easy" },
  medium: { rows: 12, cols: 15, timerSeconds: 20, label: "Medium" },
  hard: { rows: 16, cols: 20, timerSeconds: 15, label: "Hard" },
};

export const WALL_HIT_PENALTY_SECONDS = 2;
export const STARTING_HEARTS = 3;

export interface MazeProgress {
  difficulty: Difficulty;
  level: number;
  hearts: number;
}
