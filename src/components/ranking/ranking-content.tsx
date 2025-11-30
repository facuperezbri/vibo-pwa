"use client"

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PlayerAvatar } from '@/components/ui/player-avatar'
import { EloBadge } from '@/components/ui/elo-badge'
import { NewPlayerBadge } from '@/components/ui/new-player-badge'
import { Trophy, Medal, Award, Users } from 'lucide-react'
import type { GlobalRanking, PlayerCategory } from '@/types/database'
import { CATEGORIES, CATEGORY_LABELS } from '@/types/database'
import { Skeleton } from '@/components/ui/skeleton'
import { usePlayerIdByProfile } from '@/lib/react-query/hooks'

interface RankingContentProps {
  rankings: GlobalRanking[]
  currentUserId: string | null
}

export function RankingContent({ rankings, currentUserId }: RankingContentProps) {
  const [selectedGender, setSelectedGender] = useState<'masculino' | 'femenino'>('masculino')
  const [selectedCategory, setSelectedCategory] = useState<PlayerCategory | 'all'>('all')

  // Filter rankings by gender and category
  const filteredRankings = useMemo(() => {
    let filtered = rankings.filter(player => {
      // Filter by gender
      if (selectedGender === 'masculino' && player.gender !== 'Masculino') return false
      if (selectedGender === 'femenino' && player.gender !== 'Femenino') return false
      
      // Filter by category
      if (selectedCategory !== 'all' && player.category_label !== selectedCategory) return false
      
      return true
    })

    // Sort by elo_score descending
    return filtered.sort((a, b) => b.elo_score - a.elo_score)
  }, [rankings, selectedGender, selectedCategory])

  const userRankIndex = currentUserId ? filteredRankings.findIndex(r => r.id === currentUserId) : -1
  const userRank = userRankIndex !== -1 ? filteredRankings[userRankIndex] : null

  return (
    <>
      {userRank && (
        <Card className="mb-6 overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20">
                <span className="text-2xl font-bold text-primary">
                  #{userRankIndex + 1}
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

      {/* Category Filter */}
      <div className="mb-4">
        <Select
          value={selectedCategory}
          onValueChange={(value) => setSelectedCategory(value as PlayerCategory | 'all')}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {CATEGORY_LABELS[category]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Gender Tabs */}
      <Tabs value={selectedGender} onValueChange={(value) => setSelectedGender(value as 'masculino' | 'femenino')} className="w-full">
        <TabsList className="mb-4 grid w-full grid-cols-2">
          <TabsTrigger value="masculino" className="gap-2">
            <Users className="h-4 w-4" />
            Masculino
          </TabsTrigger>
          <TabsTrigger value="femenino" className="gap-2">
            <Users className="h-4 w-4" />
            Femenino
          </TabsTrigger>
        </TabsList>

        <TabsContent value="masculino" className="space-y-2">
          {filteredRankings.length === 0 ? (
            <EmptyState />
          ) : (
            filteredRankings.map((player, index) => (
              <RankingRow
                key={player.id}
                rank={index + 1}
                profileId={player.id}
                name={player.full_name || player.username || 'Usuario'}
                avatarUrl={player.avatar_url}
                elo={player.elo_score}
                category={player.category_label}
                matchesPlayed={player.matches_played}
                winRate={player.win_rate}
                isCurrentUser={currentUserId ? player.id === currentUserId : false}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="femenino" className="space-y-2">
          {filteredRankings.length === 0 ? (
            <EmptyState />
          ) : (
            filteredRankings.map((player, index) => (
              <RankingRow
                key={player.id}
                rank={index + 1}
                profileId={player.id}
                name={player.full_name || player.username || 'Usuario'}
                avatarUrl={player.avatar_url}
                elo={player.elo_score}
                category={player.category_label}
                matchesPlayed={player.matches_played}
                winRate={player.win_rate}
                isCurrentUser={currentUserId ? player.id === currentUserId : false}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
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
  profileId: string
  name: string
  avatarUrl?: string | null
  elo: number
  category: PlayerCategory
  matchesPlayed: number
  winRate: number
  isCurrentUser?: boolean
}

function RankingRow({
  rank,
  profileId,
  name,
  avatarUrl,
  elo,
  category,
  matchesPlayed,
  winRate,
  isCurrentUser,
}: RankingRowProps) {
  const { data: playerId, isLoading: loading } = usePlayerIdByProfile(profileId)

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

  // Only show loading state if we don't have playerId yet (first load)
  if (loading && !playerId) {
    return (
      <Card className={isCurrentUser ? 'ring-2 ring-primary' : ''}>
        <CardContent className="flex items-center gap-3 p-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center">
            {getRankIcon()}
          </div>
          <PlayerAvatar name={name} avatarUrl={avatarUrl} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="truncate font-medium">{name}</p>
            </div>
          </div>
          <EloBadge elo={elo} category={category} size="sm" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Link href={`/player/${playerId}`}>
      <Card className={`cursor-pointer transition-colors hover:bg-muted/50 ${isCurrentUser ? 'ring-2 ring-primary' : ''}`}>
        <CardContent className="flex items-center gap-3 p-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center">
            {getRankIcon()}
          </div>
          
          <PlayerAvatar
            name={name}
            avatarUrl={avatarUrl}
            size="md"
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="truncate font-medium">{name}</p>
              <NewPlayerBadge matchesPlayed={matchesPlayed} />
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
    </Link>
  )
}

export function RankingSkeleton() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <PadelBallLoader size="lg" />
    </div>
  )
}

