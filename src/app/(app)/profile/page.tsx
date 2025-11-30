import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileContent } from '@/components/profile/profile-content'
import { ProfileSkeleton } from '@/components/skeletons/profile-skeleton'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { HelpCircle } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'
import type { Player, Profile } from '@/types/database'

async function ProfileData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Load profile and ghost players in parallel
  const [profileResult, ghostPlayersResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, elo_score, category_label, country, province, phone, email, gender')
      .eq('id', user.id)
      .single(),
    supabase
      .from('players')
      .select('id, display_name, elo_score, category_label, matches_played')
      .eq('created_by_user_id', user.id)
      .eq('is_ghost', true)
      .order('display_name')
  ])

  const profile = profileResult.data as Profile | null
  const ghostPlayers = (ghostPlayersResult.data || []) as Player[]

  if (!profile) {
    redirect('/complete-profile')
  }

  return <ProfileContent profile={profile} ghostPlayers={ghostPlayers} />
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <>
        <Header
          title="Perfil"
          rightAction={
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="touch-target"
                asChild
              >
                <Link href="/help">
                  <HelpCircle className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          }
        />
        <ProfileSkeleton />
      </>
    }>
      <ProfileData />
    </Suspense>
  )
}
