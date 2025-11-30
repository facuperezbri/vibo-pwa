"use client";

import { ScoreDisplay } from "@/components/match/score-display";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EloBadge } from "@/components/ui/elo-badge";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { fuzzySearch } from "@/lib/utils";
import type { PlayerCategory, SetScore } from "@/types/database";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  Search,
  Trophy,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";

interface GhostPlayerMatch {
  id: string;
  match_date: string;
  venue: string | null;
  score_sets: SetScore[];
  winner_team: 1 | 2;
  player_1_name: string;
  player_2_name: string;
  player_3_name: string;
  player_4_name: string;
  player_position: number;
}

interface ClaimableGhostPlayer {
  id: string;
  display_name: string;
  elo_score: number;
  category_label: PlayerCategory;
  matches_played: number;
  matches_won: number;
  created_by_name: string;
  created_at: string;
  matches: GhostPlayerMatch[];
}

export function ClaimGhostPlayers() {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [backendResults, setBackendResults] = useState<ClaimableGhostPlayer[]>([]);
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(
    new Set()
  );
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createClient();

  // Buscar en el backend cuando cambia el término de búsqueda
  async function searchPlayers(searchText: string) {
    if (!open) return;

    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Debes estar autenticado");
      setLoading(false);
      return;
    }

    // Si no hay término de búsqueda, usar cadena vacía para obtener todos los disponibles
    const searchQuery = searchText.trim() || "";

    const { data, error: searchError } = await supabase.rpc(
      "search_claimable_ghost_players_with_matches",
      {
        p_search_name: searchQuery,
        p_user_id: user.id,
      }
    );

    if (searchError) {
      setError("Error al buscar: " + searchError.message);
    } else {
      setBackendResults(data || []);
    }

    setLoading(false);
  }

  // Cargar jugadores cuando se abre el diálogo o cambia el término de búsqueda
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      // Cargar resultados iniciales
      searchPlayers("");
    } else {
      // Resetear búsqueda al cerrar
      setSearchTerm("");
      setBackendResults([]);
    }
  };

  // Buscar cuando cambia el término de búsqueda (con debounce)
  useEffect(() => {
    if (!open) return;

    const timeoutId = setTimeout(() => {
      searchPlayers(searchTerm);
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, open]);

  function toggleExpanded(playerId: string) {
    setExpandedPlayers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
      }
      return newSet;
    });
  }

  // Aplicar búsqueda difusa sobre los resultados del backend
  const searchResults = fuzzySearch(
    backendResults,
    searchTerm,
    (p) => p.display_name,
    50
  );

  const results = searchResults.map((r) => r.item);
  const hasExactMatches = searchResults.some(
    (r) => r.matchType === "exact" || r.matchType === "starts-with"
  );
  const hasFuzzyMatches = searchResults.some((r) => r.matchType === "fuzzy");

  async function handleClaim(playerId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setClaiming(playerId);
    setError(null);

    const { data, error: claimError } = await supabase.rpc(
      "claim_ghost_players",
      {
        p_user_id: user.id,
        p_ghost_player_ids: [playerId],
      }
    );

    if (claimError) {
      setError("Error al vincular: " + claimError.message);
    } else {
      setSuccess(`Jugador vinculado exitosamente`);
      setClaimedIds((prev) => new Set([...prev, playerId]));
      setTimeout(() => setSuccess(null), 3000);
    }

    setClaiming(null);
  }

  async function handleUnclaim(playerId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setClaiming(playerId);
    setError(null);

    const { data, error: unclaimError } = await supabase.rpc(
      "unclaim_ghost_players",
      {
        p_user_id: user.id,
        p_ghost_player_ids: [playerId],
      }
    );

    if (unclaimError) {
      setError("Error al desvincular: " + unclaimError.message);
    } else {
      setSuccess(`Jugador desvinculado exitosamente`);
      setClaimedIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(playerId);
        return newSet;
      });
      setTimeout(() => setSuccess(null), 3000);
    }

    setClaiming(null);
  }

  function getTeammateAndOpponents(match: GhostPlayerMatch) {
    const isTeam1 = match.player_position <= 2;
    const teammate = isTeam1
      ? match.player_position === 1
        ? match.player_2_name
        : match.player_1_name
      : match.player_position === 3
      ? match.player_4_name
      : match.player_3_name;

    const opponents = isTeam1
      ? [match.player_3_name, match.player_4_name]
      : [match.player_1_name, match.player_2_name];

    return {
      teammate,
      opponents,
      isTeam1,
      won:
        (isTeam1 && match.winner_team === 1) ||
        (!isTeam1 && match.winner_team === 2),
    };
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Search className="mr-2 h-4 w-4" />
          Vincular partidos históricos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Vincular jugadores invitados</DialogTitle>
          <DialogDescription>
            Busca jugadores invitados por nombre para vincular tus partidos
            históricos. Revisa los partidos de cada jugador para confirmar que
            son tuyos antes de vincular.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Buscar por nombre (ej: Juan Pérez)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loading && backendResults.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">
                Buscando jugadores...
              </span>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {!loading && (
            <>
              {hasFuzzyMatches && !hasExactMatches && searchTerm.trim() && (
                <div className="px-2 py-1 text-xs text-muted-foreground border-b">
                  Mostrando sugerencias similares
                </div>
              )}
              {results.length > 0 && (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {results.map((player) => {
                    const result = searchResults.find((r) => r.item.id === player.id);
                    const isFuzzyMatch = result?.matchType === "fuzzy";
                const isClaimed = claimedIds.has(player.id);
                const isExpanded = expandedPlayers.has(player.id);
                const matchInfo =
                  player.matches.length > 0
                    ? getTeammateAndOpponents(player.matches[0])
                    : {
                        teammate: "",
                        opponents: [],
                        won: false,
                        isTeam1: false,
                      };

                return (
                  <Card
                    key={player.id}
                    className={isClaimed ? "border-primary" : ""}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Header con info básica */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className={`font-semibold text-lg ${isFuzzyMatch ? "opacity-90" : ""}`}>
                                {player.display_name}
                              </h3>
                              {isFuzzyMatch && (
                                <span className="text-xs text-muted-foreground italic">
                                  (similar)
                                </span>
                              )}
                              <EloBadge
                                elo={player.elo_score}
                                category={player.category_label}
                                size="sm"
                              />
                              {isClaimed && (
                                <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                                  Vinculado
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>
                                <span className="font-medium">
                                  {player.matches_played}
                                </span>{" "}
                                partidos •{" "}
                                <span className="font-medium">
                                  {player.matches_won}
                                </span>{" "}
                                victorias
                              </p>
                              <p className="text-xs">
                                Creado por: {player.created_by_name}
                              </p>
                              {player.matches.length > 0 && (
                                <p className="text-xs">
                                  Último partido:{" "}
                                  {new Date(
                                    player.matches[0].match_date
                                  ).toLocaleDateString("es-AR")}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            {isClaimed ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUnclaim(player.id)}
                                disabled={claiming === player.id}
                              >
                                {claiming === player.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <X className="mr-2 h-4 w-4" />
                                    Desvincular
                                  </>
                                )}
                              </Button>
                            ) : (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleClaim(player.id)}
                                disabled={claiming === player.id}
                              >
                                {claiming === player.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Check className="mr-2 h-4 w-4" />
                                    Vincular
                                  </>
                                )}
                              </Button>
                            )}
                            {player.matches.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExpanded(player.id)}
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="mr-2 h-4 w-4" />
                                    Ocultar partidos
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="mr-2 h-4 w-4" />
                                    Ver {player.matches.length} partido
                                    {player.matches.length !== 1 ? "s" : ""}
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Vista previa del último partido */}
                        {player.matches.length > 0 && !isExpanded && (
                          <div className="border-t pt-3">
                            <p className="text-xs font-medium mb-2 text-muted-foreground">
                              Último partido:
                            </p>
                            <div className="flex items-center gap-2 text-sm flex-wrap">
                              <span className="text-muted-foreground">
                                {new Date(
                                  player.matches[0].match_date
                                ).toLocaleDateString("es-AR", {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </span>
                              <span className="text-muted-foreground">•</span>
                              <span>
                                Con{" "}
                                <span className="font-medium">
                                  {matchInfo.teammate}
                                </span>{" "}
                                vs{" "}
                                <span className="font-medium">
                                  {matchInfo.opponents.join(" y ")}
                                </span>
                              </span>
                              <ScoreDisplay
                                sets={player.matches[0].score_sets}
                                winnerTeam={player.matches[0].winner_team}
                                compact
                              />
                              {matchInfo.won && (
                                <Trophy className="h-4 w-4 text-yellow-500" />
                              )}
                            </div>
                          </div>
                        )}

                        {/* Lista expandida de partidos */}
                        {isExpanded && player.matches.length > 0 && (
                          <div className="border-t pt-3 space-y-3">
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              Partidos ({player.matches.length}):
                            </p>
                            {player.matches.map((match) => {
                              const matchInfo = getTeammateAndOpponents(match);
                              return (
                                <Card key={match.id} className="bg-muted/30">
                                  <CardContent className="p-3">
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm">
                                          <Calendar className="h-4 w-4 text-muted-foreground" />
                                          <span>
                                            {new Date(
                                              match.match_date
                                            ).toLocaleDateString("es-AR", {
                                              weekday: "short",
                                              day: "numeric",
                                              month: "short",
                                              year: "numeric",
                                            })}
                                          </span>
                                          {match.venue && (
                                            <>
                                              <span className="text-muted-foreground">
                                                •
                                              </span>
                                              <MapPin className="h-4 w-4 text-muted-foreground" />
                                              <span className="text-muted-foreground">
                                                {match.venue}
                                              </span>
                                            </>
                                          )}
                                        </div>
                                        {matchInfo.won && (
                                          <Trophy className="h-4 w-4 text-yellow-500" />
                                        )}
                                      </div>

                                      <div className="text-sm">
                                        <p>
                                          <span className="font-medium">
                                            Equipo:
                                          </span>{" "}
                                          <span className="font-semibold">
                                            {player.display_name}
                                          </span>{" "}
                                          y{" "}
                                          <span className="font-medium">
                                            {matchInfo.teammate}
                                          </span>
                                        </p>
                                        <p className="text-muted-foreground">
                                          vs {matchInfo.opponents.join(" y ")}
                                        </p>
                                      </div>

                                      <ScoreDisplay
                                        sets={match.score_sets}
                                        winnerTeam={match.winner_team}
                                        compact
                                      />
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

              {results.length === 0 && !loading && (
                <p className="text-center text-sm text-muted-foreground">
                  {searchTerm
                    ? "No se encontraron jugadores con ese nombre"
                    : "Escribí un nombre para buscar jugadores"}
                </p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
