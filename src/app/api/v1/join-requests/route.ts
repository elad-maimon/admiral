import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()

  // RLS will ensure only admins can execute the secure view logic correctly
  const { data, error } = await supabase.rpc('get_pending_join_requests')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}
