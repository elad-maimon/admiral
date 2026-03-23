import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Person, PersonUpdate } from '@/types'

export async function PATCH(request: Request) {
  const supabase = createClient()
  try {
    const body = await request.json()
    const id = body.id as string
    const updates = body.updates as PersonUpdate

    if (!id || !updates) {
      return NextResponse.json({ error: 'Missing id or updates' }, { status: 400 })
    }

    const { data, error } = await supabase.from('people').update(updates).eq('id', id).select().single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
