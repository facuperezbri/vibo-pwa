'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Check, Ghost, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlayerAvatar } from '@/components/ui/player-avatar'
import { EloBadge } from '@/components/ui/elo-badge'
import { AvatarUpload } from '@/components/profile/avatar-upload'
import { PushNotificationSettings } from '@/components/notifications/push-notification-settings'
import { Separator } from '@/components/ui/separator'
import { LogOut } from 'lucide-react'
import { useEditMode } from './profile-edit-button-wrapper'
import { ClaimGhostPlayers } from './claim-ghost-players'
import type { Profile, Player } from '@/types/database'

interface ProfileFormProps {
  initialProfile: Profile
  initialGhostPlayers: Player[]
}

export function ProfileForm({ initialProfile, initialGhostPlayers }: ProfileFormProps) {
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<Profile>(initialProfile)
  const [ghostPlayers, setGhostPlayers] = useState<Player[]>(initialGhostPlayers)
  const { editMode, setEditMode } = useEditMode()
  const [formData, setFormData] = useState({ 
    fullName: initialProfile.full_name || '', 
    username: initialProfile.username || '' 
  })
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  async function handleSaveProfile() {
    setSaving(true)
    setError(null)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: formData.fullName,
        username: formData.username,
      })
      .eq('id', profile.id)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    // Also update the player record
    await supabase
      .from('players')
      .update({ display_name: formData.fullName || formData.username })
      .eq('profile_id', profile.id)

    setProfile({ ...profile, full_name: formData.fullName, username: formData.username })
    setEditMode(false)
    setSuccess(true)
    setSaving(false)
    setTimeout(() => setSuccess(false), 3000)
  }

  async function handleAvatarUpload(url: string | null) {
    setProfile({ ...profile, avatar_url: url })
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  async function handleDeleteGhost(ghostId: string) {
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', ghostId)

    if (!error) {
      setGhostPlayers(prev => prev.filter(g => g.id !== ghostId))
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {success && (
        <Alert className="mx-4 mt-4">
          <AlertDescription className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            Perfil actualizado correctamente
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mx-4 mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6 p-4">
        {/* Profile Card */}
        <Card className="overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-primary/20 via-primary/10 to-background" />
          <CardContent className="-mt-10 pb-6">
            <div className="flex flex-col items-center text-center">
              {editMode ? (
                <AvatarUpload
                  userId={profile.id}
                  currentAvatarUrl={profile.avatar_url}
                  userName={profile.full_name || profile.username || 'Usuario'}
                  onUploadComplete={handleAvatarUpload}
                />
              ) : (
                <PlayerAvatar
                  name={profile.full_name || profile.username || 'Usuario'}
                  avatarUrl={profile.avatar_url}
                  size="xl"
                  className="ring-4 ring-background"
                />
              )}
              
              {editMode ? (
                <div className="mt-4 w-full max-w-xs space-y-4">
                  <div className="space-y-2">
                    <Label>Nombre Completo</Label>
                    <Input
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Usuario</Label>
                    <Input
                      value={formData.username}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') 
                      })}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleSaveProfile}
                    disabled={saving}
                  >
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar Cambios
                  </Button>
                </div>
              ) : (
                <>
                  <h2 className="mt-4 text-xl font-bold">
                    {profile.full_name || profile.username || 'Usuario'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    @{profile.username || 'sin_username'}
                  </p>
                  <div className="mt-3">
                    <EloBadge
                      elo={profile.elo_score || 1400}
                      category={profile.category_label}
                      size="lg"
                    />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ghost Players */}
        {ghostPlayers.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Ghost className="h-4 w-4" />
                Jugadores Invitados ({ghostPlayers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ghostPlayers.map((ghost) => (
                <div
                  key={ghost.id}
                  className="flex items-center gap-3 rounded-lg bg-muted/50 p-3"
                >
                  <PlayerAvatar
                    name={ghost.display_name}
                    isGhost
                    size="sm"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{ghost.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ghost.matches_played} partidos
                    </p>
                  </div>
                  <EloBadge elo={ghost.elo_score} category={ghost.category_label} size="sm" />
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>¿Eliminar jugador?</DialogTitle>
                        <DialogDescription>
                          Esta acción no se puede deshacer. El jugador será eliminado permanentemente.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant="destructive"
                          onClick={() => handleDeleteGhost(ghost.id)}
                        >
                          Eliminar
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Historical Matches Claiming */}
        <div className="space-y-4">
          <Separator />
          <div>
            <h3 className="mb-2 text-sm font-medium">Partidos históricos</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Si jugaste partidos antes de registrarte, puedes vincularlos a tu cuenta buscando por nombre.
              Revisa los partidos de cada jugador para confirmar que son tuyos.
            </p>
            <ClaimGhostPlayers />
          </div>
        </div>

        {/* Push Notifications */}
        <PushNotificationSettings />

        <Separator />

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full gap-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
    </>
  )
}

