import { cn } from '@/lib/utils'
import type { PlayerCategory } from '@/types/database'

interface EloBadgeProps {
  elo: number
  category?: PlayerCategory
  size?: 'sm' | 'md' | 'lg'
  showChange?: number
  className?: string
}

const categoryColors: Record<PlayerCategory, string> = {
  '8va': 'bg-zinc-600 text-zinc-100',
  '7ma': 'bg-stone-600 text-stone-100',
  '6ta': 'bg-emerald-600 text-emerald-100',
  '5ta': 'bg-cyan-600 text-cyan-100',
  '4ta': 'bg-blue-600 text-blue-100',
  '3ra': 'bg-violet-600 text-violet-100',
  '2da': 'bg-amber-600 text-amber-100',
  '1ra': 'bg-rose-600 text-rose-100',
}

export function EloBadge({ elo, category, size = 'md', showChange, className }: EloBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  return (
    <div className="relative inline-flex items-center gap-1.5">
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full font-mono font-semibold',
          category ? categoryColors[category] : 'bg-primary text-primary-foreground',
          sizeClasses[size],
          className
        )}
      >
        {Math.round(elo)}
        {category && <span className="text-[0.65em] opacity-80">{category}</span>}
      </span>
      {showChange !== undefined && showChange !== 0 && (
        <span
          className={cn(
            'text-xs font-semibold',
            showChange > 0 ? 'text-green-500' : 'text-red-500'
          )}
        >
          {showChange > 0 ? '+' : ''}{Math.round(showChange)}
        </span>
      )}
    </div>
  )
}

