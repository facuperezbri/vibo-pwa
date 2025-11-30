import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { HeadToHeadContent } from '@/components/home/head-to-head-content'

async function RivalriesData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { data: playerRecord } = await supabase
    .from('players')
    .select('id')
    .eq('profile_id', user.id)
    .eq('is_ghost', false)
    .maybeSingle()

  const playerId = playerRecord?.id || null

  return <HeadToHeadContent playerId={playerId} />
}

export default function RivalriesPage() {
  return (
    <>
      <Header title="Rivalidades" showBack />
      <RivalriesData />
    </>
  )
}

