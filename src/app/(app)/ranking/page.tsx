import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PlayerAvatar } from '@/components/ui/player-avatar'
import { EloBadge } from '@/components/ui/elo-badge'
import { Trophy, Medal, Award, Users } from 'lucide-react'
import type { GlobalRanking, PlayerCategory } from '@/types/database'

export default async function RankingPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get global ranking
  const { data: rankings } = await supabase
    .from('global_ranking')
    .select('*')
    .order('elo_score', { ascending: false })
    .limit(100)

  const globalRankings = (rankings || []) as GlobalRanking[]

  // Get all players (including ghosts for "All Players" tab)
  const { data: allPlayers } = await supabase
    .from('player_stats')
    .select('*')
    .gt('matches_played', 0)
    .order('elo_score', { ascending: false })
    .limit(100)

  // Find current user's rank
  const userRank = globalRankings.find(r => r.id === user.id)

  return (
    <>
      <Header title="Ranking" />
      
      <div className="p-4">
        {/* User's Position Card */}
        {userRank && (
          <Card className="mb-6 overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20">
                  <span className="text-2xl font-bold text-primary">
                    #{userRank.rank}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Tu posición</p>
                  <div className="flex items-center gap-2">
                    <EloBadge
                      elo={userRank.elo_score}
                      category={userRank.category_label}
                      size="lg"
                    />
                    <span className="text-sm text-muted-foreground">
                      {userRank.win_rate}% winrate
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="registered" className="w-full">
          <TabsList className="mb-4 grid w-full grid-cols-2">
            <TabsTrigger value="registered" className="gap-2">
              <Users className="h-4 w-4" />
              Registrados
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              <Trophy className="h-4 w-4" />
              Todos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="registered" className="space-y-2">
            {globalRankings.length === 0 ? (
              <EmptyState />
            ) : (
              globalRankings.map((player, index) => (
                <RankingRow
                  key={player.id}
                  rank={index + 1}
                  name={player.full_name || player.username || 'Usuario'}
                  avatarUrl={player.avatar_url}
                  elo={player.elo_score}
                  category={player.category_label}
                  matchesPlayed={player.matches_played}
                  winRate={player.win_rate}
                  isCurrentUser={player.id === user.id}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-2">
            {!allPlayers || allPlayers.length === 0 ? (
              <EmptyState />
            ) : (
              allPlayers.map((player, index) => (
                <RankingRow
                  key={player.id}
                  rank={index + 1}
                  name={player.display_name}
                  isGhost={player.is_ghost}
                  elo={player.elo_score}
                  category={player.category_label}
                  matchesPlayed={player.matches_played}
                  winRate={player.win_rate}
                  isCurrentUser={player.profile_id === user.id}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Trophy className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="mb-2 text-lg font-semibold">Sin ranking aún</h2>
      <p className="text-sm text-muted-foreground">
        Registrá partidos para aparecer en el ranking
      </p>
    </div>
  )
}

interface RankingRowProps {
  rank: number
  name: string
  avatarUrl?: string | null
  isGhost?: boolean
  elo: number
  category: PlayerCategory
  matchesPlayed: number
  winRate: number
  isCurrentUser?: boolean
}

function RankingRow({
  rank,
  name,
  avatarUrl,
  isGhost,
  elo,
  category,
  matchesPlayed,
  winRate,
  isCurrentUser,
}: RankingRowProps) {
  const getRankIcon = () => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-amber-500" />
    if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />
    if (rank === 3) return <Award className="h-5 w-5 text-amber-700" />
    return (
      <span className="flex h-5 w-5 items-center justify-center text-sm font-semibold text-muted-foreground">
        {rank}
      </span>
    )
  }

  return (
    <Card className={isCurrentUser ? 'ring-2 ring-primary' : ''}>
      <CardContent className="flex items-center gap-3 p-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center">
          {getRankIcon()}
        </div>
        
        <PlayerAvatar
          name={name}
          avatarUrl={avatarUrl}
          isGhost={isGhost}
          size="md"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{name}</p>
            {isGhost && (
              <span className="text-xs text-muted-foreground">(Invitado)</span>
            )}
            {isCurrentUser && (
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                Vos
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {matchesPlayed} partidos · {winRate}% victorias
          </p>
        </div>
        
        <EloBadge elo={elo} category={category} size="sm" />
      </CardContent>
    </Card>
  )
}

