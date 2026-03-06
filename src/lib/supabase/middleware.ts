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

  // Protect all non-auth routes
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/auth')
  const isPublicAsset = request.nextUrl.pathname.match(/\.(.*)$/)

  if (!user && !isAuthRoute && !isPublicAsset) {
    // Redirect unauthenticated users to login page
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && request.nextUrl.pathname === '/login') {
    // Redirect authenticated users away from login page
    const url = request.nextUrl.clone()
    url.pathname = '/initiatives' // Default dashboard route
    return NextResponse.redirect(url)
  }

  // Allow access to root if they are just loading it (they will be redirected to /initiatives client-side if needed, but let's just do it here)
  if (user && request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/initiatives'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
