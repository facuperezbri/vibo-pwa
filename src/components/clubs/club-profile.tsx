"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PadelBallLoader } from "@/components/ui/padel-ball-loader";
import { useMyClubAsOwner } from "@/lib/react-query/hooks/use-clubs";
import { createClient } from "@/lib/supabase/client";
import { Building2, MapPin } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

export function ClubProfile() {
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const { data: club, isLoading } = useMyClubAsOwner(userId);

  useEffect(() => {
    async function getUserId() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    }
    getUserId();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <PadelBallLoader size="lg" />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-destructive">No se encontró tu club</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        {club.logo_url ? (
          <Image
            src={club.logo_url}
            alt={club.name}
            width={80}
            height={80}
            className="rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-primary/10">
            <Building2 className="h-10 w-10 text-primary" />
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{club.name}</h1>
          {(club.city || club.province) && (
            <p className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {[club.city, club.province].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      {club.description && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{club.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="space-y-2">
        <Button className="w-full" variant="outline" asChild>
          <a href="/club/staff">Gestionar Staff</a>
        </Button>
        <Button className="w-full" variant="outline">
          Editar Perfil
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          La edición del perfil estará disponible próximamente
        </p>
      </div>
    </div>
  );
}

