import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { PartnerChemistryContent } from '@/components/home/partner-chemistry-content'

async function PartnerChemistryData() {
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

  return <PartnerChemistryContent playerId={playerId} />
}

export default function PartnerChemistryPage() {
  return (
    <>
      <Header title="Química de Pareja" showBack />
      <PartnerChemistryData />
    </>
  )
}

