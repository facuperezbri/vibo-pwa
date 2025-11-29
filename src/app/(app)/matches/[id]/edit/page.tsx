'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { PlayerAvatar } from '@/components/ui/player-avatar'
import { EloBadge } from '@/components/ui/elo-badge'
import { Loader2, Check, Trophy, Trash2, AlertTriangle } from 'lucide-react'
import type { Match, Player, SetScore, MatchConfig } from '@/types/database'
import { DEFAULT_MATCH_CONFIG } from '@/types/database'

interface EditMatchPageProps {
  params: Promise<{ id: string }>
}

interface MatchWithPlayers extends Match {
  player_1: Player
  player_2: Player
  player_3: Player
  player_4: Player
}

export default function EditMatchPage({ params }: EditMatchPageProps) {
  const { id } = use(params)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const [match, setMatch] = useState<MatchWithPlayers | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  
  // Editable fields
  const [venue, setVenue] = useState('')
  const [matchDate, setMatchDate] = useState('')
  const [matchTime, setMatchTime] = useState('')
  const [sets, setSets] = useState<SetScore[]>([])
  const [winnerTeam, setWinnerTeam] = useState<1 | 2 | null>(null)
  const [matchConfig, setMatchConfig] = useState<MatchConfig>(DEFAULT_MATCH_CONFIG)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadMatch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function loadMatch() {
    setLoading(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setCurrentUserId(user.id)

    const { data: matchData } = await supabase
      .from('matches')
      .select(`
        *,
        player_1:players!matches_player_1_id_fkey(*),
        player_2:players!matches_player_2_id_fkey(*),
        player_3:players!matches_player_3_id_fkey(*),
        player_4:players!matches_player_4_id_fkey(*)
      `)
      .eq('id', id)
      .single()

    if (!matchData) {
      setError('Partido no encontrado')
      setLoading(false)
      return
    }

    // Check if user is the creator
    if (matchData.created_by !== user.id) {
      setError('No tenés permiso para editar este partido')
      setLoading(false)
      return
    }

    const fullMatch: MatchWithPlayers = {
      ...matchData,
      score_sets: matchData.score_sets as SetScore[],
      match_config: (matchData.match_config as MatchConfig) || DEFAULT_MATCH_CONFIG,
      player_1: matchData.player_1 as unknown as Player,
      player_2: matchData.player_2 as unknown as Player,
      player_3: matchData.player_3 as unknown as Player,
      player_4: matchData.player_4 as unknown as Player,
    }

    setMatch(fullMatch)
    setVenue(fullMatch.venue || '')
    
    // Parse date and time from match_date (could be DATE or TIMESTAMPTZ)
    const matchDateTime = new Date(fullMatch.match_date)
    setMatchDate(matchDateTime.toISOString().split('T')[0])
    setMatchTime(matchDateTime.toTimeString().slice(0, 5)) // HH:mm format
    
    setSets(fullMatch.score_sets)
    setWinnerTeam(fullMatch.winner_team)
    setMatchConfig(fullMatch.match_config)
    
    setLoading(false)
  }

  function handleSetScoreChange(setIndex: number, team: 'team1' | 'team2', value: string) {
    const numValue = parseInt(value) || 0
    const isSuperTiebreak = matchConfig.superTiebreak && setIndex === 2
    const maxScore = isSuperTiebreak ? 10 : 7
    
    const newSets = [...sets]
    newSets[setIndex] = { 
      ...newSets[setIndex], 
      [team]: Math.min(maxScore, Math.max(0, numValue)),
      isTiebreak: isSuperTiebreak
    }
    setSets(newSets)
  }

  function addSet() {
    if (sets.length < 3) {
      setSets([...sets, { team1: 0, team2: 0, isTiebreak: matchConfig.superTiebreak }])
    }
  }

  function removeSet() {
    if (sets.length > 2) {
      setSets(sets.slice(0, -1))
    }
  }

  function calculateWinner(): 1 | 2 | null {
    let team1Sets = 0
    let team2Sets = 0
    
    sets.forEach(set => {
      if (set.team1 > set.team2) team1Sets++
      else if (set.team2 > set.team1) team2Sets++
    })
    
    if (team1Sets > team2Sets) return 1
    if (team2Sets > team1Sets) return 2
    return null
  }

  useEffect(() => {
    const winner = calculateWinner()
    setWinnerTeam(winner)
  }, [sets])

  async function handleSave() {
    if (!match || !winnerTeam) {
      setError('El resultado debe tener un ganador claro')
      return
    }

    setSaving(true)
    setError(null)

    try {
      // First, reverse the old ELO changes
      await supabase.rpc('reverse_match_elos', { p_match_id: match.id })

      // Then update the match (this will trigger the ELO recalculation)
      const { error: updateError } = await supabase
        .from('matches')
        .update({
          venue: venue || null,
          match_date: `${matchDate}T${matchTime}:00`,
          score_sets: sets,
          winner_team: winnerTeam,
          match_config: matchConfig,
        })
        .eq('id', match.id)

      if (updateError) {
        setError('Error al guardar: ' + updateError.message)
        setSaving(false)
        return
      }

      // Manually recalculate ELOs
      await supabase.rpc('update_match_elos', { match_id: match.id })

      setSuccess(true)
      setTimeout(() => {
        router.push(`/matches/${match.id}`)
        router.refresh()
      }, 1500)
    } catch (err) {
      setError('Error al guardar los cambios')
    }

    setSaving(false)
  }

  async function handleDelete() {
    if (!match) return

    setDeleting(true)
    setError(null)

    try {
      // First, reverse the ELO changes
      await supabase.rpc('reverse_match_elos', { p_match_id: match.id })

      // Then delete the match
      const { error: deleteError } = await supabase
        .from('matches')
        .delete()
        .eq('id', match.id)

      if (deleteError) {
        setError('Error al eliminar: ' + deleteError.message)
        setDeleting(false)
        return
      }

      router.push('/matches')
      router.refresh()
    } catch (err) {
      setError('Error al eliminar el partido')
    }

    setDeleting(false)
  }

  if (loading) {
    return (
      <>
        <Header title="Editar Partido" showBack />
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    )
  }

  if (error && !match) {
    return (
      <>
        <Header title="Editar Partido" showBack />
        <div className="p-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Editar Partido" showBack />
      
      <div className="space-y-6 p-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertDescription className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              ¡Partido actualizado! Los ELOs fueron recalculados.
            </AlertDescription>
          </Alert>
        )}

        {/* Warning */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Editar el partido recalculará los ELOs de todos los jugadores.
          </AlertDescription>
        </Alert>

        {/* Match Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Detalles del Partido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={matchTime}
                  onChange={(e) => setMatchTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cancha (opcional)</Label>
              <Input
                placeholder="Ej: Club Padel Norte"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
              />
            </div>

            {/* Match Configuration */}
            <div className="space-y-4 border-t pt-4">
              <Label className="text-sm font-semibold">Configuración del Partido</Label>
              
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Golden Point</Label>
                  <p className="text-xs text-muted-foreground">
                    Sin ventaja en los games (40-40 = punto de oro)
                  </p>
                </div>
                <Switch
                  checked={matchConfig.goldenPoint}
                  onCheckedChange={(checked) => 
                    setMatchConfig(prev => ({ ...prev, goldenPoint: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Super Tie-break</Label>
                  <p className="text-xs text-muted-foreground">
                    Tercer set es un tie-break a 10 puntos
                  </p>
                </div>
                <Switch
                  checked={matchConfig.superTiebreak}
                  onCheckedChange={(checked) => 
                    setMatchConfig(prev => ({ ...prev, superTiebreak: checked }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Teams (Read-only) */}
        <div className="grid gap-4">
          {/* Team 1 */}
          <Card className={winnerTeam === 1 ? 'ring-2 ring-primary' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  Equipo 1
                  {winnerTeam === 1 && <Trophy className="h-4 w-4 text-primary" />}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {match && (
                <>
                  <PlayerRow player={match.player_1} />
                  <PlayerRow player={match.player_2} />
                </>
              )}
            </CardContent>
          </Card>

          {/* Team 2 */}
          <Card className={winnerTeam === 2 ? 'ring-2 ring-primary' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  Equipo 2
                  {winnerTeam === 2 && <Trophy className="h-4 w-4 text-primary" />}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {match && (
                <>
                  <PlayerRow player={match.player_3} />
                  <PlayerRow player={match.player_4} />
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Score Input */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Resultado</CardTitle>
              <div className="flex gap-2">
                {sets.length < 3 && (
                  <Button variant="outline" size="sm" onClick={addSet}>
                    + Set
                  </Button>
                )}
                {sets.length > 2 && (
                  <Button variant="outline" size="sm" onClick={removeSet}>
                    - Set
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Header */}
              <div className="grid grid-cols-[1fr_repeat(3,_4rem)] items-center gap-2 text-xs font-medium text-muted-foreground">
                <span></span>
                {sets.map((set, i) => (
                  <span key={i} className="text-center">
                    {matchConfig.superTiebreak && i === 2 ? 'STB' : `Set ${i + 1}`}
                  </span>
                ))}
              </div>

              {/* Team 1 Row */}
              <div className="grid grid-cols-[1fr_repeat(3,_4rem)] items-center gap-2">
                <span className={`text-sm font-medium ${winnerTeam === 1 ? 'text-primary' : ''}`}>
                  Equipo 1
                </span>
                {sets.map((set, i) => (
                  <Input
                    key={`t1-${i}`}
                    type="number"
                    min={0}
                    max={matchConfig.superTiebreak && i === 2 ? 10 : 7}
                    value={set.team1}
                    onChange={(e) => handleSetScoreChange(i, 'team1', e.target.value)}
                    className="h-12 text-center text-lg font-mono"
                  />
                ))}
              </div>

              {/* Team 2 Row */}
              <div className="grid grid-cols-[1fr_repeat(3,_4rem)] items-center gap-2">
                <span className={`text-sm font-medium ${winnerTeam === 2 ? 'text-primary' : ''}`}>
                  Equipo 2
                </span>
                {sets.map((set, i) => (
                  <Input
                    key={`t2-${i}`}
                    type="number"
                    min={0}
                    max={matchConfig.superTiebreak && i === 2 ? 10 : 7}
                    value={set.team2}
                    onChange={(e) => handleSetScoreChange(i, 'team2', e.target.value)}
                    className="h-12 text-center text-lg font-mono"
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 gap-2 text-destructive">
                <Trash2 className="h-4 w-4" />
                Eliminar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>¿Eliminar partido?</DialogTitle>
                <DialogDescription>
                  Esta acción no se puede deshacer. Los ELOs de los jugadores serán restaurados.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Eliminar Partido
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={saving || !winnerTeam}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Cambios
          </Button>
        </div>

      </div>
    </>
  )
}

function PlayerRow({ player }: { player: Player }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
      <PlayerAvatar
        name={player.display_name}
        isGhost={player.is_ghost}
        size="md"
      />
      <div className="flex-1">
        <p className="font-medium">{player.display_name}</p>
        {player.is_ghost && (
          <p className="text-xs text-muted-foreground">Invitado</p>
        )}
      </div>
      <EloBadge elo={player.elo_score} category={player.category_label} size="sm" />
    </div>
  )
}

