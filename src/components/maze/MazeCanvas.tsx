import { Flag } from "lucide-react";
import type { MazeCell } from "@/types/maze";
import { cn } from "@/lib/utils";

const CELL = 32;
const STROKE = 3;

interface Position {
  row: number;
  col: number;
}

interface MazeCanvasProps {
  maze: MazeCell[][];
  player: Position;
  wallBump: number;
}

export function MazeCanvas({ maze, player, wallBump }: MazeCanvasProps) {
  const rows = maze.length;
  const cols = maze[0]?.length ?? 0;
  if (rows === 0 || cols === 0) return null;

  const width = cols * CELL;
  const height = rows * CELL;

  const lines: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
  for (const row of maze) {
    for (const cell of row) {
      const x = cell.col * CELL;
      const y = cell.row * CELL;
      if (cell.walls.N) lines.push({ x1: x, y1: y, x2: x + CELL, y2: y, key: `${cell.row}-${cell.col}-N` });
      if (cell.walls.W) lines.push({ x1: x, y1: y, x2: x, y2: y + CELL, key: `${cell.row}-${cell.col}-W` });
      if (cell.walls.S) lines.push({ x1: x, y1: y + CELL, x2: x + CELL, y2: y + CELL, key: `${cell.row}-${cell.col}-S` });
      if (cell.walls.E) lines.push({ x1: x + CELL, y1: y, x2: x + CELL, y2: y + CELL, key: `${cell.row}-${cell.col}-E` });
    }
  }

  const playerCx = player.col * CELL + CELL / 2;
  const playerCy = player.row * CELL + CELL / 2;
  const finishCx = (cols - 1) * CELL + CELL / 2;
  const finishCy = (rows - 1) * CELL + CELL / 2;

  return (
    // Keyed by wallBump so the wrapper remounts on every wall hit — a plain
    // class toggle wouldn't retrigger the CSS animation on consecutive bumps
    // since the class string never actually changes value.
    <div key={wallBump} className={cn(wallBump > 0 && "animate-[maze-shake_150ms]")}>
      <svg
        viewBox={`-2 -2 ${width + 4} ${height + 4}`}
        className="w-full max-w-full touch-none select-none"
        role="img"
        aria-label="Maze"
      >
        {lines.map((line) => (
          <line
            key={line.key}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="#1e2a4a"
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
        ))}

        <foreignObject x={finishCx - 10} y={finishCy - 10} width={20} height={20}>
          <div className="flex h-5 w-5 items-center justify-center text-amber-500">
            <Flag className="h-4 w-4" fill="currentColor" />
          </div>
        </foreignObject>

        <circle
          r={CELL / 3.2}
          fill="hsl(var(--primary))"
          style={{
            transform: `translate(${playerCx}px, ${playerCy}px)`,
            transition: "transform 120ms ease-out",
          }}
        />
      </svg>
    </div>
  );
}
