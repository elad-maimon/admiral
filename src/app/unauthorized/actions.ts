'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitJoinRequest() {
  const supabase = createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    throw new Error('User not found or missing email')
  }

  const { error } = await supabase.from('join_requests').insert({
    auth_user_id: user.id,
    status: 'pending',
    attempts: 1
  })

  if (error) {
    console.error('Failed to submit join request', error)
    throw new Error('Failed to submit join request')
  }

  revalidatePath('/unauthorized')
}

export async function resubmitJoinRequest() {
  const supabase = createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) throw new Error('User not found')

  // First get the current request to increment attempts
  const { data: existingReq, error: fetchErr } = await supabase
    .from('join_requests')
    .select('id, attempts, status')
    .eq('auth_user_id', user.id)
    .single()

  if (fetchErr || !existingReq) {
    throw new Error('No existing request found to resubmit')
  }

  if (existingReq.attempts >= 3) {
    throw new Error('Maximum attempts reached')
  }

  const { error: updateErr } = await supabase
    .from('join_requests')
    .update({
      status: 'pending',
      attempts: existingReq.attempts + 1
    })
    .eq('id', existingReq.id)

  if (updateErr) {
    console.error('Failed to resubmit', updateErr)
    throw new Error('Failed to resubmit request')
  }

  revalidatePath('/unauthorized')
}
