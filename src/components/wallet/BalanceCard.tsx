import { Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useWallet } from "@/hooks/useWallet";
import { formatPoints } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function BalanceCard() {
  const { data: wallet, isLoading } = useWallet();

  return (
    <Card className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
      <CardContent className="flex items-center justify-between p-6">
        <div>
          <p className="text-sm opacity-80">Current balance</p>
          {isLoading ? (
            <Skeleton className="mt-2 h-9 w-32 bg-white/20" />
          ) : (
            <p className="mt-1 text-3xl font-bold">{formatPoints(wallet?.balance ?? 0)} pts</p>
          )}
        </div>
        <Wallet className="h-10 w-10 opacity-70" />
      </CardContent>
    </Card>
  );
}
