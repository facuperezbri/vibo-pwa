import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { PlayerAvatar } from '@/components/ui/player-avatar'
import { ScoreDisplay } from '@/components/match/score-display'
import { TrendingUp, TrendingDown, MapPin, Calendar } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { SetScore, EloChanges, Player } from '@/types/database'

interface MatchWithPlayers {
  id: string
  match_date: string
  venue: string | null
  score_sets: SetScore[]
  winner_team: 1 | 2
  elo_changes: EloChanges | null
  player_1: Player
  player_2: Player
  player_3: Player
  player_4: Player
}

async function MatchesListContent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data: playerRecord } = await supabase
    .from('players')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  // Obtener IDs de ghost players vinculados al usuario
  const { data: claimedGhostPlayers } = await supabase
    .from('players')
    .select('id')
    .eq('claimed_by_profile_id', user.id)
    .eq('is_ghost', true)

  const claimedGhostIds = claimedGhostPlayers?.map(p => p.id) || []
  const allPlayerIds = playerRecord 
    ? [playerRecord.id, ...claimedGhostIds]
    : claimedGhostIds

  let matches: MatchWithPlayers[] = []

  if (allPlayerIds.length > 0) {
    // Construir la consulta OR para incluir el usuario real y sus ghost players vinculados
    const orConditions = allPlayerIds
      .map(id => `player_1_id.eq.${id},player_2_id.eq.${id},player_3_id.eq.${id},player_4_id.eq.${id}`)
      .join(',')

    const { data } = await supabase
      .from('matches')
      .select(`
        id,
        match_date,
        venue,
        score_sets,
        winner_team,
        elo_changes,
        player_1:players!matches_player_1_id_fkey(id, display_name, is_ghost, elo_score, category_label),
        player_2:players!matches_player_2_id_fkey(id, display_name, is_ghost, elo_score, category_label),
        player_3:players!matches_player_3_id_fkey(id, display_name, is_ghost, elo_score, category_label),
        player_4:players!matches_player_4_id_fkey(id, display_name, is_ghost, elo_score, category_label)
      `)
      .or(orConditions)
      .order('match_date', { ascending: false })

    matches = (data || []).map(m => ({
      ...m,
      score_sets: m.score_sets as SetScore[],
      elo_changes: m.elo_changes as EloChanges | null,
      player_1: m.player_1 as unknown as Player,
      player_2: m.player_2 as unknown as Player,
      player_3: m.player_3 as unknown as Player,
      player_4: m.player_4 as unknown as Player,
    }))
  }

  // Group matches by month
  const groupedMatches = matches.reduce((groups, match) => {
    const date = new Date(match.match_date)
    const monthKey = date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    if (!groups[monthKey]) {
      groups[monthKey] = []
    }
    groups[monthKey].push(match)
    return groups
  }, {} as Record<string, MatchWithPlayers[]>)

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Calendar className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="mb-2 text-lg font-semibold">Sin partidos aún</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Registrá tu primer partido para empezar a trackear tu ELO
        </p>
        <Link
          href="/new-match"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground"
        >
          Registrar Partido
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedMatches).map(([month, monthMatches]) => (
        <div key={month}>
          <h2 className="mb-3 text-sm font-medium capitalize text-muted-foreground">
            {month}
          </h2>
          <div className="space-y-3">
            {monthMatches.map((match) => {
              // Buscar en todos los IDs (usuario real + ghost players vinculados)
              let userPosition = 0
              if (allPlayerIds.includes(match.player_1.id)) userPosition = 1
              else if (allPlayerIds.includes(match.player_2.id)) userPosition = 2
              else if (allPlayerIds.includes(match.player_3.id)) userPosition = 3
              else if (allPlayerIds.includes(match.player_4.id)) userPosition = 4
              
              const isTeam1 = userPosition <= 2
              const won = (isTeam1 && match.winner_team === 1) || (!isTeam1 && match.winner_team === 2)
              
              const eloKey = `player_${userPosition}` as keyof EloChanges
              const eloChange = match.elo_changes?.[eloKey]?.change || 0

              return (
                <Link key={match.id} href={`/matches/${match.id}`}>
                  <Card className="transition-colors hover:bg-muted/50">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div
                          className={`mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                            won ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                          }`}
                        >
                          {won ? (
                            <TrendingUp className="h-5 w-5" />
                          ) : (
                            <TrendingDown className="h-5 w-5" />
                          )}
                        </div>

                        <div className="flex-1 space-y-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="flex -space-x-2">
                                <PlayerAvatar
                                  name={match.player_1.display_name}
                                  isGhost={match.player_1.is_ghost}
                                  size="sm"
                                  className="ring-2 ring-background"
                                />
                                <PlayerAvatar
                                  name={match.player_2.display_name}
                                  isGhost={match.player_2.is_ghost}
                                  size="sm"
                                  className="ring-2 ring-background"
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">vs</span>
                              <div className="flex -space-x-2">
                                <PlayerAvatar
                                  name={match.player_3.display_name}
                                  isGhost={match.player_3.is_ghost}
                                  size="sm"
                                  className="ring-2 ring-background"
                                />
                                <PlayerAvatar
                                  name={match.player_4.display_name}
                                  isGhost={match.player_4.is_ghost}
                                  size="sm"
                                  className="ring-2 ring-background"
                                />
                              </div>
                            </div>
                          </div>

                          <ScoreDisplay
                            sets={match.score_sets}
                            winnerTeam={match.winner_team}
                            compact
                          />

                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>
                              {new Date(match.match_date).toLocaleDateString('es-AR', {
                                day: 'numeric',
                                month: 'short',
                              })}{' '}
                              {new Date(match.match_date).toLocaleTimeString('es-AR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {match.venue && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {match.venue}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div
                          className={`text-right font-mono text-sm font-semibold ${
                            eloChange >= 0 ? 'text-green-500' : 'text-red-500'
                          }`}
                        >
                          {eloChange >= 0 ? '+' : ''}{Math.round(eloChange)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function MatchesListSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2].map((month) => (
        <div key={month} className="space-y-3">
          <Skeleton className="h-6 w-32" />
          {[1, 2].map((match) => (
            <Card key={match}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-4 w-8" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-6 w-12" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ))}
    </div>
  )
}

export function MatchesList() {
  return (
    <Suspense fallback={<MatchesListSkeleton />}>
      <MatchesListContent />
    </Suspense>
  )
}

