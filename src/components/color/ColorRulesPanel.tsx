import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ColorRulesPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>How it works</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>Each round lasts 60 seconds: 50 seconds to submit a prediction, then a 10 second reveal.</p>
        <p>
          Pick Red, Green, or Violet, choose how many points to put on it, and submit your
          prediction before the window closes.
        </p>
        <p>
          One color is picked at random once per round by the server, with an equal 1-in-3 chance
          for each. Get it right and you receive <strong>3× your points</strong> back (e.g. predict
          with 50 points, win 150 points). Get it wrong and those points are gone.
        </p>
        <p>
          The result is generated securely on the server after predictions close — it can never be
          influenced by how many points are on any color.
        </p>
        <p className="pt-1 text-xs">
          This game uses virtual points, not real money. Play responsibly. Must be 18+ to play.
        </p>
      </CardContent>
    </Card>
  );
}
