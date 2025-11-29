import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { PlayerAvatar } from '@/components/ui/player-avatar'
import { EloBadge } from '@/components/ui/elo-badge'
import { Skeleton } from '@/components/ui/skeleton'

async function ProfileSummaryContent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
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
  )
}

function ProfileSummarySkeleton() {
  return (
    <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/10 via-background to-background">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ProfileSummary() {
  return (
    <Suspense fallback={<ProfileSummarySkeleton />}>
      <ProfileSummaryContent />
    </Suspense>
  )
}

