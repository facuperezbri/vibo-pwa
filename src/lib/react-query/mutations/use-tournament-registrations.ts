"use client";

import { createClient } from "@/lib/supabase/client";
import type { RegistrationStatus } from "@/types/database";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tournamentRegistrationKeys } from "../hooks/use-tournament-registrations";

interface UpdateRegistrationStatusParams {
  registrationId: string;
  status: RegistrationStatus;
}

interface MarkPaymentParams {
  registrationId: string;
  paid: boolean;
}

async function updateRegistrationStatus({
  registrationId,
  status,
}: UpdateRegistrationStatusParams) {
  const supabase = createClient();

  const { error } = await supabase
    .from("tournament_registrations")
    .update({ status })
    .eq("id", registrationId);

  if (error) {
    throw new Error(error.message);
  }
}

async function markPayment({ registrationId, paid }: MarkPaymentParams) {
  const supabase = createClient();

  const updateData: any = { paid };
  if (paid) {
    updateData.paid_at = new Date().toISOString();
  } else {
    updateData.paid_at = null;
  }

  const { error } = await supabase
    .from("tournament_registrations")
    .update(updateData)
    .eq("id", registrationId);

  if (error) {
    throw new Error(error.message);
  }
}

export function useUpdateRegistrationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateRegistrationStatus,
    onSuccess: (_, variables) => {
      // Invalidate all tournament registration queries
      queryClient.invalidateQueries({
        queryKey: tournamentRegistrationKeys.all,
      });
    },
  });
}

export function useMarkPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tournamentRegistrationKeys.all,
      });
    },
  });
}

