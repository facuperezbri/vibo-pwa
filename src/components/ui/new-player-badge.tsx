import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewPlayerBadgeProps {
  matchesPlayed: number;
  className?: string;
}

export function NewPlayerBadge({ matchesPlayed, className }: NewPlayerBadgeProps) {
  if (matchesPlayed >= 10) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400",
        className
      )}
    >
      <Sparkles className="h-3 w-3" />
      Nuevo
    </span>
  );
}

