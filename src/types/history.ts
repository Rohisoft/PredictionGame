export type GameKind = "oddEven" | "color" | "teenPatti" | "spin";

export const GAME_KIND_INFO: Record<GameKind, { label: string }> = {
  oddEven: { label: "Odd/Even" },
  color: { label: "Color" },
  teenPatti: { label: "Teen Patti" },
  spin: { label: "Spin & Win" },
};

export const GAME_KIND_ORDER: GameKind[] = ["oddEven", "color", "teenPatti", "spin"];

export type HistoryStatusTone = "success" | "destructive" | "secondary" | "default";

/**
 * One normalized row, regardless of which game it came from. Status is a
 * free-form label + tone rather than the strict Bet status enum, since
 * Spin & Win doesn't have "pending"/"lost" in the same sense a wagered bet
 * does — it's a free spin that either wins a prize or doesn't.
 */
export interface HistoryEntry {
  id: string;
  game: GameKind;
  createdAt: string;
  statusLabel: string;
  statusTone: HistoryStatusTone;
  roundLabel: string;
  pick: string;
  result: string;
  amount: number;
  payoutAmount: number;
}
