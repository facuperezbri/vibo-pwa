"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PadelBallLoader } from "@/components/ui/padel-ball-loader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMyClubAsOwner } from "@/lib/react-query/hooks/use-clubs";
import { useTournamentsByClub } from "@/lib/react-query/hooks/use-tournaments";
import {
  useTournamentRegistrations,
  type TournamentRegistrationWithPlayers,
} from "@/lib/react-query/hooks/use-tournament-registrations";
import {
  useMarkPayment,
  useUpdateRegistrationStatus,
} from "@/lib/react-query/mutations/use-tournament-registrations";
import {
  REGISTRATION_STATUS_LABELS,
  type RegistrationStatus,
} from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { Check, X, DollarSign } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const STATUS_COLORS: Record<RegistrationStatus, string> = {
  pending: "bg-yellow-500",
  confirmed: "bg-green-500",
  waitlist: "bg-gray-500",
  cancelled: "bg-red-500",
};

export function ClubRegistrations() {
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [selectedTournamentId, setSelectedTournamentId] = useState<
    string | null
  >(null);
  const { data: club, isLoading: clubLoading } = useMyClubAsOwner(userId);
  const { data: tournaments, isLoading: tournamentsLoading } =
    useTournamentsByClub(club?.id);
  const { data: registrations, isLoading: registrationsLoading } =
    useTournamentRegistrations(selectedTournamentId || undefined);

  const updateStatus = useUpdateRegistrationStatus();
  const markPayment = useMarkPayment();

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

  // Auto-select first tournament with registrations
  useEffect(() => {
    if (tournaments && tournaments.length > 0 && !selectedTournamentId) {
      const tournamentWithRegs = tournaments.find(
        (t) => t.registration_count > 0
      );
      if (tournamentWithRegs) {
        setSelectedTournamentId(tournamentWithRegs.id);
      }
    }
  }, [tournaments, selectedTournamentId]);

  if (clubLoading || tournamentsLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <PadelBallLoader size="lg" />
      </div>
    );
  }

  const tournamentsWithRegistrations =
    tournaments?.filter((t) => t.registration_count > 0) || [];

  const handleStatusChange = async (
    registrationId: string,
    newStatus: RegistrationStatus
  ) => {
    try {
      await updateStatus.mutateAsync({
        registrationId,
        status: newStatus,
      });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handlePaymentToggle = async (
    registrationId: string,
    paid: boolean
  ) => {
    try {
      await markPayment.mutateAsync({ registrationId, paid });
    } catch (error) {
      console.error("Error updating payment:", error);
    }
  };

  if (tournamentsWithRegistrations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">
          No hay inscripciones pendientes
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tournament Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seleccionar Torneo</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedTournamentId || ""}
            onValueChange={setSelectedTournamentId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un torneo" />
            </SelectTrigger>
            <SelectContent>
              {tournamentsWithRegistrations.map((tournament) => (
                <SelectItem key={tournament.id} value={tournament.id}>
                  {tournament.name} ({tournament.registration_count}{" "}
                  inscripciones)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Registrations List */}
      {selectedTournamentId && (
        <>
          {registrationsLoading ? (
            <div className="flex h-[50vh] items-center justify-center">
              <PadelBallLoader size="lg" />
            </div>
          ) : registrations && registrations.length > 0 ? (
            <div className="space-y-3">
              {registrations.map((registration) => (
                <RegistrationCard
                  key={registration.id}
                  registration={registration}
                  onStatusChange={handleStatusChange}
                  onPaymentToggle={handlePaymentToggle}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-4 text-center text-muted-foreground">
                No hay inscripciones para este torneo
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function RegistrationCard({
  registration,
  onStatusChange,
  onPaymentToggle,
}: {
  registration: TournamentRegistrationWithPlayers;
  onStatusChange: (
    registrationId: string,
    status: RegistrationStatus
  ) => void;
  onPaymentToggle: (registrationId: string, paid: boolean) => void;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            {registration.team_name ? (
              <h4 className="font-semibold">{registration.team_name}</h4>
            ) : (
              <h4 className="font-semibold">
                {registration.player_1.display_name} &{" "}
                {registration.player_2.display_name}
              </h4>
            )}
            <p className="text-sm text-muted-foreground">
              {registration.player_1.display_name} /{" "}
              {registration.player_2.display_name}
            </p>
          </div>
          <Badge
            variant="secondary"
            className={`${STATUS_COLORS[registration.status]} text-white shrink-0`}
          >
            {REGISTRATION_STATUS_LABELS[registration.status]}
          </Badge>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <Select
            value={registration.status}
            onValueChange={(value) =>
              onStatusChange(registration.id, value as RegistrationStatus)
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="confirmed">Confirmada</SelectItem>
              <SelectItem value="waitlist">Lista de Espera</SelectItem>
              <SelectItem value="cancelled">Cancelada</SelectItem>
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant={registration.paid ? "default" : "outline"}
            onClick={() => onPaymentToggle(registration.id, !registration.paid)}
            className="h-8"
          >
            <DollarSign className="h-3 w-3 mr-1" />
            {registration.paid ? "Pagado" : "Marcar Pago"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

