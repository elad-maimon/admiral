import { createClient } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const initiativeId = searchParams.get('initiative_id')
  const teamId = searchParams.get('team_id')
  const planningStatus = searchParams.get('planning_status')
  const importance = searchParams.get('importance')

  let query = supabase
    .from('epics')
    .select(
      `
    *,
    initiative:initiatives(id, title),
    owner:people(id, name, team_id),
    deliverables(*)
  `
    )
    .order('created_at', { ascending: false })

  if (initiativeId) query = query.eq('initiative_id', initiativeId)
  if (planningStatus) query = query.eq('planning_status', planningStatus)
  if (importance) query = query.eq('importance', parseInt(importance))

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Filter by team client-side since it's nested in the owner relationship
  let filteredData = data
  if (teamId) {
    filteredData = data.filter((epic: any) => epic.owner?.team_id === teamId)
  }

  // Derive execution_status
  const processedEpics = filteredData.map((epic: any) => {
    const deliverables = epic.deliverables || []
    let execution_status = 'backlog'

    if (deliverables.length > 0) {
      if (deliverables.every((d: any) => d.status === 'done' || d.status === 'cancelled')) {
        execution_status = 'done'
      } else if (deliverables.some((d: any) => d.status === 'in_dev')) {
        execution_status = 'in_dev'
      } else if (deliverables.some((d: any) => d.status === 'blocked')) {
        execution_status = 'blocked'
      } else if (deliverables.some((d: any) => ['ideation', 'rfd'].includes(d.status))) {
        execution_status = 'planning'
      }
    }

    return { ...epic, execution_status }
  })

  return NextResponse.json(processedEpics)
}

export async function POST(request: Request) {
  const supabase = createClient()
  try {
    const body = await request.json()
    const { first_deliverable, ...epicData } = body

    // 1. Create Epic
    const { data: epic, error: epicError } = await supabase.from('epics').insert([epicData]).select().single()

    if (epicError) throw epicError

    // 2. Create Deliverable (Atomic-ish for now)
    if (first_deliverable) {
      const { error: delivError } = await supabase.from('deliverables').insert([
        {
          ...first_deliverable,
          epic_id: epic.id,
          title: first_deliverable.title || epic.title
        }
      ])

      if (delivError) throw delivError
    }

    return NextResponse.json(epic)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
