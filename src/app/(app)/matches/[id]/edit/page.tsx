"use client";

import { Header } from "@/components/layout/header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EloBadge } from "@/components/ui/elo-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { Switch } from "@/components/ui/switch";
import {
  canPlayThirdSet,
  getSetWinner,
  isValidSetScore,
  validateMatch,
} from "@/lib/padel-rules";
import { createClient } from "@/lib/supabase/client";
import type { Match, MatchConfig, Player, SetScore } from "@/types/database";
import { DEFAULT_MATCH_CONFIG } from "@/types/database";
import { AlertTriangle, Check, Loader2, Trash2, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";

interface EditMatchPageProps {
  params: Promise<{ id: string }>;
}

interface MatchWithPlayers extends Match {
  player_1: Player;
  player_2: Player;
  player_3: Player;
  player_4: Player;
}

export default function EditMatchPage({ params }: EditMatchPageProps) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [match, setMatch] = useState<MatchWithPlayers | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Editable fields
  const [venue, setVenue] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [matchTime, setMatchTime] = useState("");
  const [sets, setSets] = useState<SetScore[]>([]);
  const [winnerTeam, setWinnerTeam] = useState<1 | 2 | null>(null);
  const [matchConfig, setMatchConfig] =
    useState<MatchConfig>(DEFAULT_MATCH_CONFIG);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Input values as strings to avoid "06" issue
  const [setInputValues, setSetInputValues] = useState<
    Array<{ team1: string; team2: string }>
  >([]);

  // Validation errors
  const [validationError, setValidationError] = useState<string | null>(null);
  const [setErrors, setSetErrors] = useState<
    Array<{ team1?: string; team2?: string }>
  >([]);

  const router = useRouter();
  const supabase = createClient();
  const errorRef = useRef<HTMLDivElement>(null);

  // Helper function to round time to nearest 00 or 30 minutes
  const roundTimeToNearestHalfHour = (timeString: string): string => {
    const [hours, minutes] = timeString.split(":").map(Number);
    let roundedMinutes: number;
    let roundedHours = hours;

    if (minutes <= 14) {
      roundedMinutes = 0;
    } else if (minutes <= 44) {
      roundedMinutes = 30;
    } else {
      roundedMinutes = 0;
      roundedHours = (hours + 1) % 24;
    }

    return `${String(roundedHours).padStart(2, "0")}:${String(
      roundedMinutes
    ).padStart(2, "0")}`;
  };

  useEffect(() => {
    loadMatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadMatch() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setCurrentUserId(user.id);

    const { data: matchData } = await supabase
      .from("matches")
      .select(
        `
        *,
        player_1:players!matches_player_1_id_fkey(*, profiles!left(avatar_url)),
        player_2:players!matches_player_2_id_fkey(*, profiles!left(avatar_url)),
        player_3:players!matches_player_3_id_fkey(*, profiles!left(avatar_url)),
        player_4:players!matches_player_4_id_fkey(*, profiles!left(avatar_url))
      `
      )
      .eq("id", id)
      .single();

    if (!matchData) {
      setError("Partido no encontrado");
      setLoading(false);
      return;
    }

    // Check if user is the creator
    if (matchData.created_by !== user.id) {
      setError("No tenés permiso para editar este partido");
      setLoading(false);
      return;
    }

    // Helper function to extract avatar_url from profiles join
    const getAvatarUrl = (player: any): string | null => {
      if (player.is_ghost || !player.profile_id) return null;
      if (Array.isArray(player.profiles)) {
        return player.profiles[0]?.avatar_url || null;
      }
      return player.profiles?.avatar_url || null;
    };

    const fullMatch: MatchWithPlayers = {
      ...matchData,
      score_sets: matchData.score_sets as SetScore[],
      match_config:
        (matchData.match_config as MatchConfig) || DEFAULT_MATCH_CONFIG,
      player_1: {
        ...(matchData.player_1 as unknown as Player),
        avatar_url: getAvatarUrl(matchData.player_1),
      } as Player & { avatar_url?: string | null },
      player_2: {
        ...(matchData.player_2 as unknown as Player),
        avatar_url: getAvatarUrl(matchData.player_2),
      } as Player & { avatar_url?: string | null },
      player_3: {
        ...(matchData.player_3 as unknown as Player),
        avatar_url: getAvatarUrl(matchData.player_3),
      } as Player & { avatar_url?: string | null },
      player_4: {
        ...(matchData.player_4 as unknown as Player),
        avatar_url: getAvatarUrl(matchData.player_4),
      } as Player & { avatar_url?: string | null },
    };

    setMatch(fullMatch);
    setVenue(fullMatch.venue || "");

    // Parse date and time from match_date (could be DATE or TIMESTAMPTZ)
    const matchDateTime = new Date(fullMatch.match_date);
    setMatchDate(matchDateTime.toISOString().split("T")[0]);
    const timeString = matchDateTime.toTimeString().slice(0, 5);
    setMatchTime(roundTimeToNearestHalfHour(timeString)); // HH:mm format rounded to 00 or 30

    setSets(fullMatch.score_sets);
    setWinnerTeam(fullMatch.winner_team);
    setMatchConfig(fullMatch.match_config);

    // Initialize input values
    setSetInputValues(
      fullMatch.score_sets.map((set) => ({
        team1: set.team1.toString(),
        team2: set.team2.toString(),
      }))
    );
    setSetErrors(fullMatch.score_sets.map(() => ({})));

    setLoading(false);
  }

  function handleSetScoreChange(
    setIndex: number,
    team: "team1" | "team2",
    value: string
  ) {
    // Allow empty string for clearing
    if (value === "") {
      const newInputValues = [...setInputValues];
      newInputValues[setIndex] = { ...newInputValues[setIndex], [team]: "" };
      setSetInputValues(newInputValues);

      const newSets = [...sets];
      newSets[setIndex] = {
        ...newSets[setIndex],
        [team]: 0,
        isTiebreak: matchConfig.superTiebreak && setIndex === 2,
      };
      setSets(newSets);
      validateSet(setIndex, team, 0);
      return;
    }

    // Only allow digits
    if (!/^\d+$/.test(value)) return;

    const numValue = parseInt(value);
    const isSuperTiebreak = matchConfig.superTiebreak && setIndex === 2;
    const maxScore = isSuperTiebreak ? 10 : 7;

    // Limit to max score
    if (numValue > maxScore) return;

    // Update input value (as string to avoid "06" issue)
    const newInputValues = [...setInputValues];
    newInputValues[setIndex] = { ...newInputValues[setIndex], [team]: value };
    setSetInputValues(newInputValues);

    // Update sets
    const newSets = [...sets];
    newSets[setIndex] = {
      ...newSets[setIndex],
      [team]: numValue,
      isTiebreak: isSuperTiebreak,
    };
    setSets(newSets);

    // Validate this set
    validateSet(setIndex, team, numValue);

    // Auto-add third set if first two sets are won by different teams
    if (newSets.length === 2 && canPlayThirdSet(newSets)) {
      setSets([
        ...newSets,
        { team1: 0, team2: 0, isTiebreak: matchConfig.superTiebreak },
      ]);
      setSetInputValues([...newInputValues, { team1: "", team2: "" }]);
      setSetErrors([...setErrors, {}]);
    }
  }

  function handleSetScoreBlur(setIndex: number, team: "team1" | "team2") {
    // When input loses focus, ensure we have a number (not empty string)
    const currentValue = setInputValues[setIndex]?.[team];
    if (currentValue === "" || currentValue === undefined) {
      const newInputValues = [...setInputValues];
      newInputValues[setIndex] = { ...newInputValues[setIndex], [team]: "0" };
      setSetInputValues(newInputValues);
    }
  }

  function validateSet(
    setIndex: number,
    team: "team1" | "team2",
    value: number
  ) {
    const set = sets[setIndex];
    const isSuperTiebreak = matchConfig.superTiebreak && setIndex === 2;
    const otherTeam = team === "team1" ? "team2" : "team1";
    const otherValue = set[otherTeam];

    const newSetErrors = [...setErrors];
    if (!newSetErrors[setIndex]) {
      newSetErrors[setIndex] = {};
    }

    // Validate the set score
    const isValid = isValidSetScore(
      team === "team1" ? value : set.team1,
      team === "team2" ? value : set.team2,
      isSuperTiebreak
    );

    if (!isValid && value > 0 && otherValue > 0) {
      const setLabel = isSuperTiebreak
        ? "Super Tiebreak"
        : `Set ${setIndex + 1}`;
      newSetErrors[setIndex][team] = `Resultado inválido en ${setLabel}`;
    } else {
      delete newSetErrors[setIndex][team];
    }

    setSetErrors(newSetErrors);
  }

  function addSet() {
    if (sets.length < 3) {
      setSets([
        ...sets,
        { team1: 0, team2: 0, isTiebreak: matchConfig.superTiebreak },
      ]);
      setSetInputValues([...setInputValues, { team1: "", team2: "" }]);
      setSetErrors([...setErrors, {}]);
    }
  }

  function removeSet() {
    if (sets.length > 2) {
      setSets(sets.slice(0, -1));
      setSetInputValues((prev) => prev.slice(0, -1));
      setSetErrors((prev) => prev.slice(0, -1));
    }
  }

  useEffect(() => {
    let team1Sets = 0;
    let team2Sets = 0;

    sets.forEach((set, index) => {
      const isSuperTiebreak = matchConfig.superTiebreak && index === 2;
      const winner = getSetWinner(set.team1, set.team2, isSuperTiebreak);
      if (winner === 1) team1Sets++;
      if (winner === 2) team2Sets++;
    });

    const winner: 1 | 2 | null =
      team1Sets > team2Sets ? 1 : team2Sets > team1Sets ? 2 : null;
    setWinnerTeam(winner);

    // Remove third set if it exists but condition is no longer met
    if (sets.length === 3 && !canPlayThirdSet(sets.slice(0, 2))) {
      setSets(sets.slice(0, 2));
      setSetInputValues((prev) => prev.slice(0, 2));
      setSetErrors((prev) => prev.slice(0, 2));
    }
  }, [sets, matchConfig.superTiebreak]);

  // Scroll to error when error appears
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [error]);

  async function handleSave() {
    if (!match) {
      setError("Partido no encontrado");
      return;
    }

    // Validate match using padel rules
    const validation = validateMatch(sets, matchConfig);
    if (!validation.valid) {
      setError(
        validation.error ||
          "El resultado no es válido según las reglas del pádel"
      );
      setValidationError(validation.error || null);
      return;
    }

    if (!winnerTeam) {
      setError("El resultado debe tener un ganador claro");
      return;
    }

    setSaving(true);
    setError(null);
    setValidationError(null);

    try {
      // First, reverse the old ELO changes
      await supabase.rpc("reverse_match_elos", { p_match_id: match.id });

      // Then update the match (this will trigger the ELO recalculation)
      const { error: updateError } = await supabase
        .from("matches")
        .update({
          venue: venue || null,
          match_date: `${matchDate}T${matchTime}:00`,
          score_sets: sets,
          winner_team: winnerTeam,
          match_config: matchConfig,
        })
        .eq("id", match.id);

      if (updateError) {
        setError("Error al guardar: " + updateError.message);
        setSaving(false);
        return;
      }

      // Manually recalculate ELOs
      await supabase.rpc("update_match_elos", { match_id: match.id });

      setSuccess(true);
      // Redirect immediately to match detail page
      router.replace(`/matches/${match.id}`);
      router.refresh();
    } catch (err) {
      setError("Error al guardar los cambios");
    }

    setSaving(false);
  }

  async function handleDelete() {
    if (!match) return;

    setDeleting(true);
    setError(null);

    try {
      // First, reverse the ELO changes
      await supabase.rpc("reverse_match_elos", { p_match_id: match.id });

      // Then delete the match
      const { error: deleteError } = await supabase
        .from("matches")
        .delete()
        .eq("id", match.id);

      if (deleteError) {
        setError("Error al eliminar: " + deleteError.message);
        setDeleting(false);
        return;
      }

      router.push("/matches");
      router.refresh();
    } catch (err) {
      setError("Error al eliminar el partido");
    }

    setDeleting(false);
  }

  if (loading) {
    return (
      <>
        <Header title="Editar Partido" showBack />
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  if (error && !match) {
    return (
      <>
        <Header title="Editar Partido" showBack />
        <div className="p-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Editar Partido" showBack />

      <div className="space-y-6 p-4">
        {error && (
          <Alert ref={errorRef} variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertDescription className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              ¡Partido actualizado! Los ELOs fueron recalculados.
            </AlertDescription>
          </Alert>
        )}

        {/* Warning */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Editar el partido recalculará los ELOs de todos los jugadores.
          </AlertDescription>
        </Alert>

        {/* Match Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Detalles del Partido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 min-w-0 overflow-hidden">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                />
              </div>
              <div className="space-y-2 min-w-0 overflow-hidden">
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={matchTime}
                  onChange={(e) => {
                    const roundedTime = roundTimeToNearestHalfHour(
                      e.target.value
                    );
                    setMatchTime(roundedTime);
                  }}
                  step="1800"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cancha (opcional)</Label>
              <Input
                placeholder="Ej: Club Padel Norte"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
              />
            </div>

            {/* Match Configuration */}
            <div className="space-y-4 border-t pt-4">
              <Label className="text-sm font-semibold">
                Configuración del Partido
              </Label>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Punto de Oro</Label>
                  <p className="text-xs text-muted-foreground">
                    Sin ventaja en los games (40-40 = punto de oro)
                  </p>
                </div>
                <Switch
                  checked={matchConfig.goldenPoint}
                  onCheckedChange={(checked) =>
                    setMatchConfig((prev) => ({
                      ...prev,
                      goldenPoint: checked,
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Super Tie-break</Label>
                  <p className="text-xs text-muted-foreground">
                    Tercer set es un tie-break a 10 puntos
                  </p>
                </div>
                <Switch
                  checked={matchConfig.superTiebreak}
                  onCheckedChange={(checked) =>
                    setMatchConfig((prev) => ({
                      ...prev,
                      superTiebreak: checked,
                    }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Teams (Read-only) */}
        <div className="grid gap-4">
          {/* Team 1 */}
          <Card className={winnerTeam === 1 ? "ring-2 ring-primary" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  Equipo 1
                  {winnerTeam === 1 && (
                    <Trophy className="h-4 w-4 text-primary" />
                  )}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {match && (
                <>
                  <PlayerRow player={match.player_1} />
                  <PlayerRow player={match.player_2} />
                </>
              )}
            </CardContent>
          </Card>

          {/* Team 2 */}
          <Card className={winnerTeam === 2 ? "ring-2 ring-primary" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  Equipo 2
                  {winnerTeam === 2 && (
                    <Trophy className="h-4 w-4 text-primary" />
                  )}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {match && (
                <>
                  <PlayerRow player={match.player_3} />
                  <PlayerRow player={match.player_4} />
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Score Input */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Resultado</CardTitle>
              {sets.length > 2 && (
                <Button variant="outline" size="sm" onClick={removeSet}>
                  - Set
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Header */}
              <div className="grid grid-cols-[1fr_repeat(3,_4rem)] items-center gap-2 text-xs font-medium text-muted-foreground">
                <span></span>
                {sets.map((set, i) => (
                  <span key={i} className="text-center">
                    {matchConfig.superTiebreak && i === 2
                      ? "STB"
                      : `Set ${i + 1}`}
                  </span>
                ))}
              </div>

              {/* Team 1 Row */}
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_repeat(3,_4rem)] items-center gap-2">
                  <span
                    className={`text-sm font-medium ${
                      winnerTeam === 1 ? "text-primary" : ""
                    }`}
                  >
                    Equipo 1
                  </span>
                  {sets.map((set, i) => (
                    <div key={`t1-${i}`} className="flex flex-col">
                      <Input
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        value={setInputValues[i]?.team1 ?? set.team1.toString()}
                        onChange={(e) =>
                          handleSetScoreChange(i, "team1", e.target.value)
                        }
                        onBlur={() => handleSetScoreBlur(i, "team1")}
                        className={`h-12 text-center text-lg font-mono ${
                          setErrors[i]?.team1 ? "border-destructive" : ""
                        }`}
                        placeholder="0"
                      />
                      {setErrors[i]?.team1 && (
                        <p className="mt-1 text-xs text-destructive">
                          {setErrors[i].team1}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Team 2 Row */}
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_repeat(3,_4rem)] items-center gap-2">
                  <span
                    className={`text-sm font-medium ${
                      winnerTeam === 2 ? "text-primary" : ""
                    }`}
                  >
                    Equipo 2
                  </span>
                  {sets.map((set, i) => (
                    <div key={`t2-${i}`} className="flex flex-col">
                      <Input
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        value={setInputValues[i]?.team2 ?? set.team2.toString()}
                        onChange={(e) =>
                          handleSetScoreChange(i, "team2", e.target.value)
                        }
                        onBlur={() => handleSetScoreBlur(i, "team2")}
                        className={`h-12 text-center text-lg font-mono ${
                          setErrors[i]?.team2 ? "border-destructive" : ""
                        }`}
                        placeholder="0"
                      />
                      {setErrors[i]?.team2 && (
                        <p className="mt-1 text-xs text-destructive">
                          {setErrors[i].team2}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Validation Error */}
              {validationError && (
                <Alert variant="destructive">
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="flex-1 gap-2 text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>¿Eliminar partido?</DialogTitle>
                <DialogDescription>
                  Esta acción no se puede deshacer. Los ELOs de los jugadores
                  serán restaurados.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Eliminar Partido
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={
              saving ||
              !winnerTeam ||
              !!validationError ||
              setErrors.some((err) => Object.keys(err).length > 0)
            }
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Cambios
          </Button>
        </div>
      </div>
    </>
  );
}

function PlayerRow({ player }: { player: Player }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
      <PlayerAvatar
        name={player.display_name}
        avatarUrl={
          (player as Player & { avatar_url?: string | null }).avatar_url
        }
        isGhost={player.is_ghost}
        size="md"
      />
      <div className="flex-1">
        <p className="font-medium">{player.display_name}</p>
        {player.is_ghost && (
          <p className="text-xs text-muted-foreground">Invitado</p>
        )}
      </div>
      <EloBadge
        elo={player.elo_score}
        category={player.category_label}
        size="sm"
      />
    </div>
  );
}
