import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request
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
            request
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set({ name, value, ...options })
          })
        }
      }
    }
  )

  // Fetch session to ensure tokens are refreshed if needed
  const {
    data: { user }
  } = await supabase.auth.getUser()

  // Check if user exists in the people table (Organization authorization)
  let isAuthorized = false
  if (user) {
    const { data: person } = await supabase.from('people').select('id').eq('auth_user_id', user.id).single()

    isAuthorized = !!person

    // If not found by auth_user_id, try linking via email in case the profile was created before or after signup
    if (!isAuthorized) {
      await supabase.rpc('link_my_people_record')

      const { data: linkedPerson } = await supabase.from('people').select('id').eq('auth_user_id', user.id).single()

      isAuthorized = !!linkedPerson
    }
  }

  // Protect all non-auth routes
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/auth')
  const isUnauthorizedRoute = request.nextUrl.pathname.startsWith('/unauthorized')
  const isPublicAsset = request.nextUrl.pathname.match(/\.(.*)$/)

  // 1. Unauthenticated users wanting protected resources -> Login
  if (!user && !isAuthRoute && !isPublicAsset && !isUnauthorizedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 2. Authenticated but Unauthorized users wanting protected resources -> Unauthorized page
  if (user && !isAuthorized && !isAuthRoute && !isUnauthorizedRoute && !isPublicAsset) {
    const url = request.nextUrl.clone()
    url.pathname = '/unauthorized'
    return NextResponse.redirect(url)
  }

  // 3. Authorized users trying to visit Login or Unauthorized pages -> Dashboard
  if (user && isAuthorized && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/unauthorized')) {
    const url = request.nextUrl.clone()
    url.pathname = '/initiatives' // Default dashboard route
    return NextResponse.redirect(url)
  }

  // 4. Authorized users at the root -> Dashboard
  if (user && isAuthorized && request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/initiatives'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
