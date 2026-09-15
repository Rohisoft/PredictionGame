import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyBetHistory } from "@/hooks/useMyBets";
import { useMyColorBetHistory } from "@/hooks/useMyColorBets";
import { useMyTeenPattiBetHistory } from "@/hooks/useMyTeenPattiBets";
import { useWalletTransactions } from "@/hooks/useWallet";
import { PLAYER_INFO } from "@/types/teenPatti";
import { GAME_KIND_INFO, GAME_KIND_ORDER, type GameKind, type HistoryEntry, type HistoryStatusTone } from "@/types/history";
import { formatDateTime, formatPoints, cn } from "@/lib/utils";
import type { BetStatus } from "@/types/database";

const STATUS_TONE: Record<BetStatus, HistoryStatusTone> = {
  pending: "secondary",
  won: "success",
  lost: "destructive",
  refunded: "default",
};

export function HistoryPage() {
  const { data: oddEvenBets, isLoading: oddEvenLoading } = useMyBetHistory(50);
  const { data: colorBets, isLoading: colorLoading } = useMyColorBetHistory(50);
  const { data: teenPattiBets, isLoading: teenPattiLoading } = useMyTeenPattiBetHistory(50);
  const { data: transactions, isLoading: transactionsLoading } = useWalletTransactions();

  const [filter, setFilter] = useState<GameKind | "all">("all");

  const isLoading = oddEvenLoading || colorLoading || teenPattiLoading || transactionsLoading;

  const entries = useMemo<HistoryEntry[]>(() => {
    const rows: HistoryEntry[] = [];

    for (const bet of oddEvenBets ?? []) {
      rows.push({
        id: `oddEven-${bet.id}`,
        game: "oddEven",
        createdAt: bet.created_at,
        statusLabel: bet.status,
        statusTone: STATUS_TONE[bet.status],
        roundLabel: bet.game_rounds ? `Round #${bet.game_rounds.round_number}` : "—",
        pick: bet.selected_side === "odd" ? "Odd" : "Even",
        result:
          bet.game_rounds?.dice_result != null
            ? `${bet.game_rounds.dice_result} (${bet.game_rounds.winning_side === "odd" ? "Odd" : "Even"})`
            : "—",
        amount: bet.amount,
        payoutAmount: bet.payout_amount,
      });
    }

    for (const bet of colorBets ?? []) {
      rows.push({
        id: `color-${bet.id}`,
        game: "color",
        createdAt: bet.created_at,
        statusLabel: bet.status,
        statusTone: STATUS_TONE[bet.status],
        roundLabel: bet.color_rounds ? `Round #${bet.color_rounds.round_number}` : "—",
        pick: bet.selected_color === "red" ? "Red" : "Green",
        result: bet.color_rounds?.winning_color ? (bet.color_rounds.winning_color === "red" ? "Red" : "Green") : "—",
        amount: bet.amount,
        payoutAmount: bet.payout_amount,
      });
    }

    for (const bet of teenPattiBets ?? []) {
      rows.push({
        id: `teenPatti-${bet.id}`,
        game: "teenPatti",
        createdAt: bet.created_at,
        statusLabel: bet.status,
        statusTone: STATUS_TONE[bet.status],
        roundLabel: bet.teen_patti_rounds ? `Round #${bet.teen_patti_rounds.round_number}` : "—",
        pick: PLAYER_INFO[bet.selected_player].label,
        result: bet.teen_patti_rounds?.winner
          ? bet.teen_patti_rounds.winner === "tie"
            ? "Tie"
            : PLAYER_INFO[bet.teen_patti_rounds.winner].label
          : "—",
        amount: bet.amount,
        payoutAmount: bet.payout_amount,
      });
    }

    for (const tx of transactions ?? []) {
      if (tx.transaction_type !== "bonus") continue;
      rows.push({
        id: `spin-${tx.id}`,
        game: "spin",
        createdAt: tx.created_at,
        statusLabel: tx.amount > 0 ? "Prize won" : "No prize",
        statusTone: tx.amount > 0 ? "success" : "secondary",
        roundLabel: "Daily spin",
        pick: "—",
        result: "—",
        amount: 0,
        payoutAmount: tx.amount,
      });
    }

    return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [oddEvenBets, colorBets, teenPattiBets, transactions]);

  const filteredEntries = filter === "all" ? entries : entries.filter((entry) => entry.game === filter);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <h1 className="text-xl font-bold">Game history</h1>

      <div className="flex flex-wrap gap-2">
        <FilterChip label="All games" active={filter === "all"} onClick={() => setFilter("all")} />
        {GAME_KIND_ORDER.map((kind) => (
          <FilterChip key={kind} label={GAME_KIND_INFO[kind].label} active={filter === kind} onClick={() => setFilter(kind)} />
        ))}
      </div>

      {filteredEntries.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {filter === "all"
              ? "You haven't made a prediction yet — head to a game page to get started."
              : `No ${GAME_KIND_INFO[filter as GameKind].label} history yet.`}
          </CardContent>
        </Card>
      )}

      {filteredEntries.map((entry) => (
        <Card key={entry.id}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <Badge variant="outline">{GAME_KIND_INFO[entry.game].label}</Badge>
              <CardTitle className="text-base">{entry.roundLabel}</CardTitle>
            </div>
            <Badge variant={entry.statusTone}>{entry.statusLabel}</Badge>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Your pick</p>
              <p className="font-medium">{entry.pick}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Points</p>
              <p className="font-medium">{entry.amount > 0 ? `${formatPoints(entry.amount)} pts` : "Free"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Result</p>
              <p className="font-medium">{entry.result}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Payout</p>
              <p className={cn("font-medium", entry.payoutAmount > 0 ? "text-success" : "text-muted-foreground")}>
                {entry.payoutAmount > 0 ? `+${formatPoints(entry.payoutAmount)} pts` : "—"}
              </p>
            </div>
          </CardContent>
          <CardContent className="pt-0 text-xs text-muted-foreground">Placed {formatDateTime(entry.createdAt)}</CardContent>
        </Card>
      ))}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/40",
      )}
    >
      {label}
    </button>
  );
}
