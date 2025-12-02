import { Header } from "@/components/layout/header";
import { ClubProfile } from "@/components/clubs/club-profile";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ClubProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user is a club type
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.user_type !== "club") {
    redirect("/");
  }

  return (
    <>
      <Header title="Perfil del Club" />
      <div className="p-4">
        <ClubProfile />
      </div>
    </>
  );
}


