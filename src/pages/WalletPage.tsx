import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BalanceCard } from "@/components/wallet/BalanceCard";
import { TransactionList } from "@/components/wallet/TransactionList";

export function WalletPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <BalanceCard />
      <Card>
        <CardHeader>
          <CardTitle>Transaction history</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionList />
        </CardContent>
      </Card>
      <p className="text-center text-xs text-muted-foreground">
        This wallet holds virtual points only — there is no real-money deposit or withdrawal.
        Points are credited by an administrator.
      </p>
    </div>
  );
}
