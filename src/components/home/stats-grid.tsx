"use client";

import { AnimatedNumberSimple } from "@/components/ui/animated-number";
import { Card, CardContent } from "@/components/ui/card";
import { useData } from "@/contexts/data-context";
import { Swords, Target, TrendingUp, Trophy } from "lucide-react";

export function StatsGrid() {
  const { stats } = useData();

  const winRate = stats.profile?.matches_played
    ? Math.round(
        (stats.profile.matches_won / stats.profile.matches_played) * 100
      )
    : 0;

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Swords className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">
              <AnimatedNumberSimple
                value={stats.profile?.matches_played || 0}
                duration={800}
              />
            </p>
            <p className="text-xs text-muted-foreground">Partidos</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
            <Trophy className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <p className="text-2xl font-bold">
              <AnimatedNumberSimple
                value={stats.profile?.matches_won || 0}
                duration={800}
              />
            </p>
            <p className="text-xs text-muted-foreground">Victorias</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
            <Target className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="text-2xl font-bold">
              <AnimatedNumberSimple value={winRate} duration={800} suffix="%" />
            </p>
            <p className="text-xs text-muted-foreground">Win Rate</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
            <TrendingUp className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-2xl font-bold">
              {stats.ranking !== null ? (
                <AnimatedNumberSimple
                  value={stats.ranking}
                  duration={800}
                  prefix="#"
                />
              ) : (
                "-"
              )}
            </p>
            <p className="text-xs text-muted-foreground">Ranking</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
