import { ClubDetail } from "@/components/clubs/club-detail";
import { Header } from "@/components/layout/header";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

interface ClubPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ClubPage({ params }: ClubPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <Header title="Club" showBack />
      <div className="p-4">
        <ClubDetail slug={slug} />
      </div>
    </>
  );
}
