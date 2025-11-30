'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Player, Match } from '@/types/database'

interface UserStats {
  profile: Profile | null
  ranking: number | null
  recentMatches: Array<{
    id: string
    match_date: string
    winner_team: 1 | 2
    elo_changes: Record<string, { change: number }> | null
    player_position?: number
  }>
  loading: boolean
}

interface DataContextType {
  stats: UserStats
  refreshStats: () => Promise<void>
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<UserStats>({
    profile: null,
    ranking: null,
    recentMatches: [],
    loading: true,
  })
  const supabase = useMemo(() => createClient(), [])
  const isLoadingRef = useRef(false)

  const loadStats = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (isLoadingRef.current) {
      return
    }
    
    isLoadingRef.current = true
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setStats(prev => ({ ...prev, loading: false }))
        return
      }

      // Load profile and ranking in parallel
      const [profileResult, rankingResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single(),
        supabase
          .from('global_ranking')
          .select('rank')
          .eq('id', user.id)
          .maybeSingle()
      ])

      const profile = profileResult.data as Profile | null

      // Load player record and recent matches
      let recentMatches: UserStats['recentMatches'] = []
      
      if (profile) {
        const { data: playerRecord } = await supabase
          .from('players')
          .select('id')
          .eq('profile_id', user.id)
          .maybeSingle()

        // Obtener IDs de ghost players vinculados al usuario
        const { data: claimedGhostPlayers } = await supabase
          .from('players')
          .select('id')
          .eq('claimed_by_profile_id', user.id)
          .eq('is_ghost', true)

        const claimedGhostIds = claimedGhostPlayers?.map(p => p.id) || []
        const allPlayerIds = playerRecord 
          ? [playerRecord.id, ...claimedGhostIds]
          : claimedGhostIds

        if (allPlayerIds.length > 0) {
          // Construir la consulta OR para incluir el usuario real y sus ghost players vinculados
          const orConditions = allPlayerIds
            .map(id => `player_1_id.eq.${id},player_2_id.eq.${id},player_3_id.eq.${id},player_4_id.eq.${id}`)
            .join(',')

          const { data: matches } = await supabase
            .from('matches')
            .select('id, match_date, winner_team, elo_changes, player_1_id, player_2_id, player_3_id, player_4_id')
            .or(orConditions)
            .order('match_date', { ascending: false })
            .limit(5)

          recentMatches = (matches || []).map(match => {
            // Buscar en todos los IDs (usuario real + ghost players vinculados)
            let position = 0
            if (allPlayerIds.includes(match.player_1_id)) position = 1
            else if (allPlayerIds.includes(match.player_2_id)) position = 2
            else if (allPlayerIds.includes(match.player_3_id)) position = 3
            else if (allPlayerIds.includes(match.player_4_id)) position = 4
            
            return {
              ...match,
              player_position: position,
              elo_changes: match.elo_changes as Record<string, { change: number }> | null
            }
          })
        }
      }

      setStats({
        profile,
        ranking: rankingResult.data?.rank || null,
        recentMatches,
        loading: false,
      })
    } catch (error) {
      console.error('Error loading stats:', error)
      setStats(prev => ({ ...prev, loading: false }))
    } finally {
      isLoadingRef.current = false
    }
  }, [supabase])

  useEffect(() => {
    loadStats()

    // Subscribe to profile changes
    const profileChannel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          // Reload stats when profile changes
          loadStats()
        }
      )
      .subscribe()

    // Subscribe to match changes
    const matchesChannel = supabase
      .channel('match-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
        },
        () => {
          // Reload stats when matches change
          loadStats()
        }
      )
      .subscribe()

    // Subscribe to ranking changes
    const rankingChannel = supabase
      .channel('ranking-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'global_ranking',
        },
        () => {
          // Reload stats when ranking changes
          loadStats()
        }
      )
      .subscribe()

    return () => {
      profileChannel.unsubscribe()
      matchesChannel.unsubscribe()
      rankingChannel.unsubscribe()
    }
  }, [loadStats, supabase])

  return (
    <DataContext.Provider value={{ stats, refreshStats: loadStats }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}

