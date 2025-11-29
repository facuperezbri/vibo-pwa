import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { RankingContentWrapper } from '@/components/ranking/ranking-content'

export default async function RankingPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  return (
    <>
      <Header title="Ranking" />
      <div className="p-4">
        <RankingContentWrapper />
      </div>
    </>
  )
}

