export type TransactionType =
  | "deposit"
  | "withdrawal"
  | "bet"
  | "payout"
  | "refund"
  | "adjustment";

export type RoundStatus = "betting" | "locked" | "completed" | "cancelled";

export type Side = "odd" | "even";

export type BetStatus = "pending" | "won" | "lost" | "refunded";

export type Role = "user" | "admin" | "superadmin";

export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: Role;
  is_admin: boolean;
  is_super_admin: boolean;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  wallet_id: string;
  transaction_type: TransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  reference_id: string | null;
  description: string | null;
  created_at: string;
}

export interface GameRound {
  id: string;
  round_number: number;
  status: RoundStatus;
  betting_start_time: string;
  betting_end_time: string;
  result_time: string;
  dice_result: number | null;
  winning_side: Side | null;
  created_at: string;
  completed_at: string | null;
}

export interface Bet {
  id: string;
  user_id: string;
  round_id: string;
  selected_side: Side;
  amount: number;
  status: BetStatus;
  payout_amount: number;
  created_at: string;
  settled_at: string | null;
}

/**
 * These types describe the JSON shape returned by the Node/MongoDB API in
 * `server/` — see each Mongoose model's `toJSON` transform (e.g.
 * `server/src/models/GameRound.ts`), which deliberately serializes to this
 * exact snake_case shape rather than Mongo's native camelCase/`_id`.
 */
