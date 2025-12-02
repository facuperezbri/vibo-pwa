import { Header } from "@/components/layout/header";
import { TournamentsList } from "@/components/tournaments/tournaments-list";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function TournamentsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <Header title="Torneos" />
      <div className="p-4">
        <TournamentsList />
      </div>
    </>
  );
}
