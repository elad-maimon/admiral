import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient()
  try {
    const body = await request.json()

    // Ensure Week Starts/Ends are Sundays
    if (body.planned_week_start && new Date(body.planned_week_start).getDay() !== 0) {
      return NextResponse.json({ error: 'planned_week_start must be a Sunday' }, { status: 400 })
    }
    if (body.planned_week_end && new Date(body.planned_week_end).getDay() !== 0) {
      return NextResponse.json({ error: 'planned_week_end must be a Sunday' }, { status: 400 })
    }
    if (body.planned_week_start && body.planned_week_end) {
      if (new Date(body.planned_week_end) < new Date(body.planned_week_start)) {
        return NextResponse.json({ error: 'planned_week_end must be >= planned_week_start' }, { status: 400 })
      }
    }

    const { data: deliverable, error } = await supabase.from('deliverables').insert([body]).select().single()

    if (error) throw error
    return NextResponse.json(deliverable)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
