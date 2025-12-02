"use client";

import { Header } from "@/components/layout/header";
import type {
  PlayerPosition,
  PlayerWithProfiles,
  SelectedPlayer,
} from "@/components/match";
import {
  GhostPlayerDialog,
  PlayerSlot,
  toSelectedPlayer,
  WhatsAppShareDialog,
} from "@/components/match";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EloBadge } from "@/components/ui/elo-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PadelBallLoader } from "@/components/ui/padel-ball-loader";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { Switch } from "@/components/ui/switch";
import { useNavigation } from "@/contexts/navigation-context";
import { MAX_BACKDATE_DAYS } from "@/lib/constants";
import {
  canPlayThirdSet,
  getSetWinner,
  isValidCompletedSetScore,
  isValidSetScore,
  validateMatch,
} from "@/lib/padel-rules";
import { createClient } from "@/lib/supabase/client";
import type { MatchConfig, MatchInvitation, SetScore } from "@/types/database";
import { DEFAULT_MATCH_CONFIG } from "@/types/database";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

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
  const [ghostPosition, setGhostPosition] = useState<PlayerPosition | null>(
    null
  );

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
  const supabase = createClient();
  const { registerConfirmHandler } = useNavigation();
  const queryClient = useQueryClient();
  const errorRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

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
    // The trigger should have automatically created this when the profile was created
    const { data: userPlayer, error: playerError } = await supabase
      .from("players")
      .select(
        "id, display_name, is_ghost, elo_score, category_label, profile_id, matches_played, profiles!left(avatar_url)"
      )
      .eq("profile_id", user.id)
      .maybeSingle();

    if (userPlayer) {
      setCurrentUser(toSelectedPlayer(userPlayer as PlayerWithProfiles));
    } else {
      // If no player record exists, try to create it as fallback
      // This handles edge cases like old users created before the trigger existed
      // The trigger should have automatically created the player record when the profile was created
      console.warn(
        "Player record not found for user, attempting to create:",
        user.id
      );

      // First verify the profile exists
      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "id, username, full_name, avatar_url, elo_score, category_label"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        // Try to create the player record using upsert to avoid conflicts
        const { data: newPlayer, error: createError } = await supabase
          .from("players")
          .upsert(
            {
              profile_id: user.id,
              display_name: profile.full_name || profile.username || "Usuario",
              is_ghost: false,
              elo_score: profile.elo_score || 1400,
              category_label: profile.category_label || "8va",
            },
            {
              onConflict: "profile_id",
            }
          )
          .select(
            "id, display_name, is_ghost, elo_score, category_label, profile_id, matches_played"
          )
          .single();

        if (newPlayer && !createError) {
          const playerWithAvatar: SelectedPlayer = {
            ...newPlayer,
            avatar_url: profile.avatar_url,
          };
          setCurrentUser(playerWithAvatar);
        } else {
          console.error("Error creating player record:", createError);
          setError(
            "No se pudo crear tu registro de jugador. Por favor, contacta al soporte."
          );
          setLoading(false);
          return;
        }
      } else {
        console.error("Profile not found for user:", user.id);
        setError("No se encontró tu perfil. Por favor, contacta al soporte.");
        setLoading(false);
        return;
      }
    }

    // Get available players (non-ghost public + user's ghosts) with avatars
    // Query 1: All registered users (non-ghost players)
    const { data: registeredPlayers } = await supabase
      .from("players")
      .select(
        "id, display_name, is_ghost, elo_score, category_label, profile_id, matches_played, profiles!left(avatar_url)"
      )
      .eq("is_ghost", false)
      .neq("profile_id", user.id) // Exclude current user
      .order("display_name");

    // Query 2: Ghost players created by current user
    // Note: Ghost players don't have profile_id, so we don't join with profiles
    const { data: ghostPlayers } = await supabase
      .from("players")
      .select(
        "id, display_name, is_ghost, elo_score, category_label, profile_id, matches_played"
      )
      .eq("is_ghost", true)
      .eq("created_by_user_id", user.id)
      .order("display_name");

    // Combine both results and convert to SelectedPlayer format
    const allPlayers = [
      ...(registeredPlayers || []).map((p) =>
        toSelectedPlayer(p as PlayerWithProfiles)
      ),
      ...(ghostPlayers || []).map((p) =>
        toSelectedPlayer(p as PlayerWithProfiles)
      ),
    ];

    setAvailablePlayers(allPlayers);
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

  function handleGhostPlayerCreated(
    player: SelectedPlayer,
    position: PlayerPosition
  ) {
    // Add to available players and select
    setAvailablePlayers((prev) => [...prev, player]);
    handlePlayerSelect(player, position);
    setGhostPosition(null);
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
      const updatedSet = {
        ...newSets[setIndex],
        [team]: 0,
        isTiebreak: matchConfig.superTiebreak && setIndex === 2,
      };
      newSets[setIndex] = updatedSet;
      setSets(newSets);
      
      // Clear errors when clearing the field
      const newSetErrors = [...setErrors];
      if (newSetErrors[setIndex]) {
        delete newSetErrors[setIndex][team];
        delete newSetErrors[setIndex][team === "team1" ? "team2" : "team1"];
      }
      setSetErrors(newSetErrors);
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
    const updatedSet = {
      ...newSets[setIndex],
      [team]: numValue,
      isTiebreak: isSuperTiebreak,
    };
    newSets[setIndex] = updatedSet;
    setSets(newSets);

    // Clear errors for this set while typing (no validation while typing)
    const newSetErrors = [...setErrors];
    if (newSetErrors[setIndex]) {
      delete newSetErrors[setIndex][team];
      delete newSetErrors[setIndex][team === "team1" ? "team2" : "team1"];
    }
    setSetErrors(newSetErrors);

    // Auto-add third set if first two sets are won by different teams
    if (newSets.length === 2 && canPlayThirdSet(newSets)) {
      setSets([
        ...newSets,
        { team1: 0, team2: 0, isTiebreak: matchConfig.superTiebreak },
      ]);
      setSetInputValues([...newInputValues, { team1: "", team2: "" }]);
      setSetErrors([...newSetErrors, {}]);
    }
  }

  function handleSetScoreBlur(setIndex: number, team: "team1" | "team2") {
    // When input loses focus, ensure we have a number (not empty string)
    const currentValue = setInputValues[setIndex]?.[team];
    let numValue = 0;
    
    if (currentValue === "" || currentValue === undefined) {
      const newInputValues = [...setInputValues];
      newInputValues[setIndex] = { ...newInputValues[setIndex], [team]: "0" };
      setSetInputValues(newInputValues);
      numValue = 0;
    } else {
      numValue = parseInt(currentValue) || 0;
    }

    // Validate the set when losing focus (without showing errors)
    const set = sets[setIndex];
    const updatedSet = {
      ...set,
      [team]: numValue,
    };
    validateSet(setIndex, team, numValue, updatedSet, false);
  }

  function validateSet(
    setIndex: number,
    team: "team1" | "team2",
    value: number,
    updatedSet?: SetScore,
    showErrors: boolean = false
  ) {
    // Use the updated set if provided, otherwise use current state
    const set = updatedSet || sets[setIndex];
    const isSuperTiebreak = matchConfig.superTiebreak && setIndex === 2;
    const otherTeam = team === "team1" ? "team2" : "team1";

    const newSetErrors = [...setErrors];
    if (!newSetErrors[setIndex]) {
      newSetErrors[setIndex] = {};
    }

    // Validate the set score using the updated values
    const team1Score = team === "team1" ? value : set.team1;
    const team2Score = team === "team2" ? value : set.team2;

    // Clear errors for both teams first
    delete newSetErrors[setIndex][team];
    delete newSetErrors[setIndex][otherTeam];

    // Check if at least one score is entered (not both empty/zero)
    const hasAnyScore = team1Score > 0 || team2Score > 0;

    if (hasAnyScore) {
      // First check if it's a valid score pattern
      const isValidPattern = isValidSetScore(
        team1Score,
        team2Score,
        isSuperTiebreak
      );

      if (!isValidPattern) {
        // Invalid combination like 7-3 or 6-5
        if (showErrors) {
          const setLabel = isSuperTiebreak
            ? "Super Tiebreak"
            : `Set ${setIndex + 1}`;
          const errorMessage = `Resultado inválido en ${setLabel}`;
          newSetErrors[setIndex][team] = errorMessage;
          newSetErrors[setIndex][otherTeam] = errorMessage;
        }
      } else {
        // Valid pattern but check if set is complete (has a winner)
        const validation = isValidCompletedSetScore(
          team1Score,
          team2Score,
          isSuperTiebreak
        );
        if (!validation.valid && showErrors) {
          // Set doesn't have a winner yet (e.g., 5-0, 4-3, etc.)
          const setLabel = isSuperTiebreak
            ? "Super Tiebreak"
            : `Set ${setIndex + 1}`;
          newSetErrors[setIndex][team] = `${setLabel}: ${validation.error}`;
          newSetErrors[setIndex][
            otherTeam
          ] = `${setLabel}: ${validation.error}`;
        }
      }
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

  // Silent validation to check if sets have errors (without showing messages)
  function hasSetErrors(): boolean {
    for (let i = 0; i < sets.length; i++) {
      const set = sets[i];
      const isSuperTiebreak = matchConfig.superTiebreak && i === 2;
      const hasAnyScore = set.team1 > 0 || set.team2 > 0;

      if (hasAnyScore) {
        // Check if it's a valid score pattern
        const isValidPattern = isValidSetScore(
          set.team1,
          set.team2,
          isSuperTiebreak
        );

        if (!isValidPattern) {
          return true; // Invalid combination
        }

        // Check if set is complete (has a winner)
        const validation = isValidCompletedSetScore(
          set.team1,
          set.team2,
          isSuperTiebreak
        );
        if (!validation.valid) {
          return true; // Set doesn't have a winner yet
        }
      }
    }
    return false;
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

    // Validate match date is not too old
    const selectedDate = new Date(`${matchDate}T${matchTime}:00`);
    const today = new Date();
    const daysDiff = Math.floor(
      (today.getTime() - selectedDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff > MAX_BACKDATE_DAYS) {
      setError(
        `Solo podés cargar partidos de los últimos ${MAX_BACKDATE_DAYS} días`
      );
      return;
    }

    // Validate match date is not in the future
    if (selectedDate > today) {
      setError("No podés cargar partidos con fecha futura");
      return;
    }

    // Validate all sets with errors visible
    sets.forEach((set, index) => {
      validateSet(index, "team1", set.team1, set, true);
      validateSet(index, "team2", set.team2, set, true);
    });

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

    // Invalidate queries to refresh data immediately
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["profile"] }),
      queryClient.invalidateQueries({ queryKey: ["user-stats"] }),
      queryClient.invalidateQueries({ queryKey: ["player-matches"] }),
      queryClient.invalidateQueries({ queryKey: ["ranking"] }),
    ]);

    // Show share dialog if there are players to share with
    const allPlayers = [team1Player2, team2Player1, team2Player2];
    const hasPlayersToShare = allPlayers.some((p) => !p.is_ghost || p.is_ghost);

    if (hasPlayersToShare) {
      setShowShareDialog(true);
    } else {
      // Reset form and redirect immediately
      resetForm();
      router.replace("/");
      router.refresh();
    }
  }

  function resetForm() {
    // Reset players
    setTeam1Player2(null);
    setTeam2Player1(null);
    setTeam2Player2(null);

    // Reset match details
    setVenue("");
    const today = new Date();
    setMatchDate(today.toISOString().split("T")[0]);
    const timeString = today.toTimeString().slice(0, 5);
    setMatchTime(roundTimeToNearestHalfHour(timeString));

    // Reset sets
    setSets([
      { team1: 0, team2: 0 },
      { team1: 0, team2: 0 },
    ]);
    setSetInputValues([
      { team1: "", team2: "" },
      { team1: "", team2: "" },
    ]);
    setSetErrors([{}, {}]);

    // Reset validation and config
    setValidationError(null);
    setWinnerTeam(null);
    setMatchConfig(DEFAULT_MATCH_CONFIG);

    // Reset success state
    setSuccess(false);
    setError(null);

    // Scroll to top
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleShareComplete() {
    // Close dialog immediately for instant visual feedback
    // The onOpenChange handler will take care of executing heavy operations
    setShowShareDialog(false);
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
          <PadelBallLoader size="lg" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Nuevo Partido" showBack />

      <div ref={topRef} className="space-y-6 p-4">
        {error && (
          <Alert ref={errorRef} variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && !showShareDialog && (
          <Alert>
            <AlertDescription className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              ¡Partido guardado! Los puntajes fueron actualizados.
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
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                {currentUser ? (
                  <>
                    <PlayerAvatar
                      name={currentUser.display_name}
                      avatarUrl={currentUser.avatar_url}
                      size="md"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{currentUser.display_name}</p>
                      <p className="text-xs text-muted-foreground">Equipo 1</p>
                    </div>
                    <EloBadge
                      elo={currentUser.elo_score}
                      category={currentUser.category_label}
                      size="sm"
                    />
                  </>
                ) : (
                  <>
                    <PlayerAvatar name="Cargando..." size="md" />
                    <div className="flex-1">
                      <p className="font-medium text-muted-foreground">
                        Cargando...
                      </p>
                      <p className="text-xs text-muted-foreground">Equipo 1</p>
                    </div>
                  </>
                )}
              </div>

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
              />
            </CardContent>
          </Card>
        </div>

        {/* Score Input */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resultado</CardTitle>
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
                  <div className="flex items-center gap-2">
                    {currentUser && team1Player2 ? (
                      <div className="flex -space-x-2">
                        <PlayerAvatar
                          name={currentUser.display_name}
                          avatarUrl={currentUser.avatar_url}
                          isGhost={currentUser.is_ghost}
                          size="md"
                          className={`ring-2 ring-background ${
                            winnerTeam === 1 ? "ring-primary" : ""
                          }`}
                        />
                        <PlayerAvatar
                          name={team1Player2.display_name}
                          avatarUrl={team1Player2.avatar_url}
                          isGhost={team1Player2.is_ghost}
                          size="md"
                          className={`ring-2 ring-background ${
                            winnerTeam === 1 ? "ring-primary" : ""
                          }`}
                        />
                      </div>
                    ) : (
                      <span
                        className={`text-sm font-medium ${
                          winnerTeam === 1 ? "text-primary" : ""
                        }`}
                      >
                        Equipo 1
                      </span>
                    )}
                  </div>
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
                  <div className="flex items-center gap-2">
                    {team2Player1 && team2Player2 ? (
                      <div className="flex -space-x-2">
                        <PlayerAvatar
                          name={team2Player1.display_name}
                          avatarUrl={team2Player1.avatar_url}
                          isGhost={team2Player1.is_ghost}
                          size="md"
                          className={`ring-2 ring-background ${
                            winnerTeam === 2 ? "ring-primary" : ""
                          }`}
                        />
                        <PlayerAvatar
                          name={team2Player2.display_name}
                          avatarUrl={team2Player2.avatar_url}
                          isGhost={team2Player2.is_ghost}
                          size="md"
                          className={`ring-2 ring-background ${
                            winnerTeam === 2 ? "ring-primary" : ""
                          }`}
                        />
                      </div>
                    ) : (
                      <span
                        className={`text-sm font-medium ${
                          winnerTeam === 2 ? "text-primary" : ""
                        }`}
                      >
                        Equipo 2
                      </span>
                    )}
                  </div>
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
          variant="secondary"
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
            hasSetErrors()
          }
        >
          {savingMatch ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar Partido"
          )}
        </Button>

        {/* Ghost Player Dialog */}
        <GhostPlayerDialog
          open={showGhostDialog}
          onOpenChange={setShowGhostDialog}
          position={ghostPosition}
          onPlayerCreated={handleGhostPlayerCreated}
          onError={setError}
        />

        {/* WhatsApp Share Dialog */}
        <WhatsAppShareDialog
          open={showShareDialog}
          onOpenChange={(open) => {
            // Close dialog immediately for instant visual feedback
            setShowShareDialog(open);

            // Execute heavy operations after dialog closes (only if closed and match was created)
            // Note: Navigation is handled by the WhatsAppShareDialog component itself
            if (!open && success) {
              setTimeout(async () => {
                // If dialog is closed and match was successfully created, invalidate queries and reset form
                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: ["profile"] }),
                  queryClient.invalidateQueries({ queryKey: ["user-stats"] }),
                  queryClient.invalidateQueries({
                    queryKey: ["player-matches"],
                  }),
                  queryClient.invalidateQueries({ queryKey: ["ranking"] }),
                ]);
                resetForm();
              }, 200); // Small delay to allow dialog close animation
            }
          }}
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

        {/* Saving Match Loading Modal */}
        <Dialog open={savingMatch} onOpenChange={() => {}}>
          <DialogContent className="max-w-sm border-0 bg-transparent shadow-none [&>button]:hidden">
            <DialogTitle className="sr-only">Guardando partido</DialogTitle>
            <div className="flex flex-col items-center gap-4 rounded-lg bg-background p-8 shadow-lg">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center">
                <p className="text-lg font-semibold">Guardando partido...</p>
                <p className="text-sm text-muted-foreground">
                  Por favor esperá un momento
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
