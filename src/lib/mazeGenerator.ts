import type { Direction, MazeCell } from "@/types/maze";

const OPPOSITE: Record<Direction, Direction> = { N: "S", S: "N", E: "W", W: "E" };

/**
 * Recursive-backtracking maze generation — produces a "perfect" maze (every
 * cell reachable from every other cell via exactly one path, no loops), so
 * every generated level is guaranteed solvable. Pure client-side Math.random
 * is fine here: this is a single-player puzzle, not a fairness-critical
 * outcome like the prediction games' dice/color rolls.
 */
export function generateMaze(rows: number, cols: number): MazeCell[][] {
  const grid: MazeCell[][] = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => ({
      row,
      col,
      walls: { N: true, E: true, S: true, W: true },
    })),
  );

  const visited = Array.from({ length: rows }, () => new Array<boolean>(cols).fill(false));

  function unvisitedNeighbors(cell: MazeCell): { cell: MazeCell; dir: Direction }[] {
    const { row, col } = cell;
    const options: { cell: MazeCell; dir: Direction }[] = [];
    if (row > 0 && !visited[row - 1][col]) options.push({ cell: grid[row - 1][col], dir: "N" });
    if (col < cols - 1 && !visited[row][col + 1]) options.push({ cell: grid[row][col + 1], dir: "E" });
    if (row < rows - 1 && !visited[row + 1][col]) options.push({ cell: grid[row + 1][col], dir: "S" });
    if (col > 0 && !visited[row][col - 1]) options.push({ cell: grid[row][col - 1], dir: "W" });
    return options;
  }

  const stack: MazeCell[] = [grid[0][0]];
  visited[0][0] = true;

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const options = unvisitedNeighbors(current);

    if (options.length === 0) {
      stack.pop();
      continue;
    }

    const { cell: next, dir } = options[Math.floor(Math.random() * options.length)];
    current.walls[dir] = false;
    next.walls[OPPOSITE[dir]] = false;
    visited[next.row][next.col] = true;
    stack.push(next);
  }

  return grid;
}
