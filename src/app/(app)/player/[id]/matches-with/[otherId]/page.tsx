import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { PlayerMatchesWithUserAll } from '@/components/player/player-matches-with-user-all'

interface PlayerMatchesWithProps {
  params: Promise<{ id: string; otherId: string }>
}

export default async function PlayerMatchesWithPage({ params }: PlayerMatchesWithProps) {
  const { id, otherId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get player records
  const [targetPlayerResult, otherPlayerResult] = await Promise.all([
    supabase
      .from('players')
      .select('id, display_name')
      .eq('id', id)
      .single(),
    supabase
      .from('players')
      .select('id, display_name')
      .eq('id', otherId)
      .single()
  ])

  if (targetPlayerResult.error || !targetPlayerResult.data) {
    notFound()
  }

  if (otherPlayerResult.error || !otherPlayerResult.data) {
    notFound()
  }

  return (
    <>
      <Header title="Partidos Juntos" showBack />
      <PlayerMatchesWithUserAll targetPlayerId={id} otherPlayerId={otherId} />
    </>
  )
}

