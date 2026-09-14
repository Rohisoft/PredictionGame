import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BalanceCard } from "@/components/wallet/BalanceCard";
import { SpinWheel } from "@/components/spin/SpinWheel";

export function SpinPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <BalanceCard />
      <Card>
        <CardHeader className="items-center text-center">
          <CardTitle>Spin & Win</CardTitle>
          <CardDescription>One free spin every day — pure bonus points, no stake required.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-8">
          <SpinWheel />
        </CardContent>
      </Card>
      <p className="text-center text-xs text-muted-foreground">
        Spin & Win is a free daily bonus — it never costs you points, and the outcome is generated
        randomly on the server the moment you spin.
      </p>
    </div>
  );
}
