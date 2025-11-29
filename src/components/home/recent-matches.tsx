"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useData } from "@/contexts/data-context";
import { TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";

export function RecentMatches() {
  const { stats } = useData();

  if (stats.loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="h-5 w-32 bg-muted rounded animate-pulse" />
            <div className="h-4 w-16 bg-muted rounded animate-pulse" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                <div className="space-y-1">
                  <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                </div>
              </div>
              <div className="h-4 w-12 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Partidos Recientes</CardTitle>
          <Link
            href="/matches"
            className="text-sm text-primary hover:underline"
          >
            Ver todos
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {stats.recentMatches.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Aún no has jugado ningún partido
          </p>
        ) : (
          stats.recentMatches.map((match) => {
            const position = match.player_position || 0;
            const isTeam1 = position <= 2;
            const won =
              (isTeam1 && match.winner_team === 1) ||
              (!isTeam1 && match.winner_team === 2);
            const eloKey = `player_${position}` as const;
            const eloChange = match.elo_changes?.[eloKey]?.change || 0;

            return (
              <Link
                key={match.id}
                href={`/matches/${match.id}`}
                className="flex items-center justify-between rounded-lg bg-muted/50 p-3 transition-colors hover:bg-muted"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      won
                        ? "bg-green-500/20 text-green-500"
                        : "bg-red-500/20 text-red-500"
                    }`}
                  >
                    {won ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {won ? "Victoria" : "Derrota"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(match.match_date).toLocaleDateString("es-AR", {
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      {new Date(match.match_date).toLocaleTimeString("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    eloChange >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {eloChange >= 0 ? "+" : ""}
                  {Math.round(eloChange)}
                </span>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
