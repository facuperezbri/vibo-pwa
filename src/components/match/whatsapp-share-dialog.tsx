"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import type { MatchInvitation, Player } from "@/types/database";
import { Check, Copy, ExternalLink, MessageCircle, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type SelectedPlayer = Pick<
  Player,
  | "id"
  | "display_name"
  | "is_ghost"
  | "elo_score"
  | "category_label"
  | "profile_id"
> & {
  avatar_url?: string | null;
};

interface WhatsAppShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string | null;
  players: SelectedPlayer[];
  invitations: MatchInvitation[];
  matchDate: string;
  venue: string;
  onComplete: () => void;
  redirectOnClose?: boolean; // Optional: whether to redirect on close (default: true for backward compatibility)
}

export function WhatsAppShareDialog({
  open,
  onOpenChange,
  matchId,
  players,
  invitations,
  matchDate,
  venue,
  onComplete,
  redirectOnClose = true, // Default to true for backward compatibility
}: WhatsAppShareDialogProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const router = useRouter();

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  function handleClose() {
    // Call onComplete callback
    onComplete();
    // Only navigate to home page if redirectOnClose is true
    if (redirectOnClose) {
      // Navigate immediately without delay
      router.push("/");
    }
  }

  function getInviteLink(player: SelectedPlayer): string {
    // Use public share link for all players - anyone can view and register
    if (matchId) {
      return `${baseUrl}/share/${matchId}`;
    }

    // Fallback to match link if no matchId
    return `${baseUrl}/matches/${matchId}`;
  }

  function generateWhatsAppMessage(player: SelectedPlayer): string {
    const matchDateTime = new Date(matchDate);
    const dateStr = matchDateTime.toLocaleDateString("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const timeStr = matchDateTime.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const invitation = invitations.find(
      (inv) => inv.invited_player_id === player.id
    );
    const link = getInviteLink(player);

    let message = `¡Hola ${player.display_name}! 🏓\n\n`;
    message += `Mirá el resultado del partido de padel del ${dateStr} a las ${timeStr}`;
    if (venue) {
      message += ` en ${venue}`;
    }
    message += `.\n\n`;
    message += `Ver resultado y vincular tu cuenta:\n${link}`;

    if (player.is_ghost) {
      message += `\n\nSi sos ${player.display_name}, podés registrarte y vincular este partido a tu cuenta para trackear tus partidos.`;
    }

    message += `\n\n¡Nos vemos en la cancha! 💪`;

    return encodeURIComponent(message);
  }

  function handleWhatsAppShare(player: SelectedPlayer) {
    const message = generateWhatsAppMessage(player);
    window.open(`https://wa.me/?text=${message}`, "_blank");
  }

  function handleCopyLink(player: SelectedPlayer) {
    const link = getInviteLink(player);
    navigator.clipboard.writeText(link);
    setCopiedId(player.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleShareAll() {
    // Generate a single message for all players
    const matchDateTime = new Date(matchDate);
    const dateStr = matchDateTime.toLocaleDateString("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const timeStr = matchDateTime.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    let message = `¡Partido de padel registrado! 🏓\n\n`;
    message += `📅 ${dateStr} a las ${timeStr}`;
    if (venue) {
      message += `\n📍 ${venue}`;
    }
    message += `\n\n`;
    message += `Ver resultado: ${baseUrl}/share/${matchId}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          handleClose();
        } else {
          onOpenChange(open);
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Compartir Partido
          </DialogTitle>
          <DialogDescription>
            Invitá a los jugadores a confirmar el partido por WhatsApp
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Individual player shares */}
          <div className="space-y-2">
            {players.map((player) => {
              const invitation = invitations.find(
                (inv) => inv.invited_player_id === player.id
              );
              const hasInvitation = !!invitation && !player.is_ghost;

              return (
                <div
                  key={player.id}
                  className="flex items-center gap-3 rounded-lg bg-muted/50 p-3"
                >
                  <PlayerAvatar
                    name={player.display_name}
                    avatarUrl={player.avatar_url}
                    isGhost={player.is_ghost}
                    size="sm"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{player.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {player.is_ghost
                        ? "Invitado (sin cuenta)"
                        : hasInvitation
                        ? "Puede confirmar"
                        : "Ver resultado"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopyLink(player)}
                      title="Copiar link"
                    >
                      {copiedId === player.id ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-green-600 hover:text-green-700"
                      onClick={() => handleWhatsAppShare(player)}
                      title="Enviar por WhatsApp"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Share all button */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleShareAll}
            >
              <ExternalLink className="h-4 w-4" />
              Compartir General
            </Button>
            <Button className="flex-1 gap-2" onClick={handleClose}>
              <Check className="h-4 w-4" />
              Listo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
