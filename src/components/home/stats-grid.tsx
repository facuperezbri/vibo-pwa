import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Swords, Trophy, Target, TrendingUp } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

async function StatsGridContent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: ranking } = await supabase
    .from('global_ranking')
    .select('rank')
    .eq('id', user.id)
    .single()

  const winRate = profile?.matches_played 
    ? Math.round((profile.matches_won / profile.matches_played) * 100) 
    : 0

  return (
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
  )
}

function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent className="flex items-center gap-3 p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-3 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function StatsGrid() {
  return (
    <Suspense fallback={<StatsGridSkeleton />}>
      <StatsGridContent />
    </Suspense>
  )
}

