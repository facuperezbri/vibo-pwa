'use client'

import { createClient } from '@/lib/supabase/client'

// VAPID public key - Replace with your own from Supabase or a push service
// Generate with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray.buffer as ArrayBuffer
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('Service workers not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    })
    console.log('Service Worker registered:', registration)
    return registration
  } catch (error) {
    console.error('Service Worker registration failed:', error)
    return null
  }
}

export async function subscribeToPushNotifications(): Promise<boolean> {
  if (!('PushManager' in window)) {
    console.log('Push notifications not supported')
    return false
  }

  if (!VAPID_PUBLIC_KEY) {
    console.warn('VAPID public key not configured')
    return false
  }

  try {
    const registration = await registerServiceWorker()
    if (!registration) return false

    // Request notification permission
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.log('Notification permission denied')
      return false
    }

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    // Save subscription to database
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return false

    const subscriptionJSON = subscription.toJSON()
    
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscriptionJSON.keys?.p256dh || '',
        auth: subscriptionJSON.keys?.auth || '',
      }, {
        onConflict: 'user_id,endpoint',
      })

    if (error) {
      console.error('Error saving push subscription:', error)
      return false
    }

    console.log('Push subscription saved successfully')
    return true
  } catch (error) {
    console.error('Error subscribing to push notifications:', error)
    return false
  }
}

export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    
    if (subscription) {
      await subscription.unsubscribe()
      
      // Remove from database
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint)
      }
    }
    
    return true
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error)
    return false
  }
}

export async function isPushNotificationSubscribed(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return !!subscription
  } catch {
    return false
  }
}

export function isPushNotificationSupported(): boolean {
  return 'serviceWorker' in navigator && 
         'PushManager' in window && 
         'Notification' in window
}

export function getNotificationPermissionState(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission
}

