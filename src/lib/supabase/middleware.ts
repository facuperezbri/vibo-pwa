import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Define public routes that don't require authentication
  const publicRoutes = ['/login', '/signup', '/auth/callback', '/auth/confirm', '/invite']
  const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))

  // Define routes that don't require complete profile
  const incompleteProfileAllowedRoutes = ['/complete-profile', '/help']
  const isIncompleteProfileAllowed = incompleteProfileAllowedRoutes.some(route => request.nextUrl.pathname.startsWith(route))

  if (!user && !isPublicRoute) {
    // No user, redirect to login page
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const redirectResponse = NextResponse.redirect(url)
    // Copy cookies from supabaseResponse
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    // User is logged in but trying to access auth pages, redirect to home
    const url = request.nextUrl.clone()
    url.pathname = '/'
    const redirectResponse = NextResponse.redirect(url)
    // Copy cookies from supabaseResponse
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  // Check if profile is complete for authenticated users accessing protected routes
  if (user && !isPublicRoute && !isIncompleteProfileAllowed) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_type, category_label, country, province, email, phone, gender')
      .eq('id', user.id)
      .single()

    // If profile doesn't exist, redirect to complete-profile
    if (!profile || profileError) {
      const url = request.nextUrl.clone()
      url.pathname = '/complete-profile'
      const redirectResponse = NextResponse.redirect(url)
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value)
      })
      return redirectResponse
    }

    // Check profile completeness based on user type
    const isPlayerProfileComplete = profile.user_type === 'player' &&
      profile.category_label &&
      profile.country &&
      profile.province &&
      (profile.email || user.email) &&
      profile.phone &&
      profile.gender

    const isClubProfileComplete = profile.user_type === 'club' &&
      profile.country &&
      profile.province &&
      (profile.email || user.email) &&
      profile.phone

    const isProfileComplete = isPlayerProfileComplete || isClubProfileComplete

    if (!isProfileComplete) {
      // Profile is incomplete, redirect to complete-profile
      const url = request.nextUrl.clone()
      url.pathname = '/complete-profile'
      const redirectResponse = NextResponse.redirect(url)
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value)
      })
      return redirectResponse
    }

    // Redirect based on user type (only for root path)
    const pathname = request.nextUrl.pathname
    const isClubRoute = pathname.startsWith('/club/')
    const isPublicClubRoute = pathname.startsWith('/clubs/') || pathname.startsWith('/tournaments/')
    
    // Only redirect root path based on user type
    if (pathname === '/') {
      if (profile.user_type === 'club') {
        const url = request.nextUrl.clone()
        url.pathname = '/club/dashboard'
        const redirectResponse = NextResponse.redirect(url)
        supabaseResponse.cookies.getAll().forEach((cookie) => {
          redirectResponse.cookies.set(cookie.name, cookie.value)
        })
        return redirectResponse
      }
      // Player stays on root path
    }

    // Prevent access to wrong user type routes
    if (profile.user_type === 'club' && !isClubRoute && !isPublicClubRoute && !isIncompleteProfileAllowed && pathname !== '/complete-profile') {
      // Club user trying to access player routes, redirect to club dashboard
      const url = request.nextUrl.clone()
      url.pathname = '/club/dashboard'
      const redirectResponse = NextResponse.redirect(url)
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value)
      })
      return redirectResponse
    }

    if (profile.user_type === 'player' && isClubRoute) {
      // Player trying to access club routes, redirect to home
      const url = request.nextUrl.clone()
      url.pathname = '/'
      const redirectResponse = NextResponse.redirect(url)
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value)
      })
      return redirectResponse
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}

