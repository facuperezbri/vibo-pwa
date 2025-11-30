'use client'

import { PartnerStatsComponent } from '@/components/profile/partner-stats'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export function PartnerChemistry() {
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadPlayerId() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setLoading(false)
        return
      }

      const { data: playerRecord } = await supabase
        .from('players')
        .select('id')
        .eq('profile_id', user.id)
        .eq('is_ghost', false)
        .maybeSingle()

      setPlayerId(playerRecord?.id || null)
      setLoading(false)
    }

    loadPlayerId()
  }, [supabase])

  return <PartnerStatsComponent playerId={playerId} limit={3} showViewAllLink={true} initialLoading={loading} />
}

