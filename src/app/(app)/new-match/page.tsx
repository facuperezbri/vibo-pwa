"use client";

import { Header } from "@/components/layout/header";
import { WhatsAppShareDialog } from "@/components/match/whatsapp-share-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { Label } from "@/components/ui/label";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useNavigation } from "@/contexts/navigation-context";
import {
  canPlayThirdSet,
  getSetWinner,
  isValidSetScore,
  validateMatch,
} from "@/lib/padel-rules";
import { createClient } from "@/lib/supabase/client";
import type {
  MatchConfig,
  MatchInvitation,
  Player,
  PlayerCategory,
  SetScore,
} from "@/types/database";
import {
  CATEGORIES,
  CATEGORY_ELO_MAP,
  CATEGORY_LABELS,
  DEFAULT_MATCH_CONFIG,
} from "@/types/database";
import {
  Check,
  Loader2,
  Plus,
  Share2,
  Trophy,
  UserPlus,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type SelectedPlayer = Pick<
  Player,
  | "id"
  | "display_name"
  | "is_ghost"
  | "elo_score"
  | "category_label"
  | "profile_id"
> & {
  avatar_url?: string | null;
};

export default function NewMatchPage() {
  const [loading, setLoading] = useState(false);
  const [savingMatch, setSavingMatch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [currentUser, setCurrentUser] = useState<SelectedPlayer | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [availablePlayers, setAvailablePlayers] = useState<SelectedPlayer[]>(
    []
  );

  // Team selection (user is always position 1)
  const [team1Player2, setTeam1Player2] = useState<SelectedPlayer | null>(null);
  const [team2Player1, setTeam2Player1] = useState<SelectedPlayer | null>(null);
  const [team2Player2, setTeam2Player2] = useState<SelectedPlayer | null>(null);

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

  // Match details
  const [venue, setVenue] = useState("");
  const [matchDate, setMatchDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [matchTime, setMatchTime] = useState(() => {
    const now = new Date();
    const timeString = now.toTimeString().slice(0, 5);
    return roundTimeToNearestHalfHour(timeString);
  });
  const [sets, setSets] = useState<SetScore[]>([
    { team1: 0, team2: 0 },
    { team1: 0, team2: 0 },
  ]);
  const [winnerTeam, setWinnerTeam] = useState<1 | 2 | null>(null);

  // Input values as strings to avoid "06" issue
  const [setInputValues, setSetInputValues] = useState<
    Array<{ team1: string; team2: string }>
  >([
    { team1: "", team2: "" },
    { team1: "", team2: "" },
  ]);

  // Validation errors
  const [validationError, setValidationError] = useState<string | null>(null);
  const [setErrors, setSetErrors] = useState<
    Array<{ team1?: string; team2?: string }>
  >([{}, {}]);

  // Match config (Golden Point / Super Tie-break)
  const [matchConfig, setMatchConfig] =
    useState<MatchConfig>(DEFAULT_MATCH_CONFIG);

  // Ghost player creation
  const [showGhostDialog, setShowGhostDialog] = useState(false);
  const [ghostPosition, setGhostPosition] = useState<
    "team1-2" | "team2-1" | "team2-2" | null
  >(null);
  const [newGhostName, setNewGhostName] = useState("");
  const [newGhostCategory, setNewGhostCategory] =
    useState<PlayerCategory>("6ta");
  const [creatingGhost, setCreatingGhost] = useState(false);

  // WhatsApp share
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [createdMatchId, setCreatedMatchId] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<MatchInvitation[]>([]);

  // Navigation confirmation
  const [showExitConfirmDialog, setShowExitConfirmDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<
    (() => void) | null
  >(null);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const { registerConfirmHandler } = useNavigation();
  const errorRef = useRef<HTMLDivElement>(null);

  // Check if there's unsaved data
  const hasUnsavedData = useCallback(() => {
    // Check if any players are selected
    if (team1Player2 || team2Player1 || team2Player2) return true;

    // Check if any sets have non-zero scores
    const hasSetScores = sets.some((set) => set.team1 > 0 || set.team2 > 0);
    if (hasSetScores) return true;

    // Check if venue is filled
    if (venue.trim() !== "") return true;

    return false;
  }, [team1Player2, team2Player1, team2Player2, sets, venue]);

  // Handle navigation with confirmation
  const handleNavigation = useCallback(
    (navigationFn: () => void) => {
      if (hasUnsavedData() && !success) {
        setPendingNavigation(() => navigationFn);
        setShowExitConfirmDialog(true);
      } else {
        navigationFn();
      }
    },
    [hasUnsavedData, success]
  );

  // Confirm exit
  const handleConfirmExit = () => {
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
    setShowExitConfirmDialog(false);
  };

  // Cancel exit
  const handleCancelExit = () => {
    setPendingNavigation(null);
    setShowExitConfirmDialog(false);
  };

  useEffect(() => {
    loadUserAndPlayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Register navigation confirmation handler
  useEffect(() => {
    registerConfirmHandler(handleNavigation);
    return () => {
      registerConfirmHandler(null);
    };
  }, [handleNavigation, registerConfirmHandler]);

  // Scroll to error when error appears
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [error]);

  // Intercept browser navigation (close tab/window)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedData() && !success) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedData, success]);

  // Intercept route changes - Note: This is a workaround for Next.js App Router
  // The actual navigation interception happens in handleNavigation callback
  useEffect(() => {
    // We can't easily intercept router.push in App Router, so we rely on
    // the Header's onBackClick and beforeunload events
    // For BottomNav clicks, we'd need to modify BottomNav component
  }, []);

  async function loadUserAndPlayers() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    setCurrentUserId(user.id);

    // Get current user's player record with avatar
    const { data: userPlayer } = await supabase
      .from("players")
      .select(
        "id, display_name, is_ghost, elo_score, category_label, profile_id, profiles!left(avatar_url)"
      )
      .eq("profile_id", user.id)
      .single();

    if (userPlayer) {
      const playerWithAvatar = {
        ...userPlayer,
        avatar_url: Array.isArray(userPlayer.profiles)
          ? (userPlayer.profiles[0] as any)?.avatar_url || null
          : (userPlayer.profiles as any)?.avatar_url || null,
      };
      // Remove the profiles object
      delete (playerWithAvatar as any).profiles;
      setCurrentUser(playerWithAvatar as SelectedPlayer);
    }

    // Get available players (non-ghost public + user's ghosts) with avatars
    const { data: players } = await supabase
      .from("players")
      .select(
        "id, display_name, is_ghost, elo_score, category_label, profile_id, profiles!left(avatar_url)"
      )
      .or(`is_ghost.eq.false,created_by_user_id.eq.${user.id}`)
      .neq("profile_id", user.id) // Exclude current user
      .order("display_name");

    // Map players to include avatar_url
    const playersWithAvatars = (players || []).map((player) => {
      const playerWithAvatar = {
        ...player,
        avatar_url: Array.isArray(player.profiles)
          ? (player.profiles[0] as any)?.avatar_url || null
          : (player.profiles as any)?.avatar_url || null,
      };
      // Remove the profiles object
      delete (playerWithAvatar as any).profiles;
      return playerWithAvatar;
    });

    setAvailablePlayers(playersWithAvatars as SelectedPlayer[]);
    setLoading(false);
  }

  function handlePlayerSelect(
    player: SelectedPlayer,
    position: "team1-2" | "team2-1" | "team2-2"
  ) {
    switch (position) {
      case "team1-2":
        setTeam1Player2(player);
        break;
      case "team2-1":
        setTeam2Player1(player);
        break;
      case "team2-2":
        setTeam2Player2(player);
        break;
    }
  }

  function handleRemovePlayer(position: "team1-2" | "team2-1" | "team2-2") {
    switch (position) {
      case "team1-2":
        setTeam1Player2(null);
        break;
      case "team2-1":
        setTeam2Player1(null);
        break;
      case "team2-2":
        setTeam2Player2(null);
        break;
    }
  }

  function getSelectedPlayerIds(): string[] {
    const ids: string[] = [];
    if (currentUser) ids.push(currentUser.id);
    if (team1Player2) ids.push(team1Player2.id);
    if (team2Player1) ids.push(team2Player1.id);
    if (team2Player2) ids.push(team2Player2.id);
    return ids;
  }

  function getAvailablePlayersForPosition(): SelectedPlayer[] {
    const selectedIds = getSelectedPlayerIds();
    return availablePlayers.filter((p) => !selectedIds.includes(p.id));
  }

  async function handleCreateGhost() {
    if (!newGhostName.trim() || !ghostPosition) return;

    setCreatingGhost(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const initialElo = CATEGORY_ELO_MAP[newGhostCategory];

    const { data: newPlayer, error } = await supabase
      .from("players")
      .insert({
        display_name: newGhostName.trim(),
        is_ghost: true,
        created_by_user_id: user.id,
        elo_score: initialElo,
        category_label: newGhostCategory,
      })
      .select(
        "id, display_name, is_ghost, elo_score, category_label, profile_id"
      )
      .single();

    if (error || !newPlayer) {
      setError("Error al crear el jugador");
      setCreatingGhost(false);
      return;
    }

    // Add to available players and select
    setAvailablePlayers((prev) => [...prev, newPlayer]);
    handlePlayerSelect(newPlayer, ghostPosition);

    // Reset dialog
    setShowGhostDialog(false);
    setNewGhostName("");
    setNewGhostCategory("6ta");
    setGhostPosition(null);
    setCreatingGhost(false);
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

  async function handleSubmit() {
    if (!currentUser || !team1Player2 || !team2Player1 || !team2Player2) {
      setError("Seleccioná los 4 jugadores");
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

    setSavingMatch(true);
    setError(null);
    setValidationError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Create the match
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .insert({
        created_by: user.id,
        match_date: `${matchDate}T${matchTime}:00`,
        venue: venue || null,
        player_1_id: currentUser.id,
        player_2_id: team1Player2.id,
        player_3_id: team2Player1.id,
        player_4_id: team2Player2.id,
        score_sets: sets,
        winner_team: winnerTeam,
        match_config: matchConfig,
      })
      .select("id")
      .single();

    if (matchError || !match) {
      setError("Error al guardar el partido: " + matchError?.message);
      setSavingMatch(false);
      return;
    }

    setCreatedMatchId(match.id);

    // Create invitations for non-ghost players (excluding self)
    const playersToInvite = [team1Player2, team2Player1, team2Player2].filter(
      (p) => !p.is_ghost && p.profile_id && p.profile_id !== user.id
    );

    if (playersToInvite.length > 0) {
      const invitationInserts = playersToInvite.map((p) => ({
        match_id: match.id,
        invited_player_id: p.id,
        invited_profile_id: p.profile_id,
      }));

      const { data: newInvitations } = await supabase
        .from("match_invitations")
        .insert(invitationInserts)
        .select("*");

      if (newInvitations) {
        setInvitations(newInvitations);
      }
    }

    setSuccess(true);
    setSavingMatch(false);

    // Show share dialog if there are players to share with
    const allPlayers = [team1Player2, team2Player1, team2Player2];
    const hasPlayersToShare = allPlayers.some((p) => !p.is_ghost || p.is_ghost);

    if (hasPlayersToShare) {
      setShowShareDialog(true);
    } else {
      setTimeout(() => {
        router.push("/matches");
        router.refresh();
      }, 1500);
    }
  }

  function handleShareComplete() {
    setShowShareDialog(false);
    router.push("/matches");
    router.refresh();
  }

  if (loading) {
    return (
      <>
        <Header
          title="Nuevo Partido"
          showBack
          onBackClick={() => handleNavigation(() => router.back())}
        />
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Nuevo Partido" showBack />

      <div className="space-y-6 p-4">
        {error && (
          <Alert ref={errorRef} variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && !showShareDialog && (
          <Alert>
            <AlertDescription className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              ¡Partido guardado! Los ELOs fueron actualizados.
            </AlertDescription>
          </Alert>
        )}

        {/* Match Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Detalles del Partido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
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
                  className="w-full"
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
                  <Label className="text-sm font-medium">Golden Point</Label>
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

        {/* Teams */}
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
                {winnerTeam === 1 && (
                  <span className="text-xs font-medium text-primary">
                    Ganador
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Current User (fixed) - Always Team 1 Player 1 */}
              {currentUser && (
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                  <PlayerAvatar
                    name={currentUser.display_name}
                    avatarUrl={currentUser.avatar_url}
                    size="md"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{currentUser.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Equipo 1 - Jugador 1
                    </p>
                  </div>
                  <EloBadge
                    elo={currentUser.elo_score}
                    category={currentUser.category_label}
                    size="sm"
                  />
                </div>
              )}

              {/* Team 1 Player 2 */}
              <PlayerSlot
                player={team1Player2}
                position="team1-2"
                availablePlayers={getAvailablePlayersForPosition()}
                onSelect={handlePlayerSelect}
                onRemove={handleRemovePlayer}
                onCreateGhost={(pos) => {
                  setGhostPosition(pos);
                  setShowGhostDialog(true);
                }}
                label="Equipo 1 - Jugador 2"
              />
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
                {winnerTeam === 2 && (
                  <span className="text-xs font-medium text-primary">
                    Ganador
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <PlayerSlot
                player={team2Player1}
                position="team2-1"
                availablePlayers={getAvailablePlayersForPosition()}
                onSelect={handlePlayerSelect}
                onRemove={handleRemovePlayer}
                onCreateGhost={(pos) => {
                  setGhostPosition(pos);
                  setShowGhostDialog(true);
                }}
                label="Equipo 2 - Jugador 1"
              />
              <PlayerSlot
                player={team2Player2}
                position="team2-2"
                availablePlayers={getAvailablePlayersForPosition()}
                onSelect={handlePlayerSelect}
                onRemove={handleRemovePlayer}
                onCreateGhost={(pos) => {
                  setGhostPosition(pos);
                  setShowGhostDialog(true);
                }}
                label="Equipo 2 - Jugador 2"
              />
            </CardContent>
          </Card>
        </div>

        {/* Score Input */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Resultado</CardTitle>
              <div className="flex gap-2">
                {sets.length < 3 && (
                  <Button variant="outline" size="sm" onClick={addSet}>
                    + Set
                  </Button>
                )}
                {sets.length > 2 && (
                  <Button variant="outline" size="sm" onClick={removeSet}>
                    - Set
                  </Button>
                )}
              </div>
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

        {/* Submit Button */}
        <Button
          className="w-full py-6 text-lg"
          onClick={handleSubmit}
          disabled={
            savingMatch ||
            !currentUser ||
            !team1Player2 ||
            !team2Player1 ||
            !team2Player2 ||
            !winnerTeam ||
            !!validationError ||
            setErrors.some((err) => Object.keys(err).length > 0)
          }
        >
          {savingMatch && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          Guardar Partido
        </Button>

        {/* Ghost Player Dialog */}
        <Dialog open={showGhostDialog} onOpenChange={setShowGhostDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Jugador Invitado</DialogTitle>
              <DialogDescription>
                Creá un perfil para un amigo que no tiene cuenta
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  placeholder="Nombre del jugador"
                  value={newGhostName}
                  onChange={(e) => setNewGhostName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Categoría Estimada</Label>
                <Select
                  value={newGhostCategory}
                  onValueChange={(v) =>
                    setNewGhostCategory(v as PlayerCategory)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]} ({CATEGORY_ELO_MAP[cat]} pts)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={handleCreateGhost}
                disabled={!newGhostName.trim() || creatingGhost}
              >
                {creatingGhost && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <UserPlus className="mr-2 h-4 w-4" />
                Crear Jugador
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* WhatsApp Share Dialog */}
        <WhatsAppShareDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          matchId={createdMatchId}
          players={
            [team1Player2, team2Player1, team2Player2].filter(
              Boolean
            ) as SelectedPlayer[]
          }
          invitations={invitations}
          matchDate={`${matchDate}T${matchTime}:00`}
          venue={venue}
          onComplete={handleShareComplete}
        />

        {/* Exit Confirmation Dialog */}
        <Dialog
          open={showExitConfirmDialog}
          onOpenChange={setShowExitConfirmDialog}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Salir sin guardar?</DialogTitle>
              <DialogDescription>
                Tenés datos sin guardar. Si salís ahora, perderás toda la
                información del partido que estás cargando.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={handleCancelExit}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleConfirmExit}>
                Salir sin guardar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

// Player Slot Component
interface PlayerSlotProps {
  player: SelectedPlayer | null;
  position: "team1-2" | "team2-1" | "team2-2";
  availablePlayers: SelectedPlayer[];
  onSelect: (
    player: SelectedPlayer,
    position: "team1-2" | "team2-1" | "team2-2"
  ) => void;
  onRemove: (position: "team1-2" | "team2-1" | "team2-2") => void;
  onCreateGhost: (position: "team1-2" | "team2-1" | "team2-2") => void;
  label?: string;
}

function PlayerSlot({
  player,
  position,
  availablePlayers,
  onSelect,
  onRemove,
  onCreateGhost,
  label,
}: PlayerSlotProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredPlayers = availablePlayers.filter((p) =>
    p.display_name.toLowerCase().includes(search.toLowerCase())
  );

  if (player) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
        <PlayerAvatar
          name={player.display_name}
          avatarUrl={player.avatar_url}
          isGhost={player.is_ghost}
          size="md"
        />
        <div className="flex-1">
          <p className="font-medium">{player.display_name}</p>
          <p className="text-xs text-muted-foreground">
            {label || (player.is_ghost ? "Invitado" : "")}
          </p>
        </div>
        <EloBadge
          elo={player.elo_score}
          category={player.category_label}
          size="sm"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onRemove(position)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-auto w-full justify-start gap-3 border-dashed p-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Plus className="h-5 w-5 text-muted-foreground" />
          </div>
          <span className="text-muted-foreground">Seleccionar jugador</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>Seleccionar Jugador</DialogTitle>
        </DialogHeader>
        <Command className="rounded-none border-0">
          <CommandInput
            placeholder="Buscar jugador..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[50vh]">
            <CommandEmpty>
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No se encontraron jugadores
                </p>
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => {
                    setOpen(false);
                    onCreateGhost(position);
                  }}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Crear jugador invitado
                </Button>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {filteredPlayers.map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.display_name}
                  onSelect={() => {
                    onSelect(p, position);
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 p-3"
                >
                  <PlayerAvatar
                    name={p.display_name}
                    avatarUrl={p.avatar_url}
                    isGhost={p.is_ghost}
                    size="sm"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{p.display_name}</p>
                    {p.is_ghost && (
                      <p className="text-xs text-muted-foreground">Invitado</p>
                    )}
                  </div>
                  <EloBadge
                    elo={p.elo_score}
                    category={p.category_label}
                    size="sm"
                  />
                </CommandItem>
              ))}
            </CommandGroup>
            <div className="border-t p-2">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  setOpen(false);
                  onCreateGhost(position);
                }}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Crear jugador invitado
              </Button>
            </div>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
