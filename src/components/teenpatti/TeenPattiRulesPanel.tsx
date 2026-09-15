import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HAND_TYPE_INFO, HAND_TYPE_ORDER } from "@/types/teenPatti";

export function TeenPattiRulesPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>How it works</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>Each round lasts 60 seconds: 50 seconds to submit a prediction, then a 10 second reveal.</p>
        <p>
          <strong className="text-foreground">Player A is you.</strong> Player B is the computer — dealt cards the
          same secure way, so you never have to wait for another real player to join. Predict who'll win, choose how
          many points to put on it, and submit before the window closes.
        </p>
        <p>
          Both hands are dealt from one shared, shuffled 52-card deck (6 unique cards total, exactly like a real
          table) securely on the server, only after predictions close — it can never be influenced by how many
          points are on either side. Get it right and you receive <strong>2× your points</strong> back. If both
          hands tie, every prediction on that round is refunded in full instead — a tie is never counted as a loss.
        </p>

        <p className="pt-1 font-medium text-foreground">Standard Teen Patti hand ranking (strongest to weakest):</p>
        <div className="space-y-1.5">
          {HAND_TYPE_ORDER.map((handType, i) => {
            const info = HAND_TYPE_INFO[handType];
            return (
              <div key={handType} className="flex items-baseline gap-2">
                <span className="w-4 shrink-0 text-xs text-muted-foreground">{i + 1}.</span>
                <span>
                  <strong className="text-foreground">{info.label}</strong> — {info.description}
                </span>
              </div>
            );
          })}
        </div>

        <p className="pt-1 text-xs">
          This game uses virtual points, not real money. Play responsibly. Must be 18+ to play.
        </p>
      </CardContent>
    </Card>
  );
}
