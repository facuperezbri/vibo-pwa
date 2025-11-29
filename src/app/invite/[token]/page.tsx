'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PlayerAvatar } from '@/components/ui/player-avatar'
import { 
  Loader2, 
  Calendar, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  Swords,
  User,
  LogIn
} from 'lucide-react'
import type { InvitationDetails } from '@/types/database'

interface InvitePageProps {
  params: Promise<{ token: string }>
}

export default function InvitePage({ params }: InvitePageProps) {
  const { token } = use(params)
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState(false)
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<'accepted' | 'rejected' | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadInvitation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function loadInvitation() {
    setLoading(true)
    setError(null)

    try {
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)
      setUserId(user?.id || null)

      // Get invitation details using the RPC function
      const { data, error: rpcError } = await supabase
        .rpc('get_invitation_by_token', { token })

      if (rpcError) {
        setError('Error al cargar la invitación')
        setLoading(false)
        return
      }

      if (!data || data.length === 0) {
        setError('Invitación no encontrada o expirada')
        setLoading(false)
        return
      }

      setInvitation(data[0])
    } catch {
      setError('Error al cargar la invitación')
    }

    setLoading(false)
  }

  async function handleResponse(responseType: 'accepted' | 'rejected') {
    setResponding(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabase
        .rpc('respond_to_invitation', {
          p_token: token,
          p_response: responseType,
          p_user_id: userId,
        })

      if (rpcError || !data?.success) {
        setError(data?.error || 'Error al responder')
        setResponding(false)
        return
      }

      setResponse(responseType)

      // Redirect to match details after a delay
      setTimeout(() => {
        if (isLoggedIn && invitation?.match_id) {
          router.push(`/matches/${invitation.match_id}`)
        } else {
          router.push('/login')
        }
      }, 2000)
    } catch {
      setError('Error al responder')
    }

    setResponding(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !invitation) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center p-6 text-center">
            <XCircle className="mb-4 h-12 w-12 text-destructive" />
            <h2 className="mb-2 text-xl font-semibold">
              {error || 'Invitación no encontrada'}
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">
              El link puede haber expirado o ya fue utilizado.
            </p>
            <Button asChild>
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Ir a PadelTracker
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Already responded
  if (invitation.status !== 'pending') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center p-6 text-center">
            {invitation.status === 'accepted' ? (
              <CheckCircle className="mb-4 h-12 w-12 text-green-500" />
            ) : (
              <XCircle className="mb-4 h-12 w-12 text-red-500" />
            )}
            <h2 className="mb-2 text-xl font-semibold">
              Invitación ya {invitation.status === 'accepted' ? 'aceptada' : 'rechazada'}
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Esta invitación ya fue respondida anteriormente.
            </p>
            {isLoggedIn ? (
              <Button asChild>
                <Link href={`/matches/${invitation.match_id}`}>
                  Ver Partido
                </Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/login">
                  <LogIn className="mr-2 h-4 w-4" />
                  Iniciar Sesión
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Response submitted
  if (response) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center p-6 text-center">
            {response === 'accepted' ? (
              <>
                <CheckCircle className="mb-4 h-12 w-12 text-green-500" />
                <h2 className="mb-2 text-xl font-semibold">¡Partido Confirmado!</h2>
                <p className="text-sm text-muted-foreground">
                  Redirigiendo al partido...
                </p>
              </>
            ) : (
              <>
                <XCircle className="mb-4 h-12 w-12 text-muted-foreground" />
                <h2 className="mb-2 text-xl font-semibold">Partido Rechazado</h2>
                <p className="text-sm text-muted-foreground">
                  Redirigiendo...
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const dateStr = new Date(invitation.match_date).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background via-background to-primary/5 p-4">
      {/* Logo */}
      <div className="mb-6 flex flex-col items-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
          <Swords className="h-7 w-7 text-primary-foreground" />
        </div>
        <h1 className="text-xl font-bold">PadelTracker</h1>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Invitación al Partido</CardTitle>
          <CardDescription>
            {invitation.created_by_name} te invitó a confirmar un partido
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Match Info */}
          <div className="space-y-3 rounded-lg bg-muted/50 p-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="capitalize">{dateStr}</span>
            </div>
            {invitation.venue && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{invitation.venue}</span>
              </div>
            )}
          </div>

          {/* Players */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Jugadores</p>
            <div className="grid grid-cols-2 gap-2">
              {invitation.player_names.map((name, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-lg bg-muted/30 p-2"
                >
                  <PlayerAvatar name={name} size="sm" />
                  <span className="truncate text-sm">{name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Login prompt if not logged in */}
          {!isLoggedIn && (
            <Alert>
              <User className="h-4 w-4" />
              <AlertDescription>
                <Link href={`/login?redirect=/invite/${token}`} className="font-medium text-primary hover:underline">
                  Iniciá sesión
                </Link>
                {' '}para vincular este partido a tu cuenta y trackear tu ELO.
              </AlertDescription>
            </Alert>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleResponse('rejected')}
              disabled={responding}
            >
              {responding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <XCircle className="mr-2 h-4 w-4" />
              Rechazar
            </Button>
            <Button
              className="flex-1"
              onClick={() => handleResponse('accepted')}
              disabled={responding}
            >
              {responding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <CheckCircle className="mr-2 h-4 w-4" />
              Confirmar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

