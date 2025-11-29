"use client";

import { Header } from "@/components/layout/header";
import {
  ProfileEditButtonWrapper,
  ProfileEditModeProvider,
} from "@/components/profile/profile-edit-button-wrapper";
import { ProfileForm } from "@/components/profile/profile-form";
import { createClient } from "@/lib/supabase/client";
import type { Player, Profile } from "@/types/database";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ghostPlayers, setGhostPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    // Load profile data from client (no server round-trip)
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, elo_score, category_label")
      .eq("id", user.id)
      .single();

    if (profileData) {
      setProfile(profileData as Profile);
    }

    // Get ghost players (can be lazy-loaded, but load them here for now)
    const { data: ghosts } = await supabase
      .from("players")
      .select("id, display_name, elo_score, category_label, matches_played")
      .eq("created_by_user_id", user.id)
      .eq("is_ghost", true)
      .order("display_name");

    setGhostPlayers((ghosts || []) as Player[]);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Show header immediately, content loads asynchronously
  if (loading || !profile) {
    return (
      <ProfileEditModeProvider>
        <Header title="Perfil" rightAction={<ProfileEditButtonWrapper />} />
        <div className="p-4">
          {/* Minimal loading state - page structure is already visible */}
        </div>
      </ProfileEditModeProvider>
    );
  }

  return (
    <ProfileEditModeProvider>
      <Header title="Perfil" rightAction={<ProfileEditButtonWrapper />} />
      <ProfileForm
        initialProfile={profile}
        initialGhostPlayers={ghostPlayers}
      />
    </ProfileEditModeProvider>
  );
}
