import { HeadToHeadRivalry } from "@/components/home/head-to-head-rivalry";
import { HomeRefresh } from "@/components/home/home-refresh";
import { PartnerChemistry } from "@/components/home/partner-chemistry";
import { ProfileSummary } from "@/components/home/profile-summary";
import { RecentMatches } from "@/components/home/recent-matches";
import { StatsGrid } from "@/components/home/stats-grid";
import { Header } from "@/components/layout/header";
import { createClient } from "@/lib/supabase/server";
import { Swords } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <HomeRefresh />
      <Header title="Padelio" />

      <div className="space-y-6 p-4">
        <ProfileSummary />
        <StatsGrid />
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
