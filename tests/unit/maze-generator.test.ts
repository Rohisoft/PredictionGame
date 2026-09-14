import { describe, expect, it } from "vitest";
import { generateMaze } from "@/lib/mazeGenerator";

function isReachable(maze: ReturnType<typeof generateMaze>, rows: number, cols: number): boolean {
  const seen = Array.from({ length: rows }, () => new Array<boolean>(cols).fill(false));
  const stack = [{ row: 0, col: 0 }];
  seen[0][0] = true;
  let count = 1;

  while (stack.length > 0) {
    const { row, col } = stack.pop()!;
    const cell = maze[row][col];

    if (!cell.walls.N && row > 0 && !seen[row - 1][col]) {
      seen[row - 1][col] = true;
      count++;
      stack.push({ row: row - 1, col });
    }
    if (!cell.walls.S && row < rows - 1 && !seen[row + 1][col]) {
      seen[row + 1][col] = true;
      count++;
      stack.push({ row: row + 1, col });
    }
    if (!cell.walls.E && col < cols - 1 && !seen[row][col + 1]) {
      seen[row][col + 1] = true;
      count++;
      stack.push({ row, col: col + 1 });
    }
    if (!cell.walls.W && col > 0 && !seen[row][col - 1]) {
      seen[row][col - 1] = true;
      count++;
      stack.push({ row, col: col - 1 });
    }
  }

  return count === rows * cols;
}

describe("generateMaze", () => {
  it("produces a grid with the requested dimensions", () => {
    const maze = generateMaze(8, 10);
    expect(maze).toHaveLength(8);
    expect(maze[0]).toHaveLength(10);
  });

  it("is always fully solvable — every cell reachable from the start", () => {
    for (let i = 0; i < 20; i++) {
      const maze = generateMaze(10, 12);
      expect(isReachable(maze, 10, 12)).toBe(true);
    }
  });

  it("keeps shared walls consistent between adjacent cells", () => {
    const maze = generateMaze(6, 6);
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 6; col++) {
        const cell = maze[row][col];
        if (col < 5) {
          expect(cell.walls.E).toBe(maze[row][col + 1].walls.W);
        }
        if (row < 5) {
          expect(cell.walls.S).toBe(maze[row + 1][col].walls.N);
        }
      }
    }
  });

  it("puts a wall on every outer boundary edge", () => {
    const maze = generateMaze(5, 7);
    for (let col = 0; col < 7; col++) {
      expect(maze[0][col].walls.N).toBe(true);
      expect(maze[4][col].walls.S).toBe(true);
    }
    for (let row = 0; row < 5; row++) {
      expect(maze[row][0].walls.W).toBe(true);
      expect(maze[row][6].walls.E).toBe(true);
    }
  });
});
