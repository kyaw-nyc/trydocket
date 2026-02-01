import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.session) {
      // Store Google tokens in profile for Calendar API access
      const { provider_token, provider_refresh_token } = data.session

      if (provider_token) {
        await supabase.from('profiles').update({
          google_access_token: provider_token,
          google_refresh_token: provider_refresh_token,
          google_token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
        }).eq('id', data.session.user.id)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/landing?error=auth`)
}
