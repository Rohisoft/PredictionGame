import { useAdminUserTransactions } from "@/hooks/useAdmin";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatPoints, cn } from "@/lib/utils";

export function UserActivity({ userId }: { userId: string }) {
  const { data: transactions, isLoading } = useAdminUserTransactions(userId);

  if (isLoading) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return <p className="text-xs text-muted-foreground">No activity yet.</p>;
  }

  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {transactions.map((tx) => (
        <div key={tx.id} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
          <div>
            <p className="font-medium capitalize">{tx.transaction_type}</p>
            <p className="text-muted-foreground">{formatDateTime(tx.created_at)}</p>
          </div>
          <p className={cn("font-semibold", tx.amount >= 0 ? "text-success" : "text-destructive")}>
            {tx.amount >= 0 ? "+" : ""}
            {formatPoints(tx.amount)} pts
          </p>
        </div>
      ))}
    </div>
  );
}
