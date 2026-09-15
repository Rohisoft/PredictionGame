import { Lightbulb } from "lucide-react";
import { HAND_TYPE_INFO, HAND_TYPE_ORDER } from "@/types/teenPatti";

export function TeenPattiRulesPanel() {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 p-4 text-xs text-white/50 shadow-lg sm:p-5">
      <div className="mb-2 flex items-center gap-1.5 font-semibold text-white/70">
        <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
        How it works
      </div>
      <p className="mb-3">
        Each 60s round: 50s to predict, then a 10s reveal. <strong className="text-white/70">Player A is your hand</strong>
        ; Player B is the opponent hand, dealt the same secure way. Predict which hand wins — both come from one
        shared, server-shuffled deck, never influenced by how many points are on either side. Win and you get{" "}
        <strong className="text-white/70">2× your points</strong>; a tie refunds everyone in full.
      </p>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
        {HAND_TYPE_ORDER.map((handType, i) => (
          <div key={handType} className="flex items-baseline gap-1.5">
            <span className="text-white/30">{i + 1}.</span>
            <span className="text-white/60">{HAND_TYPE_INFO[handType].label}</span>
          </div>
        ))}
      </div>

      <p className="mt-3 border-t border-white/10 pt-2 text-white/30">
        Virtual points only, not real money. Play responsibly. Must be 18+.
      </p>
    </div>
  );
}
