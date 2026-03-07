import { createClient } from '@/lib/supabase/server'
import { UnauthorizedClient } from './client'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'

export default async function UnauthorizedPage() {
  const supabase = createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if they are actually authorized (in case they navigated here manually by mistake)
  const { data: person } = await supabase.from('people').select('id').eq('auth_user_id', user.id).single()

  if (person) {
    redirect('/initiatives')
  }

  // Fetch their join request status
  const { data: request } = await supabase.from('join_requests').select('*').eq('auth_user_id', user.id).single()

  let initialStatus: 'none' | 'pending' | 'declined' | 'max_attempts' = 'none'
  let declinedDate = undefined
  let attemptsRemaining = undefined

  if (request) {
    if (request.status === 'pending') {
      initialStatus = 'pending'
    } else if (request.status === 'declined') {
      if (request.attempts >= 3) {
        initialStatus = 'max_attempts'
      } else {
        initialStatus = 'declined'
        declinedDate = format(new Date(request.updated_at), 'dd/MM/yyyy HH:mm')
        attemptsRemaining = 3 - request.attempts
      }
    } else if (request.status === 'approved') {
      // This is an anomaly (approved but no people record), but just in case:
      redirect('/login')
    }
  }

  return (
    <UnauthorizedClient
      initialStatus={initialStatus}
      declinedDate={declinedDate}
      attemptsRemaining={attemptsRemaining}
    />
  )
}
