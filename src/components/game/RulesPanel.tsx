import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RulesPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>How it works</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>Each round lasts 60 seconds: 50 seconds to submit a prediction, then a 10 second reveal.</p>
        <p>
          Pick Odd (1, 3, 5) or Even (2, 4, 6), choose how many points to put on it, and submit
          your prediction before the window closes.
        </p>
        <p>
          A standard six-sided dice is rolled once per round by the server. Get it right and you
          receive <strong>2× your points</strong> back (e.g. predict with 50 points, win 100
          points). Get it wrong and those points are gone.
        </p>
        <p>
          The dice result is generated securely on the server after predictions close — it can
          never be influenced by how many points are on either side.
        </p>
        <p className="pt-1 text-xs">
          This game uses virtual points, not real money. Play responsibly. Must be 18+ to play.
        </p>
      </CardContent>
    </Card>
  );
}
