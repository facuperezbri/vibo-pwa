import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

async function RecentMatchesContent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data: playerRecord } = await supabase
    .from('players')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  let recentMatches: Array<{
    id: string
    match_date: string
    winner_team: 1 | 2
    elo_changes: Record<string, { change: number }> | null
    player_position?: number
  }> = []

  if (playerRecord) {
    const { data: matches } = await supabase
      .from('matches')
      .select('id, match_date, winner_team, elo_changes, player_1_id, player_2_id, player_3_id, player_4_id')
      .or(`player_1_id.eq.${playerRecord.id},player_2_id.eq.${playerRecord.id},player_3_id.eq.${playerRecord.id},player_4_id.eq.${playerRecord.id}`)
      .order('match_date', { ascending: false })
      .limit(5)

    recentMatches = (matches || []).map(match => {
      let position = 0
      if (match.player_1_id === playerRecord.id) position = 1
      else if (match.player_2_id === playerRecord.id) position = 2
      else if (match.player_3_id === playerRecord.id) position = 3
      else if (match.player_4_id === playerRecord.id) position = 4
      
      return {
        ...match,
        player_position: position,
        elo_changes: match.elo_changes as Record<string, { change: number }> | null
      }
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Partidos Recientes</CardTitle>
          <Link href="/matches" className="text-sm text-primary hover:underline">
            Ver todos
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {recentMatches.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Aún no has jugado ningún partido
          </p>
        ) : (
          recentMatches.map((match) => {
            const position = match.player_position || 0
            const isTeam1 = position <= 2
            const won = (isTeam1 && match.winner_team === 1) || (!isTeam1 && match.winner_team === 2)
            const eloKey = `player_${position}` as const
            const eloChange = match.elo_changes?.[eloKey]?.change || 0

            return (
              <Link
                key={match.id}
                href={`/matches/${match.id}`}
                className="flex items-center justify-between rounded-lg bg-muted/50 p-3 transition-colors hover:bg-muted"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      won ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                    }`}
                  >
                    {won ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {won ? 'Victoria' : 'Derrota'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(match.match_date).toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'short',
                      })}{' '}
                      {new Date(match.match_date).toLocaleTimeString('es-AR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    eloChange >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {eloChange >= 0 ? '+' : ''}{Math.round(eloChange)}
                </span>
              </Link>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

function RecentMatchesSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function RecentMatches() {
  return (
    <Suspense fallback={<RecentMatchesSkeleton />}>
      <RecentMatchesContent />
    </Suspense>
  )
}

