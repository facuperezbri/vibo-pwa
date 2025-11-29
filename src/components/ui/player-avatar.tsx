import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { User, Ghost } from 'lucide-react'

interface PlayerAvatarProps {
  name: string
  avatarUrl?: string | null
  isGhost?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
}

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function PlayerAvatar({
  name,
  avatarUrl,
  isGhost = false,
  size = 'md',
  className,
}: PlayerAvatarProps) {
  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
      <AvatarFallback className={cn(isGhost && 'bg-muted')}>
        {isGhost ? (
          <Ghost className={cn(iconSizes[size], 'text-muted-foreground')} />
        ) : avatarUrl ? (
          <User className={cn(iconSizes[size], 'text-muted-foreground')} />
        ) : (
          <span className="text-xs font-medium">{getInitials(name)}</span>
        )}
      </AvatarFallback>
    </Avatar>
  )
}

