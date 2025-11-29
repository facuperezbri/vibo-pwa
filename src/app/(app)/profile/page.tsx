'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PlayerAvatar } from '@/components/ui/player-avatar'
import { EloBadge } from '@/components/ui/elo-badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Loader2,
  LogOut,
  Settings,
  Edit,
  Check,
  Ghost,
  Trash2,
} from 'lucide-react'
import type { Profile, Player } from '@/types/database'
import { PushNotificationSettings } from '@/components/notifications/push-notification-settings'
import { AvatarUpload } from '@/components/profile/avatar-upload'

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [ghostPlayers, setGhostPlayers] = useState<Player[]>([])
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({ fullName: '', username: '' })
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Only load essential fields: name, username, avatar, ELO, category
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, elo_score, category_label')
      .eq('id', user.id)
      .single()

    if (profileData) {
      setProfile(profileData as Profile)
      setFormData({
        fullName: profileData.full_name || '',
        username: profileData.username || '',
      })
    }

    // Get ghost players created by this user
    const { data: ghosts } = await supabase
      .from('players')
      .select('id, display_name, elo_score, category_label, matches_played')
      .eq('created_by_user_id', user.id)
      .eq('is_ghost', true)
      .order('display_name')

    setGhostPlayers((ghosts || []) as Player[])
    setLoading(false)
  }

  async function handleSaveProfile() {
    if (!profile) return
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
      <Header
        title="Perfil"
        rightAction={
          !loading && (
            <Button variant="ghost" size="icon" onClick={() => setEditMode(!editMode)}>
              {editMode ? <Check className="h-5 w-5" /> : <Settings className="h-5 w-5" />}
            </Button>
          )
        }
      />

      <div className="space-y-6 p-4">
        {loading ? (
          <>
            <Card className="overflow-hidden">
              <div className="h-20 bg-gradient-to-r from-primary/20 via-primary/10 to-background" />
              <CardContent className="-mt-10 pb-6">
                <div className="flex flex-col items-center text-center">
                  <div className="h-20 w-20 rounded-full bg-muted ring-4 ring-background animate-pulse" />
                  <div className="mt-4 space-y-2">
                    <div className="h-6 w-32 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                    <div className="h-8 w-20 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {success && (
          <Alert>
            <AlertDescription className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              Perfil actualizado correctamente
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Profile Card */}
        <Card className="overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-primary/20 via-primary/10 to-background" />
          <CardContent className="-mt-10 pb-6">
            <div className="flex flex-col items-center text-center">
              {editMode && profile ? (
                <AvatarUpload
                  userId={profile.id}
                  currentAvatarUrl={profile.avatar_url}
                  userName={profile.full_name || profile.username || 'Usuario'}
                  onUploadComplete={(newUrl) => {
                    setProfile({ ...profile, avatar_url: newUrl })
                  }}
                />
              ) : (
                <PlayerAvatar
                  name={profile?.full_name || profile?.username || 'Usuario'}
                  avatarUrl={profile?.avatar_url}
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
                    {profile?.full_name || profile?.username || 'Usuario'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    @{profile?.username || 'sin_username'}
                  </p>
                  <div className="mt-3">
                    <EloBadge
                      elo={profile?.elo_score || 1400}
                      category={profile?.category_label}
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
          </>
        )}
      </div>
    </>
  )
}

