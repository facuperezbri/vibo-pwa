import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlayerAvatar } from '@/components/ui/player-avatar'
import { EloBadge } from '@/components/ui/elo-badge'
import { ScoreDisplay } from '@/components/match/score-display'
import { MapPin, Calendar, Trophy, TrendingUp, TrendingDown, Edit, Settings } from 'lucide-react'
import type { SetScore, EloChanges, Player, MatchConfig } from '@/types/database'

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

  const { data: match } = await supabase
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

  if (!match) {
    notFound()
  }

  const scoreSets = match.score_sets as SetScore[]
  const eloChanges = match.elo_changes as EloChanges | null
  const matchConfig = match.match_config as MatchConfig | null
  const player1 = match.player_1 as unknown as Player
  const player2 = match.player_2 as unknown as Player
  const player3 = match.player_3 as unknown as Player
  const player4 = match.player_4 as unknown as Player
  
  const isCreator = match.created_by === user.id

  return (
    <>
      <Header 
        title="Detalle del Partido" 
        showBack
        rightAction={
          isCreator ? (
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/matches/${id}/edit`}>
                <Edit className="h-5 w-5" />
              </Link>
            </Button>
          ) : undefined
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
          <CardContent className="space-y-3">
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
          <CardContent className="space-y-3">
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

  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
      <PlayerAvatar
        name={player.display_name}
        isGhost={player.is_ghost}
        size="md"
      />
      <div className="flex-1">
        <p className="font-medium">{player.display_name}</p>
        {player.is_ghost && (
          <p className="text-xs text-muted-foreground">Invitado</p>
        )}
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
}

