import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const ownerId = searchParams.get('owner_id')

  // Supabase query to get initiatives, owner teams, epics, and deliverables
  let query = supabase.from('initiatives').select(`
    *,
    owner:people!owner_id(id, name, team_id),
    epics(
      *,
      deliverables(*)
    )
  `)

  if (ownerId && ownerId !== 'all') {
    query = query.eq('owner_id', ownerId)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Transform and calculate derived fields
  let processedInitiatives = data.map((init: any) => {
    let totalEstAllEpics = 0
    let sumProgressWeighted = 0

    const processedEpics = init.epics.map((epic: any) => {
      const activeDeliverables = epic.deliverables.filter((d: any) => d.status !== 'cancelled')
      const allDone = activeDeliverables.length > 0 && activeDeliverables.every((d: any) => d.status === 'done')
      const allCancelled = epic.deliverables.length > 0 && epic.deliverables.every((d: any) => d.status === 'cancelled')
      const anyBlocked = activeDeliverables.some((d: any) => d.status === 'blocked')
      const anyInDev = activeDeliverables.some((d: any) => d.status === 'in_dev')
      const anyRfd = activeDeliverables.some((d: any) => d.status === 'rfd')
      const anyIdeation = activeDeliverables.some((d: any) => d.status === 'ideation')

      // Execution status logic
      let executionStatus = 'not_started'
      if (allCancelled) {
        executionStatus = 'cancelled'
      } else if (allDone) {
        executionStatus = 'done'
      } else if (anyBlocked) {
        executionStatus = 'blocked'
      } else if (anyInDev) {
        executionStatus = 'in_progress'
      } else if (anyRfd) {
        executionStatus = 'rfd'
      } else if (anyIdeation) {
        executionStatus = 'ideation'
      } else if (activeDeliverables.length > 0) {
        // Fallback for partial states
        if (activeDeliverables.some((d: any) => ['in_dev', 'done'].includes(d.status))) {
          executionStatus = 'in_progress'
        }
      }

      // Progress calculation
      const completedEst = epic.deliverables
        .filter((d: any) => d.status === 'done')
        .reduce((sum: number, d: any) => sum + (Number(d.estimation_days) || 0), 0)

      const totalEst = epic.deliverables
        .filter((d: any) => d.status !== 'cancelled')
        .reduce((sum: number, d: any) => sum + (Number(d.estimation_days) || 0), 0)

      const progressEst = totalEst > 0 ? (completedEst / totalEst) * 100 : 0

      totalEstAllEpics += totalEst
      sumProgressWeighted += progressEst * totalEst

      return {
        ...epic,
        execution_status: executionStatus,
        completed_est: completedEst,
        total_est: totalEst,
        progress_est: progressEst,
        deliverable_count: activeDeliverables.length,
        completed_deliverable_count: activeDeliverables.filter((d: any) => d.status === 'done').length
      }
    })

    const initiativePct = totalEstAllEpics > 0 ? sumProgressWeighted / totalEstAllEpics : 0

    return {
      ...init,
      epics: processedEpics,
      progress_est: initiativePct
    }
  })

  return NextResponse.json(processedInitiatives)
}

export async function POST(request: Request) {
  const supabase = createClient()
  try {
    const { title, owner_id } = await request.json()
    if (!title || !owner_id) {
      return NextResponse.json({ error: 'Missing title or owner_id' }, { status: 400 })
    }

    const { data, error } = await supabase.from('initiatives').insert([{ title, owner_id }]).select().single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
