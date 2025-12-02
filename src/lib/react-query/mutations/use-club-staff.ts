"use client";

import { createClient } from "@/lib/supabase/client";
import type { ClubRole } from "@/types/database";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clubStaffKeys } from "../hooks/use-club-staff";

interface UpdateMemberRoleParams {
  membershipId: string;
  role: ClubRole;
}

interface RemoveMemberParams {
  membershipId: string;
}

async function updateMemberRole({
  membershipId,
  role,
}: UpdateMemberRoleParams) {
  const supabase = createClient();

  const { error } = await supabase
    .from("club_memberships")
    .update({ role })
    .eq("id", membershipId);

  if (error) {
    throw new Error(error.message);
  }
}

async function removeMember({ membershipId }: RemoveMemberParams) {
  const supabase = createClient();

  const { error } = await supabase
    .from("club_memberships")
    .update({ is_active: false })
    .eq("id", membershipId);

  if (error) {
    throw new Error(error.message);
  }
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateMemberRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubStaffKeys.all });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubStaffKeys.all });
    },
  });
}

