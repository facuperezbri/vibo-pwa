'use client'

import { useState, useEffect } from 'react'
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
} from '@/components/ui/dialog'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { PlayerAvatar } from '@/components/ui/player-avatar'
import { EloBadge } from '@/components/ui/elo-badge'
import { Loader2, Plus, X, UserPlus, Check, Trophy, Share2 } from 'lucide-react'
import type { Player, PlayerCategory, SetScore, MatchConfig, MatchInvitation } from '@/types/database'
import { CATEGORIES, CATEGORY_ELO_MAP, CATEGORY_LABELS, DEFAULT_MATCH_CONFIG } from '@/types/database'
import { WhatsAppShareDialog } from '@/components/match/whatsapp-share-dialog'

type SelectedPlayer = Pick<Player, 'id' | 'display_name' | 'is_ghost' | 'elo_score' | 'category_label' | 'profile_id'>

export default function NewMatchPage() {
  const [loading, setLoading] = useState(false)
  const [savingMatch, setSavingMatch] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const [currentUser, setCurrentUser] = useState<SelectedPlayer | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [availablePlayers, setAvailablePlayers] = useState<SelectedPlayer[]>([])
  
  // Team selection (user is always position 1)
  const [team1Player2, setTeam1Player2] = useState<SelectedPlayer | null>(null)
  const [team2Player1, setTeam2Player1] = useState<SelectedPlayer | null>(null)
  const [team2Player2, setTeam2Player2] = useState<SelectedPlayer | null>(null)
  
  // Match details
  const [venue, setVenue] = useState('')
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0])
  const [matchTime, setMatchTime] = useState(new Date().toTimeString().slice(0, 5)) // HH:mm format
  const [sets, setSets] = useState<SetScore[]>([{ team1: 0, team2: 0 }, { team1: 0, team2: 0 }])
  const [winnerTeam, setWinnerTeam] = useState<1 | 2 | null>(null)
  
  // Match config (Golden Point / Super Tie-break)
  const [matchConfig, setMatchConfig] = useState<MatchConfig>(DEFAULT_MATCH_CONFIG)
  
  // Ghost player creation
  const [showGhostDialog, setShowGhostDialog] = useState(false)
  const [ghostPosition, setGhostPosition] = useState<'team1-2' | 'team2-1' | 'team2-2' | null>(null)
  const [newGhostName, setNewGhostName] = useState('')
  const [newGhostCategory, setNewGhostCategory] = useState<PlayerCategory>('6ta')
  const [creatingGhost, setCreatingGhost] = useState(false)

  // WhatsApp share
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [createdMatchId, setCreatedMatchId] = useState<string | null>(null)
  const [invitations, setInvitations] = useState<MatchInvitation[]>([])

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadUserAndPlayers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadUserAndPlayers() {
    setLoading(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    setCurrentUserId(user.id)

    // Get current user's player record
    const { data: userPlayer } = await supabase
      .from('players')
      .select('id, display_name, is_ghost, elo_score, category_label, profile_id')
      .eq('profile_id', user.id)
      .single()

    if (userPlayer) {
      setCurrentUser(userPlayer)
    }

    // Get available players (non-ghost public + user's ghosts)
    const { data: players } = await supabase
      .from('players')
      .select('id, display_name, is_ghost, elo_score, category_label, profile_id')
      .or(`is_ghost.eq.false,created_by_user_id.eq.${user.id}`)
      .neq('profile_id', user.id) // Exclude current user
      .order('display_name')

    setAvailablePlayers(players || [])
    setLoading(false)
  }

  function handlePlayerSelect(player: SelectedPlayer, position: 'team1-2' | 'team2-1' | 'team2-2') {
    switch (position) {
      case 'team1-2':
        setTeam1Player2(player)
        break
      case 'team2-1':
        setTeam2Player1(player)
        break
      case 'team2-2':
        setTeam2Player2(player)
        break
    }
  }

  function handleRemovePlayer(position: 'team1-2' | 'team2-1' | 'team2-2') {
    switch (position) {
      case 'team1-2':
        setTeam1Player2(null)
        break
      case 'team2-1':
        setTeam2Player1(null)
        break
      case 'team2-2':
        setTeam2Player2(null)
        break
    }
  }

  function getSelectedPlayerIds(): string[] {
    const ids: string[] = []
    if (currentUser) ids.push(currentUser.id)
    if (team1Player2) ids.push(team1Player2.id)
    if (team2Player1) ids.push(team2Player1.id)
    if (team2Player2) ids.push(team2Player2.id)
    return ids
  }

  function getAvailablePlayersForPosition(): SelectedPlayer[] {
    const selectedIds = getSelectedPlayerIds()
    return availablePlayers.filter(p => !selectedIds.includes(p.id))
  }

  async function handleCreateGhost() {
    if (!newGhostName.trim() || !ghostPosition) return
    
    setCreatingGhost(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const initialElo = CATEGORY_ELO_MAP[newGhostCategory]

    const { data: newPlayer, error } = await supabase
      .from('players')
      .insert({
        display_name: newGhostName.trim(),
        is_ghost: true,
        created_by_user_id: user.id,
        elo_score: initialElo,
        category_label: newGhostCategory,
      })
      .select('id, display_name, is_ghost, elo_score, category_label, profile_id')
      .single()

    if (error || !newPlayer) {
      setError('Error al crear el jugador')
      setCreatingGhost(false)
      return
    }

    // Add to available players and select
    setAvailablePlayers(prev => [...prev, newPlayer])
    handlePlayerSelect(newPlayer, ghostPosition)
    
    // Reset dialog
    setShowGhostDialog(false)
    setNewGhostName('')
    setNewGhostCategory('6ta')
    setGhostPosition(null)
    setCreatingGhost(false)
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

  async function handleSubmit() {
    if (!currentUser || !team1Player2 || !team2Player1 || !team2Player2) {
      setError('Seleccioná los 4 jugadores')
      return
    }

    if (!winnerTeam) {
      setError('El resultado debe tener un ganador claro')
      return
    }

    setSavingMatch(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Create the match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert({
        created_by: user.id,
        match_date: `${matchDate}T${matchTime}:00`,
        venue: venue || null,
        player_1_id: currentUser.id,
        player_2_id: team1Player2.id,
        player_3_id: team2Player1.id,
        player_4_id: team2Player2.id,
        score_sets: sets,
        winner_team: winnerTeam,
        match_config: matchConfig,
      })
      .select('id')
      .single()

    if (matchError || !match) {
      setError('Error al guardar el partido: ' + matchError?.message)
      setSavingMatch(false)
      return
    }

    setCreatedMatchId(match.id)

    // Create invitations for non-ghost players (excluding self)
    const playersToInvite = [team1Player2, team2Player1, team2Player2].filter(
      p => !p.is_ghost && p.profile_id && p.profile_id !== user.id
    )

    if (playersToInvite.length > 0) {
      const invitationInserts = playersToInvite.map(p => ({
        match_id: match.id,
        invited_player_id: p.id,
        invited_profile_id: p.profile_id,
      }))

      const { data: newInvitations } = await supabase
        .from('match_invitations')
        .insert(invitationInserts)
        .select('*')

      if (newInvitations) {
        setInvitations(newInvitations)
      }
    }

    setSuccess(true)
    setSavingMatch(false)
    
    // Show share dialog if there are players to share with
    const allPlayers = [team1Player2, team2Player1, team2Player2]
    const hasPlayersToShare = allPlayers.some(p => !p.is_ghost || p.is_ghost)
    
    if (hasPlayersToShare) {
      setShowShareDialog(true)
    } else {
      setTimeout(() => {
        router.push('/matches')
        router.refresh()
      }, 1500)
    }
  }

  function handleShareComplete() {
    setShowShareDialog(false)
    router.push('/matches')
    router.refresh()
  }

  if (loading) {
    return (
      <>
        <Header title="Nuevo Partido" showBack />
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Nuevo Partido" showBack />
      
      <div className="space-y-6 p-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && !showShareDialog && (
          <Alert>
            <AlertDescription className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              ¡Partido guardado! Los ELOs fueron actualizados.
            </AlertDescription>
          </Alert>
        )}

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

        {/* Teams */}
        <div className="grid gap-4">
          {/* Team 1 */}
          <Card className={winnerTeam === 1 ? 'ring-2 ring-primary' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  Equipo 1
                  {winnerTeam === 1 && <Trophy className="h-4 w-4 text-primary" />}
                </CardTitle>
                {winnerTeam === 1 && (
                  <span className="text-xs font-medium text-primary">Ganador</span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Current User (fixed) */}
              {currentUser && (
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                  <PlayerAvatar name={currentUser.display_name} size="md" />
                  <div className="flex-1">
                    <p className="font-medium">{currentUser.display_name}</p>
                    <p className="text-xs text-muted-foreground">Vos</p>
                  </div>
                  <EloBadge elo={currentUser.elo_score} category={currentUser.category_label} size="sm" />
                </div>
              )}

              {/* Team 1 Player 2 */}
              <PlayerSlot
                player={team1Player2}
                position="team1-2"
                availablePlayers={getAvailablePlayersForPosition()}
                onSelect={handlePlayerSelect}
                onRemove={handleRemovePlayer}
                onCreateGhost={(pos) => {
                  setGhostPosition(pos)
                  setShowGhostDialog(true)
                }}
              />
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
                {winnerTeam === 2 && (
                  <span className="text-xs font-medium text-primary">Ganador</span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <PlayerSlot
                player={team2Player1}
                position="team2-1"
                availablePlayers={getAvailablePlayersForPosition()}
                onSelect={handlePlayerSelect}
                onRemove={handleRemovePlayer}
                onCreateGhost={(pos) => {
                  setGhostPosition(pos)
                  setShowGhostDialog(true)
                }}
              />
              <PlayerSlot
                player={team2Player2}
                position="team2-2"
                availablePlayers={getAvailablePlayersForPosition()}
                onSelect={handlePlayerSelect}
                onRemove={handleRemovePlayer}
                onCreateGhost={(pos) => {
                  setGhostPosition(pos)
                  setShowGhostDialog(true)
                }}
              />
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

        {/* Submit Button */}
        <Button
          className="w-full py-6 text-lg"
          onClick={handleSubmit}
          disabled={savingMatch || !currentUser || !team1Player2 || !team2Player1 || !team2Player2 || !winnerTeam}
        >
          {savingMatch && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          Guardar Partido
        </Button>

        {/* Ghost Player Dialog */}
        <Dialog open={showGhostDialog} onOpenChange={setShowGhostDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Jugador Invitado</DialogTitle>
              <DialogDescription>
                Creá un perfil para un amigo que no tiene cuenta
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  placeholder="Nombre del jugador"
                  value={newGhostName}
                  onChange={(e) => setNewGhostName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Categoría Estimada</Label>
                <Select
                  value={newGhostCategory}
                  onValueChange={(v) => setNewGhostCategory(v as PlayerCategory)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]} ({CATEGORY_ELO_MAP[cat]} pts)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={handleCreateGhost}
                disabled={!newGhostName.trim() || creatingGhost}
              >
                {creatingGhost && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <UserPlus className="mr-2 h-4 w-4" />
                Crear Jugador
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* WhatsApp Share Dialog */}
        <WhatsAppShareDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          matchId={createdMatchId}
          players={[team1Player2, team2Player1, team2Player2].filter(Boolean) as SelectedPlayer[]}
          invitations={invitations}
          matchDate={`${matchDate}T${matchTime}:00`}
          venue={venue}
          onComplete={handleShareComplete}
        />
      </div>
    </>
  )
}

// Player Slot Component
interface PlayerSlotProps {
  player: SelectedPlayer | null
  position: 'team1-2' | 'team2-1' | 'team2-2'
  availablePlayers: SelectedPlayer[]
  onSelect: (player: SelectedPlayer, position: 'team1-2' | 'team2-1' | 'team2-2') => void
  onRemove: (position: 'team1-2' | 'team2-1' | 'team2-2') => void
  onCreateGhost: (position: 'team1-2' | 'team2-1' | 'team2-2') => void
}

function PlayerSlot({ player, position, availablePlayers, onSelect, onRemove, onCreateGhost }: PlayerSlotProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filteredPlayers = availablePlayers.filter(p =>
    p.display_name.toLowerCase().includes(search.toLowerCase())
  )

  if (player) {
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
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onRemove(position)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-auto w-full justify-start gap-3 border-dashed p-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Plus className="h-5 w-5 text-muted-foreground" />
          </div>
          <span className="text-muted-foreground">Seleccionar jugador</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>Seleccionar Jugador</DialogTitle>
        </DialogHeader>
        <Command className="rounded-none border-0">
          <CommandInput
            placeholder="Buscar jugador..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[50vh]">
            <CommandEmpty>
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">No se encontraron jugadores</p>
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => {
                    setOpen(false)
                    onCreateGhost(position)
                  }}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Crear jugador invitado
                </Button>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {filteredPlayers.map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.display_name}
                  onSelect={() => {
                    onSelect(p, position)
                    setOpen(false)
                  }}
                  className="flex items-center gap-3 p-3"
                >
                  <PlayerAvatar
                    name={p.display_name}
                    isGhost={p.is_ghost}
                    size="sm"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{p.display_name}</p>
                    {p.is_ghost && (
                      <p className="text-xs text-muted-foreground">Invitado</p>
                    )}
                  </div>
                  <EloBadge elo={p.elo_score} category={p.category_label} size="sm" />
                </CommandItem>
              ))}
            </CommandGroup>
            <div className="border-t p-2">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  setOpen(false)
                  onCreateGhost(position)
                }}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Crear jugador invitado
              </Button>
            </div>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
