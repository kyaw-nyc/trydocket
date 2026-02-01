'use client'

import { createClient } from '@/lib/supabase/client'

type SignInButtonProps = {
  children: React.ReactNode
  className?: string
}

export function SignInButton({ children, className }: SignInButtonProps) {
  const handleSignIn = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        scopes: 'https://www.googleapis.com/auth/calendar',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
  }

  return (
    <button onClick={handleSignIn} className={className}>
      {children}
    </button>
  )
}
