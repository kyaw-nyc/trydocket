import { SupabaseClient } from '@supabase/supabase-js'

export async function getValidGoogleToken(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('google_access_token, google_refresh_token, google_token_expires_at')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    throw new Error('Profile not found')
  }

  if (!profile.google_access_token) {
    throw new Error('No Google access token found. Please sign in again.')
  }

  // Check if token is still valid (with 5 min buffer)
  const expiresAt = profile.google_token_expires_at
    ? new Date(profile.google_token_expires_at).getTime()
    : 0

  if (Date.now() < expiresAt - 5 * 60 * 1000) {
    return profile.google_access_token
  }

  // Token expired or about to expire - refresh it
  if (!profile.google_refresh_token) {
    throw new Error('No refresh token available. Please sign in again.')
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID!,
      client_secret: process.env.AUTH_GOOGLE_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: profile.google_refresh_token,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('Token refresh failed:', errorData)
    throw new Error('Failed to refresh Google token. Please sign in again.')
  }

  const tokens = await response.json()

  // Update stored tokens
  const updateData: Record<string, string> = {
    google_access_token: tokens.access_token,
    google_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
  }

  // Only update refresh token if a new one was provided
  if (tokens.refresh_token) {
    updateData.google_refresh_token = tokens.refresh_token
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId)

  if (updateError) {
    console.error('Failed to save refreshed tokens:', updateError)
    // Still return the new access token even if save failed
  }

  return tokens.access_token
}
