import { cn } from '@/lib/utils'
import { PlayerAvatar } from '@/components/ui/player-avatar'
import type { SetScore, Player } from '@/types/database'

type PlayerWithAvatar = Player & { avatar_url?: string | null }

interface ScoreDisplayProps {
  sets: SetScore[]
  winnerTeam: 1 | 2
  compact?: boolean
  className?: string
  team1Players?: [PlayerWithAvatar, PlayerWithAvatar]
  team2Players?: [PlayerWithAvatar, PlayerWithAvatar]
}

export function ScoreDisplay({ sets, winnerTeam, compact = false, className, team1Players, team2Players }: ScoreDisplayProps) {
  if (compact) {
    return (
      <div className={cn('flex items-center gap-2 font-mono', className)}>
        {sets.map((set, index) => (
          <span key={index} className="flex items-center">
            <span className={cn(winnerTeam === 1 && 'font-semibold text-primary')}>
              {set.team1}
            </span>
            <span className="mx-0.5 text-muted-foreground">-</span>
            <span className={cn(winnerTeam === 2 && 'font-semibold text-primary')}>
              {set.team2}
            </span>
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 text-sm">
        <div className="flex items-center gap-2">
          {team1Players && (
            <div className="flex -space-x-2">
              <PlayerAvatar
                name={team1Players[0].display_name}
                avatarUrl={team1Players[0].avatar_url}
                isGhost={team1Players[0].is_ghost}
                size="sm"
                className={cn('ring-2 ring-background', winnerTeam === 1 && 'ring-primary')}
              />
              <PlayerAvatar
                name={team1Players[1].display_name}
                avatarUrl={team1Players[1].avatar_url}
                isGhost={team1Players[1].is_ghost}
                size="sm"
                className={cn('ring-2 ring-background', winnerTeam === 1 && 'ring-primary')}
              />
            </div>
          )}
          {winnerTeam === 1 && <span className="text-xs">🏆</span>}
        </div>
        {sets.map((set, index) => (
          <span
            key={`t1-${index}`}
            className={cn(
              'w-8 text-center font-mono font-semibold',
              set.team1 > set.team2 ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            {set.team1}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 text-sm">
        <div className="flex items-center gap-2">
          {team2Players && (
            <div className="flex -space-x-2">
              <PlayerAvatar
                name={team2Players[0].display_name}
                avatarUrl={team2Players[0].avatar_url}
                isGhost={team2Players[0].is_ghost}
                size="sm"
                className={cn('ring-2 ring-background', winnerTeam === 2 && 'ring-primary')}
              />
              <PlayerAvatar
                name={team2Players[1].display_name}
                avatarUrl={team2Players[1].avatar_url}
                isGhost={team2Players[1].is_ghost}
                size="sm"
                className={cn('ring-2 ring-background', winnerTeam === 2 && 'ring-primary')}
              />
            </div>
          )}
          {winnerTeam === 2 && <span className="text-xs">🏆</span>}
        </div>
        {sets.map((set, index) => (
          <span
            key={`t2-${index}`}
            className={cn(
              'w-8 text-center font-mono font-semibold',
              set.team2 > set.team1 ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            {set.team2}
          </span>
        ))}
      </div>
    </div>
  )
}

