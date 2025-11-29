import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { ProfileSummary } from '@/components/home/profile-summary'
import { StatsGrid } from '@/components/home/stats-grid'
import { RecentMatches } from '@/components/home/recent-matches'
import { Swords } from 'lucide-react'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  return (
    <>
      <Header title="Padelio" />
      
      <div className="space-y-6 p-4">
        <ProfileSummary />
        <StatsGrid />
        <RecentMatches />

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

