"use client";

import { createClient } from "@/lib/supabase/client";
import type { ClubMembership, Profile } from "@/types/database";
import { useQuery } from "@tanstack/react-query";
import { QUERY_STALE_TIME } from "@/lib/constants";

export interface ClubMemberWithProfile extends ClubMembership {
  profile: Profile;
}

export const clubStaffKeys = {
  all: ["club-staff"] as const,
  byClub: (clubId: string) => [...clubStaffKeys.all, "by-club", clubId] as const,
};

async function fetchClubStaff(clubId: string): Promise<ClubMemberWithProfile[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("club_memberships")
    .select(
      `
      *,
      profile:profiles(*)
    `
    )
    .eq("club_id", clubId)
    .eq("is_active", true)
    .order("role", { ascending: false })
    .order("joined_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as ClubMemberWithProfile[];
}

export function useClubStaff(clubId: string | undefined) {
  return useQuery({
    queryKey: clubStaffKeys.byClub(clubId || ""),
    queryFn: () => fetchClubStaff(clubId!),
    staleTime: QUERY_STALE_TIME,
    enabled: Boolean(clubId),
  });
}

