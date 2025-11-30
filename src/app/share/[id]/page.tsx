"use client";

import { createClient } from "@/lib/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { EloBadge } from "@/components/ui/elo-badge";
import { NewPlayerBadge } from "@/components/ui/new-player-badge";
import { GhostPlayerBadge } from "@/components/ui/ghost-player-badge";
import { ScoreDisplay } from "@/components/match/score-display";
import { Label } from "@/components/ui/label";
import {
  MapPin,
  Calendar,
  Trophy,
  LogIn,
  UserPlus,
  Loader2,
  Swords,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import type { SetScore, Player, MatchConfig } from "@/types/database";

interface ShareMatchPageProps {
  params: Promise<{ id: string }>;
}

interface MatchData {
  id: string;
  match_date: string;
  venue: string | null;
  score_sets: SetScore[];
  winner_team: 1 | 2;
  match_config: MatchConfig | null;
  player_1: Player & { avatar_url?: string | null };
  player_2: Player & { avatar_url?: string | null };
  player_3: Player & { avatar_url?: string | null };
  player_4: Player & { avatar_url?: string | null };
}

export default function ShareMatchPage({ params }: ShareMatchPageProps) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState<MatchData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadMatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadMatch() {
    setLoading(true);
    setError(null);

    try {
      // Check if user is logged in
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
      setUserId(user?.id || null);

      // Get match data using RPC function for public access
      const { data: matchDataRPC, error: rpcError } = await supabase.rpc(
        "get_match_by_id",
        { match_id: id }
      );

      if (rpcError || !matchDataRPC || matchDataRPC.length === 0) {
        setError("Partido no encontrado");
        setLoading(false);
        return;
      }

      const matchData = matchDataRPC[0];

      // Get players separately (now publicly accessible)
      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("*")
        .in("id", [
          matchData.player_1_id,
          matchData.player_2_id,
          matchData.player_3_id,
          matchData.player_4_id,
        ]);

      if (playersError || !playersData || playersData.length !== 4) {
        setError("Error al cargar los jugadores");
        setLoading(false);
        return;
      }

      // Map players to their positions
      const playerMap = new Map(playersData.map((p) => [p.id, p]));
      const player_1 = playerMap.get(matchData.player_1_id);
      const player_2 = playerMap.get(matchData.player_2_id);
      const player_3 = playerMap.get(matchData.player_3_id);
      const player_4 = playerMap.get(matchData.player_4_id);

      if (!player_1 || !player_2 || !player_3 || !player_4) {
        setError("Error al cargar los jugadores");
        setLoading(false);
        return;
      }

      // Get avatars for non-ghost players
      const profileIds = new Set<string>();
      [player_1, player_2, player_3, player_4].forEach((player) => {
        if (player?.profile_id && !player.is_ghost) {
          profileIds.add(player.profile_id);
        }
      });

      let avatarsMap: Record<string, string | null> = {};
      if (profileIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, avatar_url")
          .in("id", Array.from(profileIds));

        if (profiles) {
          profiles.forEach((profile) => {
            avatarsMap[profile.id] = profile.avatar_url;
          });
        }
      }

      // Helper function to get avatar_url
      const getAvatarUrl = (player: any): string | null => {
        if (player.is_ghost || !player.profile_id) return null;
        return avatarsMap[player.profile_id] || null;
      };

      const matchWithAvatars: MatchData = {
        id: matchData.id,
        match_date: matchData.match_date,
        venue: matchData.venue,
        score_sets: matchData.score_sets as SetScore[],
        winner_team: matchData.winner_team,
        match_config: matchData.match_config as MatchConfig | null,
        player_1: {
          ...(player_1 as unknown as Player),
          avatar_url: getAvatarUrl(player_1),
        } as Player & { avatar_url?: string | null },
        player_2: {
          ...(player_2 as unknown as Player),
          avatar_url: getAvatarUrl(player_2),
        } as Player & { avatar_url?: string | null },
        player_3: {
          ...(player_3 as unknown as Player),
          avatar_url: getAvatarUrl(player_3),
        } as Player & { avatar_url?: string | null },
        player_4: {
          ...(player_4 as unknown as Player),
          avatar_url: getAvatarUrl(player_4),
        } as Player & { avatar_url?: string | null },
      };

      setMatch(matchWithAvatars);
    } catch (err) {
      setError("Error al cargar el partido");
    }

    setLoading(false);
  }

  async function handleLinkPlayer() {
    if (!selectedPlayerId || !userId || !match) return;

    setLinking(true);
    setError(null);

    try {
      // Verify the player is a ghost player without profile_id
      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .select("id, is_ghost, profile_id")
        .eq("id", selectedPlayerId)
        .single();

      if (playerError || !playerData) {
        setError("Jugador no encontrado");
        setLinking(false);
        return;
      }

      if (!playerData.is_ghost) {
        setError("Este jugador ya tiene una cuenta vinculada");
        setLinking(false);
        return;
      }

      if (playerData.profile_id && playerData.profile_id !== userId) {
        setError("Este jugador ya está vinculado a otra cuenta");
        setLinking(false);
        return;
      }

      // Get user profile info
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, username, avatar_url")
        .eq("id", userId)
        .single();

      if (!profile) {
        setError("Error al obtener tu perfil");
        setLinking(false);
        return;
      }

      // Update the player record to link it to the user
      const { error: updateError } = await supabase
        .from("players")
        .update({
          profile_id: userId,
          display_name: profile.full_name || profile.username,
        })
        .eq("id", selectedPlayerId);

      if (updateError) {
        setError("Error al vincular el jugador: " + updateError.message);
        setLinking(false);
        return;
      }

      // Redirect to match details
      router.push(`/matches/${match.id}`);
      router.refresh();
    } catch (err) {
      setError("Error al vincular el jugador");
      setLinking(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center p-6 text-center">
            <h2 className="mb-2 text-xl font-semibold">
              {error || "Partido no encontrado"}
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">
              El partido puede no existir o haber sido eliminado.
            </p>
            <Button asChild>
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Ir a Padelio
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const matchDateTime = new Date(match.match_date);
  const dateStr = matchDateTime.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = matchDateTime.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const players = [match.player_1, match.player_2, match.player_3, match.player_4];
  // Filter players that can be linked (ghost players without profile_id)
  const linkablePlayers = players.filter((p) => p.is_ghost && !p.profile_id);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background via-background to-primary/5 p-4">
      {/* Logo */}
      <div className="mb-6 flex flex-col items-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
          <Swords className="h-7 w-7 text-primary-foreground" />
        </div>
        <h1 className="text-xl font-bold">Padelio</h1>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Resultado del Partido</CardTitle>
          <CardDescription>
            Compartido desde Padelio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Match Info */}
          <div className="space-y-3 rounded-lg bg-muted/50 p-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="capitalize">
                {dateStr} a las {timeStr}
              </span>
            </div>
            {match.venue && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{match.venue}</span>
              </div>
            )}
          </div>

          {/* Score Card */}
          <Card>
            <CardContent className="p-6">
              <ScoreDisplay
                sets={match.score_sets}
                winnerTeam={match.winner_team}
                team1Players={[match.player_1, match.player_2]}
                team2Players={[match.player_3, match.player_4]}
              />
            </CardContent>
          </Card>

          {/* Players */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Jugadores
            </p>
            <div className="grid grid-cols-2 gap-2">
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-2 rounded-lg bg-muted/30 p-2 ${
                    match.winner_team === Math.floor(index / 2) + 1
                      ? "ring-2 ring-primary"
                      : ""
                  }`}
                >
                  <PlayerAvatar
                    name={player.display_name}
                    avatarUrl={player.avatar_url}
                    isGhost={player.is_ghost}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="truncate text-sm font-medium">
                        {player.display_name}
                      </span>
                      {player.is_ghost && <GhostPlayerBadge />}
                    </div>
                    <EloBadge
                      elo={player.elo_score}
                      category={player.category_label}
                      size="sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Link player option */}
          {isLoggedIn && linkablePlayers.length > 0 && (
            <>
              <Alert>
                <UserPlus className="h-4 w-4" />
                <AlertDescription>
                  ¿Sos uno de estos jugadores invitados? Vinculá tu cuenta para
                  trackear tus partidos.
                </AlertDescription>
              </Alert>
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Seleccioná qué jugador sos
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {linkablePlayers.map((player) => (
                    <Button
                      key={player.id}
                      variant={
                        selectedPlayerId === player.id ? "default" : "outline"
                      }
                      className="h-auto flex-col items-start gap-2 p-3"
                      onClick={() => setSelectedPlayerId(player.id)}
                      disabled={linking}
                    >
                      <div className="flex w-full items-center gap-2">
                        <PlayerAvatar
                          name={player.display_name}
                          avatarUrl={player.avatar_url}
                          isGhost={player.is_ghost}
                          size="sm"
                        />
                        <span className="flex-1 text-left text-sm font-medium">
                          {player.display_name}
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>
                {selectedPlayerId && (
                  <Button
                    className="w-full"
                    onClick={handleLinkPlayer}
                    disabled={linking}
                  >
                    {linking && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Vincular mi cuenta
                  </Button>
                )}
              </div>
            </>
          )}

          {/* Login prompt if not logged in */}
          {!isLoggedIn && (
            <Alert>
              <LogIn className="h-4 w-4" />
              <AlertDescription>
                <Link
                  href={`/signup?redirect=/share/${id}&matchId=${id}`}
                  className="font-medium text-primary hover:underline"
                >
                  Creá una cuenta
                </Link>{" "}
                o{" "}
                <Link
                  href={`/login?redirect=/share/${id}&matchId=${id}`}
                  className="font-medium text-primary hover:underline"
                >
                  iniciá sesión
                </Link>{" "}
                para vincular este partido a tu cuenta y trackear tu puntaje.
              </AlertDescription>
            </Alert>
          )}

          {/* View full match button */}
          {isLoggedIn && (
            <Button variant="outline" className="w-full" asChild>
              <Link href={`/matches/${match.id}`}>
                Ver detalles completos
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

