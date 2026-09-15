import { Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useWallet } from "@/hooks/useWallet";
import { formatPoints } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function BalanceCard() {
  const { data: wallet, isLoading } = useWallet();

  return (
    <Card className="border-amber-400/30 bg-gradient-to-br from-slate-900 to-slate-950 text-white shadow-lg">
      <CardContent className="flex items-center justify-between p-6">
        <div>
          <p className="text-sm text-white/50">Current balance</p>
          {isLoading ? (
            <Skeleton className="mt-2 h-9 w-32 bg-white/10" />
          ) : (
            <p className="mt-1 text-3xl font-bold text-amber-300">{formatPoints(wallet?.balance ?? 0)} pts</p>
          )}
        </div>
        <Wallet className="h-10 w-10 text-amber-400/70" />
      </CardContent>
    </Card>
  );
}
