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
        <p>Predict which type of 3-card hand the server will deal, choose how many points to put on it, and submit before the window closes.</p>

        <div className="space-y-1.5 pt-1">
          {HAND_TYPE_ORDER.map((handType) => {
            const info = HAND_TYPE_INFO[handType];
            return (
              <div key={handType} className="flex items-baseline justify-between gap-3">
                <span>
                  <strong className="text-foreground">{info.label}</strong> — {info.description}
                </span>
                <span className="shrink-0 font-semibold text-foreground">{info.multiplier}x</span>
              </div>
            );
          })}
        </div>

        <p className="pt-1">
          3 cards are dealt from a standard 52-card deck securely on the server, only after
          predictions close — it can never be influenced by how many points are on any hand type.
          Each hand type pays fair odds based on its real probability, so rarer hands (like Trail
          or Pure Sequence) pay far more than common ones (like High Card).
        </p>
        <p className="pt-1 text-xs">
          This game uses virtual points, not real money. Play responsibly. Must be 18+ to play.
        </p>
      </CardContent>
    </Card>
  );
}
