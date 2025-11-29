import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { EloBadge } from '@/components/ui/elo-badge'
import { PlayerAvatar } from '@/components/ui/player-avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Swords, Trophy, Target } from 'lucide-react'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get recent matches for this user
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

  // Get user's global rank
  const { data: ranking } = await supabase
    .from('global_ranking')
    .select('rank')
    .eq('id', user.id)
    .single()

  const winRate = profile?.matches_played 
    ? Math.round((profile.matches_won / profile.matches_played) * 100) 
    : 0

  return (
    <>
      <Header title="PadelTracker" />
      
      <div className="space-y-6 p-4">
        {/* Profile Summary Card */}
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <PlayerAvatar
                name={profile?.full_name || profile?.username || 'Usuario'}
                avatarUrl={profile?.avatar_url}
                size="xl"
              />
              <div className="flex-1">
                <h2 className="text-xl font-bold">
                  {profile?.full_name || profile?.username || 'Usuario'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  @{profile?.username || 'sin_username'}
                </p>
                <div className="mt-2">
                  <EloBadge 
                    elo={profile?.elo_score || 1400} 
                    category={profile?.category_label}
                    size="lg"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Swords className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{profile?.matches_played || 0}</p>
                <p className="text-xs text-muted-foreground">Partidos</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                <Trophy className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{profile?.matches_won || 0}</p>
                <p className="text-xs text-muted-foreground">Victorias</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <Target className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{winRate}%</p>
                <p className="text-xs text-muted-foreground">Win Rate</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <TrendingUp className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">#{ranking?.rank || '-'}</p>
                <p className="text-xs text-muted-foreground">Ranking</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Matches */}
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

        {/* Quick Action */}
        <Link
          href="/new-match"
          className="flex items-center justify-center gap-2 rounded-xl bg-primary py-4 font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
        >
          <Swords className="h-5 w-5" />
          Registrar Nuevo Partido
        </Link>
      </div>
    </>
  )
}

