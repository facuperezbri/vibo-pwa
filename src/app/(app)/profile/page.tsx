'use client'

import { ProfileContent } from '@/components/profile/profile-content'
import { Header } from '@/components/layout/header'
import { PadelBallLoader } from '@/components/ui/padel-ball-loader'
import { Button } from '@/components/ui/button'
import { HelpCircle } from 'lucide-react'
import Link from 'next/link'
import { useProfile } from '@/lib/react-query/hooks'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const { data: profileData, isLoading, error } = useProfile()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !profileData && !error) {
      router.push('/complete-profile')
    }
  }, [isLoading, profileData, error, router])

  // Only show skeleton if we don't have data yet (first load)
  const shouldShowSkeleton = isLoading && !profileData

  if (shouldShowSkeleton) {
    return (
      <>
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
            </div>
          }
        />
        <div className="flex h-[60vh] items-center justify-center">
          <PadelBallLoader size="lg" />
        </div>
      </>
    )
  }

  if (error) {
    console.error('Error loading profile:', error)
    return (
      <>
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
            </div>
          }
        />
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-muted-foreground">Error al cargar el perfil</p>
        </div>
      </>
    )
  }

  if (!profileData) {
    return null
  }

  return (
    <>
      <ProfileContent 
        profile={profileData.profile} 
        playerId={profileData.playerId} 
        ghostPlayers={profileData.ghostPlayers} 
      />
    </>
  )
}
