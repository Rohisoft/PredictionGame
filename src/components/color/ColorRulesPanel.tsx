import { Lightbulb } from "lucide-react";

export function ColorRulesPanel() {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 p-4 text-xs text-white/50 shadow-lg sm:p-5">
      <div className="mb-2 flex items-center gap-1.5 font-semibold text-white/70">
        <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
        How it works
      </div>
      <p>
        Each 60s round: 50s to predict, then a 10s reveal. Pick{" "}
        <strong className="text-white/70">Red</strong> or <strong className="text-white/70">Green</strong>, choose
        your points, and submit before the window closes. One color is picked at random once per round, securely on
        the server after predictions close, with an equal 1-in-2 chance for each — never influenced by how many
        points are on either color. Get it right and you receive{" "}
        <strong className="text-white/70">2× your points</strong> back.
      </p>
      <p className="mt-3 border-t border-white/10 pt-2 text-white/30">
        Virtual points only, not real money. Play responsibly. Must be 18+.
      </p>
    </div>
  );
}
