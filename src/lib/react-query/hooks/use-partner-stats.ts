import { createClient } from "@/lib/supabase/client";
import { PartnerStats } from "@/types/database";
import { useQuery } from "@tanstack/react-query";

export function usePartnerStats(playerId: string | null) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["partner-stats", playerId],
    queryFn: async () => {
      if (!playerId) {
        return [];
      }

      const { data, error } = await supabase.rpc("get_player_partner_stats", {
        target_player_id: playerId,
      });

      // Debug logging - TODO: Remove after fixing the issue
      console.log('[usePartnerStats] Debug:', {
        playerId,
        resultCount: data?.length || 0,
        data: data || [],
        error: error?.message || null
      });

      if (error) {
        throw error;
      }

      return (data || []) as PartnerStats[];
    },
    enabled: !!playerId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
