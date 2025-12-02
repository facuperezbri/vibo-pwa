import { ClubsList } from "@/components/clubs/clubs-list";
import { Header } from "@/components/layout/header";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ClubsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <Header title="Clubes" />
      <div className="p-4">
        <ClubsList />
      </div>
    </>
  );
}
