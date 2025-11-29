'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, User, Swords } from 'lucide-react'
import { CATEGORIES, CATEGORY_ELO_MAP, CATEGORY_LABELS, type PlayerCategory } from '@/types/database'

export default function CompleteProfilePage() {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    category: '6ta' as PlayerCategory,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    loadUserData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadUserData() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    // Check if profile already exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profile && profile.category_label) {
      // Profile already complete, redirect
      router.push('/')
      return
    }

    // Pre-fill with OAuth data
    const metadata = user.user_metadata || {}
    setFormData({
      fullName: metadata.full_name || metadata.name || '',
      username: metadata.username || metadata.preferred_username || '',
      category: '6ta',
    })

    setLoading(false)
  }

  async function handleComplete(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const initialElo = CATEGORY_ELO_MAP[formData.category]

    try {
      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName || null,
          username: formData.username || null,
          elo_score: initialElo,
          category_label: formData.category,
        })
        .eq('id', user.id)

      if (updateError) {
        setError(updateError.message)
        setSaving(false)
        return
      }

      // Update player record
      await supabase
        .from('players')
        .update({
          display_name: formData.fullName || formData.username || 'Usuario',
          elo_score: initialElo,
          category_label: formData.category,
        })
        .eq('profile_id', user.id)

      router.push('/')
      router.refresh()
    } catch {
      setError('Error al completar el perfil')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      {/* Logo/Brand */}
      <div className="mb-6 flex flex-col items-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
          <Swords className="h-7 w-7 text-primary-foreground" />
        </div>
        <h1 className="text-xl font-bold">Padelio</h1>
      </div>

      <Card className="w-full max-w-sm border-0 bg-card/50 backdrop-blur">
        <CardHeader className="space-y-1 pb-4 text-center">
          <CardTitle className="text-xl">Completá tu Perfil</CardTitle>
          <CardDescription>
            Necesitamos algunos datos para empezar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleComplete} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre Completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Juan Pérez"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                <Input
                  id="username"
                  type="text"
                  placeholder="juanperez"
                  value={formData.username}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') 
                  })}
                  className="pl-8"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Tu Categoría de Padel</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value as PlayerCategory })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tu categoría" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      <div className="flex items-center justify-between gap-4">
                        <span>{CATEGORY_LABELS[cat]}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {CATEGORY_ELO_MAP[cat]} pts
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Tu ELO inicial será de {CATEGORY_ELO_MAP[formData.category]} puntos
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continuar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

