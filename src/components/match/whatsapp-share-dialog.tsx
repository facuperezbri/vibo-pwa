'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PlayerAvatar } from '@/components/ui/player-avatar'
import { Check, Copy, MessageCircle, Share2, ExternalLink } from 'lucide-react'
import type { Player, MatchInvitation } from '@/types/database'

type SelectedPlayer = Pick<Player, 'id' | 'display_name' | 'is_ghost' | 'elo_score' | 'category_label' | 'profile_id'> & {
  avatar_url?: string | null
}

interface WhatsAppShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  matchId: string | null
  players: SelectedPlayer[]
  invitations: MatchInvitation[]
  matchDate: string
  venue: string
  onComplete: () => void
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
}: WhatsAppShareDialogProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const router = useRouter()

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  function handleClose() {
    onComplete()
    // Always navigate to home page when dialog closes
    setTimeout(() => {
      router.push('/')
    }, 200)
  }

  function getInviteLink(player: SelectedPlayer): string {
    // Find invitation for this player
    const invitation = invitations.find(inv => inv.invited_player_id === player.id)
    
    if (invitation) {
      return `${baseUrl}/invite/${invitation.invite_token}`
    }
    
    // For ghost players or players without invitations, use the match link
    return `${baseUrl}/matches/${matchId}`
  }

  function generateWhatsAppMessage(player: SelectedPlayer): string {
    const matchDateTime = new Date(matchDate)
    const dateStr = matchDateTime.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    const timeStr = matchDateTime.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    
    const invitation = invitations.find(inv => inv.invited_player_id === player.id)
    const link = getInviteLink(player)
    
    let message = `¡Hola ${player.display_name}! 🏓\n\n`
    message += `Te invito a confirmar el partido de padel del ${dateStr} a las ${timeStr}`
    if (venue) {
      message += ` en ${venue}`
    }
    message += `.\n\n`
    
    if (invitation) {
      message += `Confirmá tu participación acá:\n${link}`
    } else {
      message += `Mirá el resultado acá:\n${link}`
    }
    
    message += `\n\n¡Nos vemos en la cancha! 💪`
    
    return encodeURIComponent(message)
  }

  function handleWhatsAppShare(player: SelectedPlayer) {
    const message = generateWhatsAppMessage(player)
    window.open(`https://wa.me/?text=${message}`, '_blank')
  }

  function handleCopyLink(player: SelectedPlayer) {
    const link = getInviteLink(player)
    navigator.clipboard.writeText(link)
    setCopiedId(player.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function handleShareAll() {
    // Generate a single message for all players
    const matchDateTime = new Date(matchDate)
    const dateStr = matchDateTime.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    const timeStr = matchDateTime.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    
    let message = `¡Partido de padel registrado! 🏓\n\n`
    message += `📅 ${dateStr} a las ${timeStr}`
    if (venue) {
      message += `\n📍 ${venue}`
    }
    message += `\n\n`
    message += `Ver resultado: ${baseUrl}/matches/${matchId}`
    
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) {
        handleClose()
      } else {
        onOpenChange(open)
      }
    }}>
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
              const invitation = invitations.find(inv => inv.invited_player_id === player.id)
              const hasInvitation = !!invitation && !player.is_ghost

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
                      {player.is_ghost ? 'Invitado (sin cuenta)' : hasInvitation ? 'Puede confirmar' : 'Ver resultado'}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
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
                      className="h-8 w-8 text-green-600 hover:text-green-700"
                      onClick={() => handleWhatsAppShare(player)}
                      title="Enviar por WhatsApp"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
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
            <Button
              className="flex-1 gap-2"
              onClick={handleClose}
            >
              <Check className="h-4 w-4" />
              Listo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

