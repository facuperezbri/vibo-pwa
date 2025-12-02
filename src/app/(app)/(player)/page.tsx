"use client";

import { HeadToHeadRivalry } from "@/components/home/head-to-head-rivalry";
import { PartnerChemistry } from "@/components/home/partner-chemistry";
import { ProfileSummary } from "@/components/home/profile-summary";
import { RecentMatches } from "@/components/home/recent-matches";
import { StatsGrid } from "@/components/home/stats-grid";
import { Header } from "@/components/layout/header";
import { PartnerChemistryDebug } from "@/components/debug/partner-chemistry-debug";
import { useProfile } from "@/lib/react-query/hooks";
import { isPlayerProfileComplete } from "@/lib/profile-utils";
import { Swords } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const { data: profileData, isLoading } = useProfile();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && profileData) {
      const { profile, user } = profileData;
      
      // Verify profile is complete - additional check for safety
      if (!profile || (profile.user_type === "player" && !isPlayerProfileComplete(profile, user))) {
        router.push("/complete-profile");
      }
    }
  }, [isLoading, profileData, router]);

  // Render immediately - components will show their own skeletons while loading
  return (
    <>
      <Header title="Vibo" showLogo />

      <div className="space-y-6 p-4">
        <ProfileSummary />
        <StatsGrid />
        <PartnerChemistryDebug />
        <PartnerChemistry />
        <HeadToHeadRivalry />
        <RecentMatches />

        {/* Quick Action */}
        <Link
          href="/new-match"
          className="flex items-center justify-center gap-2 rounded-xl bg-secondary py-4 font-semibold text-secondary-foreground transition-transform active:scale-[0.98]"
        >
          <Swords className="h-5 w-5" />
          Registrar Nuevo Partido
        </Link>
      </div>
    </>
  );
}
