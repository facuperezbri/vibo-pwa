"use client";

import { Card, CardContent } from "@/components/ui/card";
import { EloBadge } from "@/components/ui/elo-badge";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { useData } from "@/contexts/data-context";

export function ProfileSummary() {
  const { stats } = useData();

  if (stats.loading) {
    return (
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/10 via-background to-background">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-6 w-32 bg-muted rounded animate-pulse" />
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-8 w-20 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/10 via-background to-background">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <PlayerAvatar
            name={
              stats.profile?.full_name || stats.profile?.username || "Usuario"
            }
            avatarUrl={stats.profile?.avatar_url}
            size="xl"
          />
          <div className="flex-1">
            <h2 className="text-xl font-bold">
              {stats.profile?.full_name || stats.profile?.username || "Usuario"}
            </h2>
            <p className="text-sm text-muted-foreground">
              @{stats.profile?.username || "sin_username"}
            </p>
            <div className="mt-2">
              <EloBadge
                elo={stats.profile?.elo_score || 1400}
                category={stats.profile?.category_label}
                size="lg"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
