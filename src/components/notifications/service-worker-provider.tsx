'use client'

import { useEffect } from 'react'
import { registerServiceWorker } from '@/lib/push-notifications'

export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Register service worker on mount
    registerServiceWorker()
  }, [])

  return <>{children}</>
}

