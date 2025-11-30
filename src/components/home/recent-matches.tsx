"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useData } from "@/contexts/data-context";
import { useCurrentPlayer, usePlayerMatches } from "@/lib/react-query/hooks";
import { TrendingDown, Trophy } from "lucide-react";
import Link from "next/link";

export function RecentMatches() {
  const { stats } = useData();
  const { data: currentPlayerId } = useCurrentPlayer();
  const { data: allMatches = [], isLoading: matchesLoading } = usePlayerMatches(
    currentPlayerId,
    5
  );

  if (stats.loading || matchesLoading) {
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
            <Skeleton key={i} className="h-16 w-full" />
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
        {allMatches.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Aún no has jugado ningún partido
          </p>
        ) : (
          allMatches.map((match) => {
            if (!currentPlayerId) return null;

            // Determine player's team and if they won
            const playerPosition =
              match.player_1_id === currentPlayerId
                ? 1
                : match.player_2_id === currentPlayerId
                ? 2
                : match.player_3_id === currentPlayerId
                ? 3
                : 4;

            const playerTeam = playerPosition <= 2 ? 1 : 2;
            const won = match.winner_team === playerTeam;

            // Get team players
            const teamPlayers =
              playerTeam === 1
                ? [match.player_1, match.player_2]
                : [match.player_3, match.player_4];

            // Get opponents
            const opponents =
              playerTeam === 1
                ? [match.player_3, match.player_4]
                : [match.player_1, match.player_2];

            // Get ELO change
            const eloKey = `player_${playerPosition}` as const;
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
                      <Trophy className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex -space-x-2 ${
                        won ? "ring-2 ring-green-500/50 rounded-full" : ""
                      }`}
                    >
                      {teamPlayers.map((player) => (
                        <PlayerAvatar
                          key={player.id}
                          name={player.display_name}
                          avatarUrl={player.avatar_url}
                          isGhost={player.is_ghost}
                          size="sm"
                          className="ring-2 ring-background"
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">vs</span>
                    <div
                      className={`flex -space-x-2 ${
                        !won ? "ring-2 ring-red-500/50 rounded-full" : ""
                      }`}
                    >
                      {opponents.map((opponent) => (
                        <PlayerAvatar
                          key={opponent.id}
                          name={opponent.display_name}
                          avatarUrl={opponent.avatar_url}
                          isGhost={opponent.is_ghost}
                          size="sm"
                          className="ring-2 ring-background"
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {new Date(match.match_date).toLocaleDateString("es-AR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(match.match_date).toLocaleTimeString("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      eloChange >= 0 ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {eloChange >= 0 ? "+" : ""}
                    {Math.round(eloChange)}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
