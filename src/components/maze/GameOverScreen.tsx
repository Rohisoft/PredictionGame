import { RotateCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface GameOverScreenProps {
  level: number;
  onRestart: () => void;
}

export function GameOverScreen({ level, onRestart }: GameOverScreenProps) {
  return (
    <Card className="border-destructive/30">
      <CardHeader className="items-center text-center">
        <CardTitle>Game Over</CardTitle>
        <CardDescription>You ran out of hearts on level {level}.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button size="lg" className="w-full gap-1.5" onClick={onRestart}>
          <RotateCcw className="h-4 w-4" />
          Restart
        </Button>
      </CardContent>
    </Card>
  );
}
