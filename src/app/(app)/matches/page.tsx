import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { MatchesList } from '@/components/matches/matches-list'

export default async function MatchesPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  return (
    <>
      <Header title="Mis Partidos" />
      <div className="p-4">
        <MatchesList />
      </div>
    </>
  )
}

