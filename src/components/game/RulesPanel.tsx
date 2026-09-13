import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RulesPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>How it works</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>Each round lasts 60 seconds: 50 seconds to place a bet, then a 10 second reveal.</p>
        <p>Pick Odd (1, 3, 5) or Even (2, 4, 6), choose a stake, and place your bet before betting closes.</p>
        <p>
          A standard six-sided dice is rolled once per round by the server. Win and you receive{" "}
          <strong>2× your stake</strong> back (e.g. bet ₹50, win ₹100). Lose and the stake is gone.
        </p>
        <p>
          The dice result is generated securely on the server after betting closes — it can never
          be influenced by how much is bet on either side.
        </p>
        <p className="pt-1 text-xs">
          This game uses virtual points, not real money. Play responsibly. Must be 18+ to play.
        </p>
      </CardContent>
    </Card>
  );
}
