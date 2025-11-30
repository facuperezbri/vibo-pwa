import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlayerAvatar } from '@/components/ui/player-avatar'
import { EloBadge } from '@/components/ui/elo-badge'
import { NewPlayerBadge } from '@/components/ui/new-player-badge'
import { GhostPlayerBadge } from '@/components/ui/ghost-player-badge'
import { ScoreDisplay } from '@/components/match/score-display'
import { MapPin, Calendar, Trophy, TrendingUp, TrendingDown, Edit, Settings } from 'lucide-react'
import type { SetScore, EloChanges, Player, MatchConfig } from '@/types/database'
import { ShareButton } from './share-button'

interface MatchDetailProps {
  params: Promise<{ id: string }>
}

export default async function MatchDetailPage({ params }: MatchDetailProps) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Primero obtener el partido sin joins complejos de profiles
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select(`
      *,
      player_1:players!matches_player_1_id_fkey(*),
      player_2:players!matches_player_2_id_fkey(*),
      player_3:players!matches_player_3_id_fkey(*),
      player_4:players!matches_player_4_id_fkey(*)
    `)
    .eq('id', id)
    .single()

  if (matchError || !match) {
    notFound()
  }

  // Obtener avatares por separado
  const profileIds = new Set<string>()
  const players = [match.player_1, match.player_2, match.player_3, match.player_4] as any[]
  players.forEach(player => {
    if (player?.profile_id && !player.is_ghost) {
      profileIds.add(player.profile_id)
    }
  })

  let avatarsMap: Record<string, string | null> = {}
  if (profileIds.size > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, avatar_url')
      .in('id', Array.from(profileIds))

    if (profiles) {
      profiles.forEach(profile => {
        avatarsMap[profile.id] = profile.avatar_url
      })
    }
  }

  // Helper function to get avatar_url
  const getAvatarUrl = (player: any): string | null => {
    if (player.is_ghost || !player.profile_id) return null
    return avatarsMap[player.profile_id] || null
  }

  const scoreSets = match.score_sets as SetScore[]
  const eloChanges = match.elo_changes as EloChanges | null
  const matchConfig = match.match_config as MatchConfig | null
  const player1 = { ...(match.player_1 as unknown as Player), avatar_url: getAvatarUrl(match.player_1) } as Player & { avatar_url?: string | null }
  const player2 = { ...(match.player_2 as unknown as Player), avatar_url: getAvatarUrl(match.player_2) } as Player & { avatar_url?: string | null }
  const player3 = { ...(match.player_3 as unknown as Player), avatar_url: getAvatarUrl(match.player_3) } as Player & { avatar_url?: string | null }
  const player4 = { ...(match.player_4 as unknown as Player), avatar_url: getAvatarUrl(match.player_4) } as Player & { avatar_url?: string | null }
  
  const isCreator = match.created_by === user.id

  return (
    <>
      <Header 
        title="Detalle del Partido" 
        showBack
        rightAction={
          <div className="flex items-center gap-1">
            <ShareButton
              matchId={id}
              matchDate={match.match_date}
              venue={match.venue}
              players={[player1, player2, player3, player4]}
            />
            {isCreator && (
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/matches/${id}/edit`}>
                  <Edit className="h-5 w-5" />
                </Link>
              </Button>
            )}
          </div>
        }
      />
      
      <div className="space-y-6 p-4">
        {/* Match Config Badges */}
        {matchConfig && (matchConfig.goldenPoint || matchConfig.superTiebreak) && (
          <div className="flex flex-wrap gap-2">
            {matchConfig.goldenPoint && (
              <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-500">
                Golden Point
              </span>
            )}
            {matchConfig.superTiebreak && (
              <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-500">
                Super Tie-break
              </span>
            )}
          </div>
        )}

        {/* Match Info */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {new Date(match.match_date).toLocaleDateString('es-AR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}{' '}
            a las{' '}
            {new Date(match.match_date).toLocaleTimeString('es-AR', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })}
          </span>
          {match.venue && (
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {match.venue}
            </span>
          )}
        </div>

        {/* Score Card */}
        <Card>
          <CardContent className="p-6">
            <ScoreDisplay
              sets={scoreSets}
              winnerTeam={match.winner_team}
              team1Players={[player1, player2]}
              team2Players={[player3, player4]}
            />
          </CardContent>
        </Card>

        {/* Team 1 */}
        <Card className={match.winner_team === 1 ? 'ring-2 ring-primary' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              Equipo 1
              {match.winner_team === 1 && (
                <span className="flex items-center gap-1 text-sm font-normal text-primary">
                  <Trophy className="h-4 w-4" />
                  Ganador
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <PlayerRow
              player={player1}
              eloChange={eloChanges?.player_1}
              won={match.winner_team === 1}
            />
            <PlayerRow
              player={player2}
              eloChange={eloChanges?.player_2}
              won={match.winner_team === 1}
            />
          </CardContent>
        </Card>

        {/* Team 2 */}
        <Card className={match.winner_team === 2 ? 'ring-2 ring-primary' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              Equipo 2
              {match.winner_team === 2 && (
                <span className="flex items-center gap-1 text-sm font-normal text-primary">
                  <Trophy className="h-4 w-4" />
                  Ganador
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <PlayerRow
              player={player3}
              eloChange={eloChanges?.player_3}
              won={match.winner_team === 2}
            />
            <PlayerRow
              player={player4}
              eloChange={eloChanges?.player_4}
              won={match.winner_team === 2}
            />
          </CardContent>
        </Card>

        {/* Notes */}
        {match.notes && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Notas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{match.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}

interface PlayerRowProps {
  player: Player
  eloChange?: { before: number; after: number; change: number }
  won: boolean
}

function PlayerRow({ player, eloChange, won }: PlayerRowProps) {
  const changeValue = eloChange?.change || 0
  const avatarUrl = (player as Player & { avatar_url?: string | null }).avatar_url
  const playerId = player.id

  const content = (
    <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3 cursor-pointer transition-colors hover:bg-muted">
      <PlayerAvatar
        name={player.display_name}
        avatarUrl={avatarUrl}
        isGhost={player.is_ghost}
        size="md"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium">{player.display_name}</p>
          {player.is_ghost && <GhostPlayerBadge />}
          <NewPlayerBadge matchesPlayed={player.matches_played || 0} />
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {eloChange && (
          <div className="flex items-center gap-1 text-sm">
            <span className="font-mono text-muted-foreground">
              {Math.round(eloChange.before)}
            </span>
            <span className="text-muted-foreground">→</span>
            <span className="font-mono font-medium">
              {Math.round(eloChange.after)}
            </span>
          </div>
        )}
        <div
          className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
            changeValue >= 0
              ? 'bg-green-500/20 text-green-500'
              : 'bg-red-500/20 text-red-500'
          }`}
        >
          {changeValue >= 0 ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {changeValue >= 0 ? '+' : ''}{Math.round(changeValue)}
        </div>
      </div>
    </div>
  )

  return (
    <Link href={`/player/${playerId}`} className="block">
      {content}
    </Link>
  )
}

