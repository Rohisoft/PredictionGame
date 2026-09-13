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

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  is_admin: boolean;
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
 * Hand-written row types for the Postgres schema (see supabase/migrations).
 *
 * These are intentionally NOT wired up as the generic parameter to
 * `createClient<Database>()` — the postgrest-js version pulled in here
 * requires the schema to structurally satisfy its internal `GenericSchema`
 * constraint, which plain hand-written interfaces don't reliably do across
 * versions. Instead, the Supabase client is untyped and each query/RPC call
 * site applies `.returns<T>()` (or a cast for `rpc()`) with the types below
 * — same safety at the call site, without fighting the generic.
 */
