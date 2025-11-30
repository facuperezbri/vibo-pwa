import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlayerAvatar } from '@/components/ui/player-avatar'
import { EloBadge } from '@/components/ui/elo-badge'
import { NewPlayerBadge } from '@/components/ui/new-player-badge'
import { GhostPlayerBadge } from '@/components/ui/ghost-player-badge'
import { PlayerStats } from '@/components/player/player-stats'
import { PlayerRecentMatches } from '@/components/player/player-recent-matches'
import { PlayerMatchesWithUser } from '@/components/player/player-matches-with-user'
import { PlayerPartnerStats } from '@/components/player/player-partner-stats'
import { Trophy, Users } from 'lucide-react'
import type { Player, Profile } from '@/types/database'

interface PlayerProfileProps {
  params: Promise<{ id: string }>
}

export default async function PlayerProfilePage({ params }: PlayerProfileProps) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get player record
  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('*')
    .eq('id', id)
    .single()

  if (playerError || !player) {
    notFound()
  }

  // Get profile if player is not a ghost
  let profile: Profile | null = null
  if (player.profile_id && !player.is_ghost) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', player.profile_id)
      .single()
    
    profile = profileData as Profile | null
  }

  // Get current user's player ID for partner stats
  const { data: currentUserPlayer } = await supabase
    .from('players')
    .select('id')
    .eq('profile_id', user.id)
    .eq('is_ghost', false)
    .maybeSingle()

  const isCurrentUser = player.profile_id === user.id
  const currentUserPlayerId = currentUserPlayer?.id || null

  return (
    <>
      <Header 
        title={isCurrentUser ? "Mi Perfil" : "Perfil del Jugador"} 
        showBack
      />
      
      <div className="space-y-6 p-4">
        {/* Player Header Card */}
        <Card className="overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-primary/20 via-primary/10 to-background" />
          <CardContent className="-mt-10 pb-6">
            <div className="flex flex-col items-center text-center">
              <PlayerAvatar
                name={player.display_name}
                avatarUrl={profile?.avatar_url || null}
                isGhost={player.is_ghost}
                size="xl"
                className="ring-4 ring-background"
              />
              <h2 className="mt-4 text-xl font-bold">
                {player.display_name}
              </h2>
              <div className="mt-2 flex items-center gap-2 flex-wrap justify-center">
                {player.is_ghost && <GhostPlayerBadge />}
                <NewPlayerBadge matchesPlayed={player.matches_played || 0} />
              </div>
              <div className="mt-3">
                <EloBadge
                  elo={player.elo_score || 1400}
                  category={player.category_label}
                  size="lg"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Player Stats */}
        <PlayerStats playerId={id} />

        {/* Recent Matches */}
        <PlayerRecentMatches playerId={id} />

        {/* Matches with current user (only if not current user) */}
        {!isCurrentUser && currentUserPlayerId && (
          <PlayerMatchesWithUser 
            targetPlayerId={id}
            currentUserPlayerId={currentUserPlayerId}
          />
        )}

        {/* Partner Stats (only if not current user and they have played together) */}
        {!isCurrentUser && currentUserPlayerId && (
          <PlayerPartnerStats 
            targetPlayerId={id}
            currentUserPlayerId={currentUserPlayerId}
          />
        )}
      </div>
    </>
  )
}

