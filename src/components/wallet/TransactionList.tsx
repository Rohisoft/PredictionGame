import { ArrowDownCircle, ArrowUpCircle, Gift, RotateCcw, ShieldPlus, Sparkles } from "lucide-react";
import { useWalletTransactions } from "@/hooks/useWallet";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatPoints, cn } from "@/lib/utils";
import type { TransactionType } from "@/types/database";

const TYPE_META: Record<TransactionType, { label: string; icon: typeof ArrowDownCircle; credit: boolean }> = {
  deposit: { label: "Deposit", icon: ArrowDownCircle, credit: true },
  withdrawal: { label: "Withdrawal", icon: ArrowUpCircle, credit: false },
  bet: { label: "Prediction placed", icon: ArrowUpCircle, credit: false },
  payout: { label: "Payout", icon: Gift, credit: true },
  refund: { label: "Refund", icon: RotateCcw, credit: true },
  adjustment: { label: "Admin adjustment", icon: ShieldPlus, credit: true },
  bonus: { label: "Spin & Win bonus", icon: Sparkles, credit: true },
};

export function TransactionList() {
  const { data: transactions, isLoading } = useWalletTransactions();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return <p className="text-sm text-muted-foreground">No transactions yet.</p>;
  }

  return (
    <div className="divide-y divide-border">
      {transactions.map((tx) => {
        const meta = TYPE_META[tx.transaction_type];
        const Icon = meta.icon;
        const credit = tx.amount >= 0;
        return (
          <div key={tx.id} className="flex items-center gap-3 py-3">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full",
                credit ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{meta.label}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(tx.created_at)}</p>
            </div>
            <div className="text-right">
              <p className={cn("text-sm font-semibold", credit ? "text-success" : "text-destructive")}>
                {credit ? "+" : ""}
                {formatPoints(tx.amount)}
              </p>
              <Badge variant="outline">{formatPoints(tx.balance_after)} pts</Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}
