"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PadelBallLoader } from "@/components/ui/padel-ball-loader";
import { useMyClubAsOwner } from "@/lib/react-query/hooks/use-clubs";
import {
  useClubStaff,
  type ClubMemberWithProfile,
} from "@/lib/react-query/hooks/use-club-staff";
import {
  useRemoveMember,
  useUpdateMemberRole,
} from "@/lib/react-query/mutations/use-club-staff";
import { CLUB_ROLE_LABELS, type ClubRole } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { Trash2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { PlayerAvatar } from "@/components/ui/player-avatar";

const ROLE_COLORS: Record<ClubRole, string> = {
  owner: "bg-purple-500",
  admin: "bg-blue-500",
  member: "bg-gray-500",
};

export function ClubStaffManagement() {
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const { data: club, isLoading: clubLoading } = useMyClubAsOwner(userId);
  const { data: staff, isLoading: staffLoading } = useClubStaff(club?.id);

  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();

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

  if (clubLoading || staffLoading) {
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

  const handleRoleChange = async (
    membershipId: string,
    newRole: ClubRole
  ) => {
    try {
      await updateRole.mutateAsync({ membershipId, role: newRole });
    } catch (error) {
      console.error("Error updating role:", error);
    }
  };

  const handleRemoveMember = async (membershipId: string) => {
    if (
      !confirm(
        "¿Estás seguro de que querés remover a este miembro del club?"
      )
    ) {
      return;
    }

    try {
      await removeMember.mutateAsync({ membershipId });
    } catch (error) {
      console.error("Error removing member:", error);
    }
  };

  const owners = staff?.filter((m) => m.role === "owner") || [];
  const admins = staff?.filter((m) => m.role === "admin") || [];
  const members = staff?.filter((m) => m.role === "member") || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Miembros del Club</h2>
        <Button size="sm" variant="outline">
          <UserPlus className="mr-2 h-4 w-4" />
          Invitar Staff
        </Button>
      </div>

      {/* Owners */}
      {owners.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Propietarios
          </h3>
          {owners.map((member) => (
            <StaffMemberCard
              key={member.id}
              member={member}
              currentUserId={userId}
              onRoleChange={handleRoleChange}
              onRemove={handleRemoveMember}
            />
          ))}
        </div>
      )}

      {/* Admins */}
      {admins.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Administradores
          </h3>
          {admins.map((member) => (
            <StaffMemberCard
              key={member.id}
              member={member}
              currentUserId={userId}
              onRoleChange={handleRoleChange}
              onRemove={handleRemoveMember}
            />
          ))}
        </div>
      )}

      {/* Members */}
      {members.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Miembros
          </h3>
          {members.map((member) => (
            <StaffMemberCard
              key={member.id}
              member={member}
              currentUserId={userId}
              onRoleChange={handleRoleChange}
              onRemove={handleRemoveMember}
            />
          ))}
        </div>
      )}

      {staff?.length === 0 && (
        <Card>
          <CardContent className="p-4 text-center text-muted-foreground">
            No hay miembros en el club
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StaffMemberCard({
  member,
  currentUserId,
  onRoleChange,
  onRemove,
}: {
  member: ClubMemberWithProfile;
  currentUserId?: string;
  onRoleChange: (membershipId: string, role: ClubRole) => void;
  onRemove: (membershipId: string) => void;
}) {
  const isCurrentUser = member.profile_id === currentUserId;
  const isOwner = member.role === "owner";
  const canEdit = !isCurrentUser && !isOwner;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <PlayerAvatar
            name={member.profile.full_name || member.profile.username || "Usuario"}
            avatarUrl={member.profile.avatar_url}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold truncate">
                {member.profile.full_name || member.profile.username || "Usuario"}
              </h4>
              {isCurrentUser && (
                <Badge variant="outline" className="text-xs">
                  Tú
                </Badge>
              )}
            </div>
            {member.nickname && (
              <p className="text-sm text-muted-foreground">
                {member.nickname}
              </p>
            )}
            {member.jersey_number && (
              <p className="text-xs text-muted-foreground">
                #{member.jersey_number}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canEdit ? (
              <>
                <Select
                  value={member.role}
                  onValueChange={(value) =>
                    onRoleChange(member.id, value as ClubRole)
                  }
                >
                  <SelectTrigger className="h-8 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Miembro</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="owner">Propietario</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRemove(member.id)}
                  className="h-8 w-8 p-0 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Badge
                variant="secondary"
                className={`${ROLE_COLORS[member.role]} text-white`}
              >
                {CLUB_ROLE_LABELS[member.role]}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

