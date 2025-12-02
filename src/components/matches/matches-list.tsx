'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { PlayerAvatar } from '@/components/ui/player-avatar'
import { ScoreDisplay } from '@/components/match/score-display'
import { TrendingUp, TrendingDown, MapPin, Calendar } from 'lucide-react'
import { useCurrentPlayer, usePlayerMatches, type MatchWithPlayers } from '@/lib/react-query/hooks'
import { PadelBallLoader } from '@/components/ui/padel-ball-loader'
import type { EloChanges } from '@/types/database'
import { useMemo } from 'react'

function MatchesListContent() {
  const { data: currentPlayerId, isLoading: isLoadingPlayer } = useCurrentPlayer()
  const { data: matches = [], isLoading: matchesLoading } = usePlayerMatches(currentPlayerId)

  // Only show skeleton if we don't have data yet (first load)
  const isLoading = (isLoadingPlayer && !currentPlayerId) || (matchesLoading && matches.length === 0)

  // Group matches by month
  const groupedMatches = useMemo(() => {
    return matches.reduce((groups, match) => {
      const date = new Date(match.match_date)
      const monthKey = date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
      if (!groups[monthKey]) {
        groups[monthKey] = []
      }
      groups[monthKey].push(match)
      return groups
    }, {} as Record<string, MatchWithPlayers[]>)
  }, [matches])

  if (isLoading) {
    return <MatchesListSkeleton />
  }

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Calendar className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="mb-2 text-lg font-semibold">Sin partidos aún</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Registrá tu primer partido para empezar a trackear tu puntaje
        </p>
        <Link
          href="/new-match"
          className="inline-flex items-center gap-2 rounded-lg bg-secondary px-6 py-3 font-medium text-secondary-foreground"
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
          <div className="space-y-5">
            {monthMatches.map((match) => {
              if (!currentPlayerId) return null

              // Buscar la posición del jugador registrado en el partido
              let userPosition = 0
              if (match.player_1_id === currentPlayerId) userPosition = 1
              else if (match.player_2_id === currentPlayerId) userPosition = 2
              else if (match.player_3_id === currentPlayerId) userPosition = 3
              else if (match.player_4_id === currentPlayerId) userPosition = 4
              
              const isTeam1 = userPosition <= 2
              const won = (isTeam1 && match.winner_team === 1) || (!isTeam1 && match.winner_team === 2)
              
              const eloKey = `player_${userPosition}` as 'player_1' | 'player_2' | 'player_3' | 'player_4'
              const eloChange = match.elo_changes?.[eloKey]?.change || 0

              return (
                <Link key={match.id} href={`/matches/${match.id}`} className="block">
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
                                  avatarUrl={match.player_1.avatar_url}
                                  isGhost={match.player_1.is_ghost}
                                  size="sm"
                                  className="ring-2 ring-background"
                                />
                                <PlayerAvatar
                                  name={match.player_2.display_name}
                                  avatarUrl={match.player_2.avatar_url}
                                  isGhost={match.player_2.is_ghost}
                                  size="sm"
                                  className="ring-2 ring-background"
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">vs</span>
                              <div className="flex -space-x-2">
                                <PlayerAvatar
                                  name={match.player_3.display_name}
                                  avatarUrl={match.player_3.avatar_url}
                                  isGhost={match.player_3.is_ghost}
                                  size="sm"
                                  className="ring-2 ring-background"
                                />
                                <PlayerAvatar
                                  name={match.player_4.display_name}
                                  avatarUrl={match.player_4.avatar_url}
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
                                hour12: false,
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
    <div className="flex h-[60vh] items-center justify-center">
      <PadelBallLoader size="lg" />
    </div>
  )
}

export function MatchesList() {
  return <MatchesListContent />
}

