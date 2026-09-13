import { Link } from "react-router-dom";
import { Dices, ShieldCheck, Timer, Wallet, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { STAKE_AMOUNTS } from "@/types/game";

const STEPS = [
  {
    icon: Dices,
    title: "Pick a side",
    body: "Odd (1, 3, 5) or Even (2, 4, 6). Your call.",
  },
  {
    icon: Timer,
    title: "Submit your prediction",
    body: "Predictions stay open for 50 seconds every round.",
  },
  {
    icon: Sparkles,
    title: "Watch the roll",
    body: "A real six-sided die, rolled server-side, decides it.",
  },
];

const TRUST_BADGES = [
  {
    icon: ShieldCheck,
    title: "Server-side fairness",
    body: "The dice roll happens on the backend after predictions close — never influenced by how many points are on either side.",
  },
  {
    icon: Wallet,
    title: "Virtual points only",
    body: "No real money ever changes hands. New players start with a 100-point welcome bonus.",
  },
  {
    icon: Timer,
    title: "A new round every minute",
    body: "60-second rounds, around the clock — there's always another one starting soon.",
  },
];

export function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-bold">
            <Dices className="h-6 w-6 text-primary" />
            <span>Odd/Even</span>
          </div>
          <nav className="flex items-center gap-2">
            <Button asChild size="sm">
              <Link to={user ? "/play" : "/login"}>{user ? "Continue to game" : "Sign in"}</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-br from-accent via-background to-background">
        <div className="container flex flex-col items-center gap-6 py-16 text-center sm:py-24">
          <Badge variant="outline" className="bg-card">
            A game of chance · virtual points only · 18+
          </Badge>
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            Pick Odd or Even. Roll the dice. Double your points.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            A fast, 60-second dice prediction game. Choose a side, put some
            points on it, and find out when the round's server-rolled dice
            lands — get it right and get 2× your points back.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to={user ? "/play" : "/login"}>{user ? "Continue to game" : "Sign in to play"}</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#how-it-works">See how it works</a>
            </Button>
          </div>
          {!user && (
            <p className="text-sm text-muted-foreground">
              New here? Accounts are created by an admin — ask them for access, then use
              "Forgot password" on the sign-in page to set your own password.
            </p>
          )}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-b border-border py-16">
        <div className="container">
          <h2 className="text-center text-2xl font-bold">How a round works</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <Card key={step.title} className="relative">
                <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                  <span className="absolute left-4 top-4 text-sm font-semibold text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <step.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Points */}
      <section className="border-b border-border bg-secondary/40 py-16">
        <div className="container">
          <h2 className="text-center text-2xl font-bold">Choose how many points</h2>
          <p className="mx-auto mt-2 max-w-md text-center text-sm text-muted-foreground">
            Every amount pays the same way: get it right and get 2× back.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {STAKE_AMOUNTS.map((amount) => (
              <Card key={amount} className="text-center transition-shadow hover:shadow-md">
                <CardContent className="flex flex-col items-center gap-2 p-6">
                  <p className="text-3xl font-bold text-primary">{amount} pts</p>
                  <Badge variant="success">pays {amount * 2} pts</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <Button asChild size="lg">
              <Link to={user ? "/play" : "/login"}>{user ? "Continue to game" : "Sign in to play"}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Trust / fairness */}
      <section className="py-16">
        <div className="container grid gap-6 sm:grid-cols-3">
          {TRUST_BADGES.map((item) => (
            <div key={item.title} className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <item.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="container flex flex-col items-center gap-2 text-center text-xs text-muted-foreground">
          <p>
            Odd/Even is a game of chance played with virtual points — not real
            money, and not redeemable for cash or prizes.
          </p>
          <p>Intended for players 18 and over. Please play responsibly.</p>
        </div>
      </footer>
    </div>
  );
}
