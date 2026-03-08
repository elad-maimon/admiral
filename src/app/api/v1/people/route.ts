import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const teamId = searchParams.get('team_id')
  const activeParam = searchParams.get('active')

  let query = supabase.from('people').select('*').order('name')
  if (teamId) {
    query = query.eq('team_id', teamId)
  }

  if (activeParam === 'none') {
    query = query.eq('active', false)
  } else if (activeParam !== 'both') {
    query = query.eq('active', true)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = createClient()
  try {
    const body = await request.json()
    if (!body.name) return NextResponse.json({ error: 'Missing name' }, { status: 400 })

    const { data, error } = await supabase.from('people').insert([body]).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const supabase = createClient()
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const checks = await Promise.all([
      supabase.from('initiatives').select('id').eq('owner_id', id).limit(1),
      supabase.from('epics').select('id').eq('owner_id', id).limit(1),
      supabase.from('deliverables').select('id').eq('owner_id', id).limit(1),
      supabase.from('lighthouse_items').select('id').eq('feature_lead', id).limit(1),
      supabase.from('lighthouses').select('id').eq('created_by', id).limit(1)
    ])

    const hasReferences = checks.some(check => check.data && check.data.length > 0)
    if (hasReferences) {
      return NextResponse.json({ error: 'has_references' }, { status: 409 })
    }

    const { error } = await supabase.from('people').delete().eq('id', id)
    if (error) {
      if (error.code === '23503') {
        return NextResponse.json({ error: 'has_references' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
