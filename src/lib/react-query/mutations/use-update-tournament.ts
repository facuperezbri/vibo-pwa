"use client";

import { createClient } from "@/lib/supabase/client";
import type { TournamentUpdate } from "@/types/database";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tournamentKeys } from "../hooks/use-tournaments";

interface UpdateTournamentParams {
  tournamentId: string;
  data: TournamentUpdate;
}

async function updateTournament({
  tournamentId,
  data,
}: UpdateTournamentParams) {
  const supabase = createClient();

  const { error } = await supabase
    .from("tournaments")
    .update(data)
    .eq("id", tournamentId);

  if (error) {
    throw new Error(error.message);
  }
}

export function useUpdateTournament() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTournament,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
    },
  });
}

