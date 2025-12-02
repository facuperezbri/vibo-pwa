"use client";

import { createClient } from "@/lib/supabase/client";
import type { TournamentRegistration, Player } from "@/types/database";
import { useQuery } from "@tanstack/react-query";
import { QUERY_STALE_TIME } from "@/lib/constants";

export interface TournamentRegistrationWithPlayers extends TournamentRegistration {
  player_1: Player;
  player_2: Player;
}

export const tournamentRegistrationKeys = {
  all: ["tournament-registrations"] as const,
  byTournament: (tournamentId: string) =>
    [...tournamentRegistrationKeys.all, "by-tournament", tournamentId] as const,
};

async function fetchTournamentRegistrations(
  tournamentId: string
): Promise<TournamentRegistrationWithPlayers[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("tournament_registrations")
    .select(
      `
      *,
      player_1:players!player_1_id(*),
      player_2:players!player_2_id(*)
    `
    )
    .eq("tournament_id", tournamentId)
    .order("registered_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as TournamentRegistrationWithPlayers[];
}

export function useTournamentRegistrations(tournamentId: string | undefined) {
  return useQuery({
    queryKey: tournamentRegistrationKeys.byTournament(tournamentId || ""),
    queryFn: () => fetchTournamentRegistrations(tournamentId!),
    staleTime: QUERY_STALE_TIME,
    enabled: Boolean(tournamentId),
  });
}

