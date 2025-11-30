import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { PlayerAllMatches } from '@/components/player/player-all-matches'

interface PlayerMatchesProps {
  params: Promise<{ id: string }>
}

export default async function PlayerMatchesPage({ params }: PlayerMatchesProps) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get player record
  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('id, display_name')
    .eq('id', id)
    .single()

  if (playerError || !player) {
    notFound()
  }

  return (
    <>
      <Header title="Últimos Partidos" showBack />
      <PlayerAllMatches playerId={id} />
    </>
  )
}

