'use client'

import { Header } from '@/components/layout/header'
import { ProfileForm } from '@/components/profile/profile-form'
import { ProfileEditButtonWrapper, ProfileEditModeProvider } from '@/components/profile/profile-edit-button-wrapper'
import { Button } from '@/components/ui/button'
import { HelpCircle } from 'lucide-react'
import Link from 'next/link'
import type { Player, Profile } from '@/types/database'

interface ProfileContentProps {
  profile: Profile
  playerId: string | null
  ghostPlayers: Player[]
}

export function ProfileContent({ profile, playerId, ghostPlayers }: ProfileContentProps) {
  return (
    <ProfileEditModeProvider>
      <Header
        title="Perfil"
        rightAction={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="touch-target"
              asChild
            >
              <Link href="/help">
                <HelpCircle className="h-5 w-5" />
              </Link>
            </Button>
            <ProfileEditButtonWrapper />
          </div>
        }
      />
      <ProfileForm
        initialProfile={profile}
        playerId={playerId}
        initialGhostPlayers={ghostPlayers}
      />
    </ProfileEditModeProvider>
  )
}

