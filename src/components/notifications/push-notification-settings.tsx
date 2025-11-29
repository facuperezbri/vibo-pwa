'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import {
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isPushNotificationSubscribed,
  isPushNotificationSupported,
  getNotificationPermissionState,
} from '@/lib/push-notifications'

export function PushNotificationSettings() {
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>('default')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkStatus()
  }, [])

  async function checkStatus() {
    setIsSupported(isPushNotificationSupported())
    setPermissionState(getNotificationPermissionState())
    
    if (isPushNotificationSupported()) {
      const subscribed = await isPushNotificationSubscribed()
      setIsSubscribed(subscribed)
    }
    
    setLoading(false)
  }

  async function handleToggle(enabled: boolean) {
    setToggling(true)
    setError(null)

    try {
      if (enabled) {
        const success = await subscribeToPushNotifications()
        if (success) {
          setIsSubscribed(true)
          setPermissionState('granted')
        } else {
          setError('No se pudo activar las notificaciones')
        }
      } else {
        await unsubscribeFromPushNotifications()
        setIsSubscribed(false)
      }
    } catch {
      setError('Error al cambiar las notificaciones')
    }

    setToggling(false)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!isSupported) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BellOff className="h-4 w-4" />
            Notificaciones Push
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Las notificaciones push no están disponibles en este navegador.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4" />
          Notificaciones Push
        </CardTitle>
        <CardDescription>
          Recibí alertas cuando te inviten a un partido
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {permissionState === 'denied' ? (
          <Alert>
            <AlertDescription>
              Las notificaciones están bloqueadas. Habilitálas desde la configuración de tu navegador.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">
                {isSubscribed ? 'Notificaciones activadas' : 'Activar notificaciones'}
              </Label>
              <p className="text-xs text-muted-foreground">
                {isSubscribed
                  ? 'Recibirás alertas de invitaciones y partidos'
                  : 'Te notificaremos sobre nuevas invitaciones'}
              </p>
            </div>
            <Switch
              checked={isSubscribed}
              onCheckedChange={handleToggle}
              disabled={toggling}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

