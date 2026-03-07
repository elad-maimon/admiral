'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function declineJoinRequest(requestId: string) {
  const supabase = createClient()

  const { error } = await supabase.from('join_requests').update({ status: 'declined' }).eq('id', requestId)

  if (error) {
    console.error('Failed to decline request', error)
    throw new Error('Failed to decline request')
  }

  revalidatePath('/teams')
}

export async function approveJoinRequest(
  requestId: string,
  personData: {
    auth_user_id: string
    email: string
    name?: string
    team_id?: string | null
    role?: string
    permission?: string
    existing_person_id?: string
  }
) {
  const supabase = createClient()

  // 1. Create or Update the person
  if (personData.existing_person_id) {
    const { error: personError } = await supabase
      .from('people')
      .update({
        auth_user_id: personData.auth_user_id,
        email: personData.email
      })
      .eq('id', personData.existing_person_id)

    if (personError) {
      console.error('Failed to link existing person', personError)
      throw new Error('Failed to link existing person profile')
    }
  } else {
    if (!personData.name || !personData.role || !personData.permission) {
      throw new Error('Missing required fields for new person profile')
    }

    const { error: personError } = await supabase.from('people').insert({
      auth_user_id: personData.auth_user_id,
      email: personData.email,
      name: personData.name,
      team_id: personData.team_id || null,
      role: personData.role,
      permission: personData.permission,
      active: true,
      counts_toward_capacity: true
    })

    if (personError) {
      console.error('Failed to create person', personError)
      throw new Error('Failed to create person profile')
    }
  }

  // 2. Mark request as approved
  const { error: reqError } = await supabase.from('join_requests').update({ status: 'approved' }).eq('id', requestId)

  if (reqError) {
    console.error('Failed to approve request', reqError)
    throw new Error('Failed to approve request')
  }

  revalidatePath('/teams')
}
