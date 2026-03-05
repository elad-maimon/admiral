'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, ChevronDown, ChevronUp, Tag } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { InlineEdit } from '@/components/ui/inline-edit'
import { Input } from '@/components/ui/input'

export function EpicsDashboard() {
  const queryClient = useQueryClient()

  const [view, setView] = useState<'all' | 'active'>('active')
  const [groupBy, setGroupBy] = useState<'none' | 'initiative' | 'month'>('none')
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set())

  // New inline row state
  const [isCreatingInline, setIsCreatingInline] = useState(false)
  const [newRowData, setNewRowData] = useState({
    title: '',
    epic_id: 'new',
    new_epic_title: '',
    owner_id: 'none',
    estimation: '',
    status: 'backlog'
  })
  const [addingSubTaskTo, setAddingSubTaskTo] = useState<string | null>(null)

  const { data: epics, isLoading: loadingEpics } = useQuery({
    queryKey: ['epics'],
    queryFn: async () => {
      const res = await fetch('/api/v1/epics')
      return res.json()
    }
  })

  const { data: people } = useQuery({
    queryKey: ['people'],
    queryFn: async () => (await fetch('/api/v1/people')).json()
  })
  const { data: initiatives } = useQuery({
    queryKey: ['initiatives'],
    queryFn: async () => (await fetch('/api/v1/initiatives')).json()
  })

  const mutCreateEpicTask = useMutation({
    mutationFn: async (payload: any) => {
      if (payload.type === 'new_epic') {
        const res = await fetch('/api/v1/epics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: payload.epic.title,
            initiative_id: payload.epic.initiative_id,
            planning_status: 'active',
            first_deliverable: payload.deliverable
          })
        })
        if (!res.ok) throw new Error('Failed')
        return res.json()
      } else {
        const res = await fetch('/api/v1/deliverables', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload.deliverable)
        })
        if (!res.ok) throw new Error('Failed')
        return res.json()
      }
    },
    onSuccess: (data, opts) => {
      queryClient.invalidateQueries({ queryKey: ['epics'] })
      setIsCreatingInline(false)
      setAddingSubTaskTo(null)
      setNewRowData({
        title: '',
        epic_id: 'new',
        new_epic_title: '',
        owner_id: 'none',
        estimation: '',
        status: 'backlog',
        initiative_id: ''
      } as any)
      if (opts.type === 'existing_epic') {
        setExpandedEpics(prev => new Set(prev).add(opts.deliverable.epic_id))
      }
    }
  })

  const mutEditDeliverable = useMutation({
    mutationFn: async (payload: { id: string; updates: any }) => {
      const res = await fetch('/api/v1/deliverables/patch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['epics'] })
  })

  const mutEditEpic = useMutation({
    mutationFn: async (payload: { id: string; updates: any }) => {
      const res = await fetch('/api/v1/epics/patch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['epics'] })
  })

  const toggleEpic = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = new Set(expandedEpics)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpandedEpics(next)
  }

  const handleUpdateDeliverable = (id: string, field: string, value: any) => {
    mutEditDeliverable.mutate({ id, updates: { [field]: value } })
  }

  const handleUpdateEpic = (id: string, field: string, value: any) => {
    mutEditEpic.mutate({ id, updates: { [field]: value } })
  }

  const handleSaveInlineRow = (epicId?: string) => {
    if (!newRowData.title.trim()) {
      setIsCreatingInline(false)
      setAddingSubTaskTo(null)
      return
    }

    const payloadTargetEpic = epicId || newRowData.epic_id

    if (payloadTargetEpic === 'new') {
      if (!(newRowData as any).initiative_id) {
        alert('יש לבחור יוזמה לפני יצירת משימה ראשית')
        return
      }
      mutCreateEpicTask.mutate({
        type: 'new_epic',
        epic: {
          title: newRowData.new_epic_title || newRowData.title,
          initiative_id: parseInt((newRowData as any).initiative_id)
        },
        deliverable: {
          title: newRowData.title,
          owner_id: newRowData.owner_id !== 'none' ? newRowData.owner_id : undefined,
          status: newRowData.status,
          estimation_days: newRowData.estimation ? parseFloat(newRowData.estimation) : undefined
        }
      })
    } else {
      mutCreateEpicTask.mutate({
        type: 'existing_epic',
        deliverable: {
          epic_id: payloadTargetEpic,
          title: newRowData.title,
          owner_id: newRowData.owner_id !== 'none' ? newRowData.owner_id : undefined,
          status: newRowData.status,
          estimation_days: newRowData.estimation ? parseFloat(newRowData.estimation) : undefined
        }
      })
    }
  }

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey) return <ChevronDown className='w-3 h-3 opacity-20 ml-1 inline-block' />
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className='w-3 h-3 text-primary ml-1 inline-block' />
    ) : (
      <ChevronDown className='w-3 h-3 text-primary ml-1 inline-block' />
    )
  }

  if (loadingEpics) return <div className='p-4 animate-pulse'>טוען נתונים...</div>

  // Process data for presentation
  let epicRows = epics || []

  if (view === 'active') {
    epicRows = epicRows.filter((epic: any) => {
      const isEpicActive = epic.planning_status === 'active' || epic.planning_status === 'scoping'
      const isDelivActive = epic.deliverables?.some((d: any) => !['done', 'cancelled'].includes(d.status))
      return isEpicActive || isDelivActive
    })
  }

  // Sorting
  if (sortConfig) {
    epicRows.sort((a: any, b: any) => {
      let valA, valB
      const getFirstDeliv = (e: any) => (e.deliverables && e.deliverables.length > 0 ? e.deliverables[0] : null)

      if (sortConfig.key === 'initiative') {
        valA = a.initiative?.title || ''
        valB = b.initiative?.title || ''
      } else if (sortConfig.key === 'epic') {
        valA = a.title || ''
        valB = b.title || ''
      } else if (sortConfig.key === 'title') {
        const dA = getFirstDeliv(a)
        const dB = getFirstDeliv(b)
        valA = dA ? dA.title : a.title
        valB = dB ? dB.title : b.title
      } else if (sortConfig.key === 'owner') {
        valA = getFirstDeliv(a)?.owner_id || a.owner_id || ''
        valB = getFirstDeliv(b)?.owner_id || b.owner_id || ''
      } else if (sortConfig.key === 'status') {
        valA = getFirstDeliv(a)?.status || a.execution_status || ''
        valB = getFirstDeliv(b)?.status || b.execution_status || ''
      } else if (sortConfig.key === 'estimation') {
        valA = a.deliverables?.reduce((acc: number, d: any) => acc + (d.estimation_days || 0), 0) || 0
        valB = b.deliverables?.reduce((acc: number, d: any) => acc + (d.estimation_days || 0), 0) || 0
      } else if (sortConfig.key === 'target') {
        valA = getFirstDeliv(a)?.planned_week_start || a.target_date || '9999-12-31'
        valB = getFirstDeliv(b)?.planned_week_start || b.target_date || '9999-12-31'
      }

      const order = sortConfig.direction === 'asc' ? 1 : -1
      if (valA < valB) return -1 * order
      if (valA > valB) return 1 * order
      return 0
    })
  }

  // Grouping
  let groups: { header: string; rows: any[] }[] = []
  if (groupBy !== 'none') {
    const groupedMap = new Map<string, any[]>()
    epicRows.forEach((epic: any) => {
      let key = 'ללא קבוצה'
      if (groupBy === 'initiative') {
        key = epic.initiative?.title || 'ללא יוזמה'
      } else if (groupBy === 'month') {
        key = epic.target_date
          ? new Date(epic.target_date).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
          : 'ללא חודש יעד'
      }

      if (!groupedMap.has(key)) groupedMap.set(key, [])
      groupedMap.get(key)!.push(epic)
    })

    groups = Array.from(groupedMap.entries()).map(([header, rows]) => ({ header, rows }))
  } else {
    groups = [{ header: 'Flat', rows: epicRows }]
  }

  const statusOptions = ['backlog', 'ideation', 'rfd', 'in_dev', 'blocked', 'done', 'cancelled']
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'in_dev':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'blocked':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200'
    }
  }

  // Fixed 8-column grid — always render all 8 cells in every row, use hidden class to hide cells that don't apply
  // Cols: [initiative] [epic/tag] [deliverable title] [owner] [status] [estimation] [schedule] [actions]
  const rowStyle = {
    display: 'grid',
    gridTemplateColumns:
      'minmax(130px,1fr) minmax(120px,1fr) minmax(200px,2fr) minmax(110px,1fr) 110px 70px minmax(130px,1fr) 40px',
    gap: '0.5rem'
  }

  const renderSingleDeliverableRow = (epic: any, deliverable: any) => (
    <div
      key={`epic-${epic.id}`}
      className='p-1.5 px-4 items-center hover:bg-slate-50 transition-colors text-sm bg-white border-b last:border-0 border-slate-100 group'
      style={rowStyle}
    >
      {/* col 1: Initiative */}
      <div
        className={`truncate text-xs text-slate-500 font-medium ${groupBy === 'initiative' ? 'hidden' : ''}`}
        title={epic.initiative?.title}
      >
        {epic.initiative?.title || '—'}
      </div>

      {/* col 2: Epic/Tag */}
      <div className='truncate flex items-center gap-1'>
        <Tag className='w-3 h-3 text-slate-300 min-w-3' />
        <InlineEdit
          value={epic.title}
          onSave={v => handleUpdateEpic(epic.id, 'title', v)}
          className='font-medium text-slate-500 truncate'
        />
      </div>

      {/* col 3: Deliverable Title */}
      <div className='font-bold text-slate-800 truncate' title={deliverable?.title || epic.title}>
        <InlineEdit
          value={deliverable?.title || epic.title}
          onSave={v =>
            deliverable ? handleUpdateDeliverable(deliverable.id, 'title', v) : handleUpdateEpic(epic.id, 'title', v)
          }
          className='font-bold text-slate-800 w-full'
        />
      </div>

      {/* col 4: Owner */}
      <div>
        <Select
          value={deliverable?.owner_id || epic.owner_id || 'none'}
          onValueChange={v =>
            deliverable
              ? handleUpdateDeliverable(deliverable.id, 'owner_id', v === 'none' ? null : v)
              : handleUpdateEpic(epic.id, 'owner_id', v === 'none' ? null : v)
          }
        >
          <SelectTrigger className='h-7 w-full border-transparent hover:border-slate-200 bg-transparent shadow-none px-2 text-xs'>
            <SelectValue placeholder='ללא פעיל' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='none' className='text-slate-400 italic'>
              ללא פעיל
            </SelectItem>
            {people?.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* col 5: Status */}
      <div>
        {deliverable ? (
          <Select value={deliverable.status} onValueChange={v => handleUpdateDeliverable(deliverable.id, 'status', v)}>
            <SelectTrigger
              className={`h-7 w-full border-transparent shadow-none px-2 text-[11px] ${getStatusBadgeColor(deliverable.status)}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(opt => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge
            variant='outline'
            className='font-normal pb-0.5 text-[11px] bg-slate-50 text-slate-400 border-slate-100'
          >
            אין תוצר
          </Badge>
        )}
      </div>

      {/* col 6: Estimation */}
      <div className='text-slate-600 font-mono text-center text-xs flex items-center justify-center'>
        {deliverable ? (
          <div className='flex items-center'>
            <InlineEdit
              value={deliverable.estimation_days ? deliverable.estimation_days.toString() : ''}
              onSave={v => handleUpdateDeliverable(deliverable.id, 'estimation_days', v ? parseFloat(v) : null)}
              className='w-8 text-center'
            />
            <span className='text-slate-400 ml-0.5'>d</span>
          </div>
        ) : (
          '—'
        )}
      </div>

      {/* col 7: Schedule */}
      <div className={`text-slate-500 text-[11px] flex items-center ${groupBy === 'month' ? 'hidden' : ''}`}>
        {deliverable?.planned_week_start
          ? new Date(deliverable.planned_week_start).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })
          : '?'}
        {' - '}
        {deliverable?.planned_week_end
          ? new Date(deliverable.planned_week_end).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })
          : '?'}
      </div>

      {/* col 8: Actions */}
      <div className='flex justify-end opacity-0 group-hover:opacity-100 transition-opacity'>
        <Button
          variant='ghost'
          size='icon'
          className='h-6 w-6 text-primary hover:bg-primary/10'
          onClick={() => setAddingSubTaskTo(epic.id)}
          title='פצל משימה'
        >
          <ChevronDown className='w-3 h-3' />
        </Button>
      </div>

      {/* Inline Sub-task Creator (spans all cols) */}
      {addingSubTaskTo === epic.id && <div className='col-span-full mt-1 pl-4'>{renderInlineRow(epic.id)}</div>}
    </div>
  )

  const renderMultiDeliverableRow = (epic: any) => {
    const isExpanded = expandedEpics.has(epic.id) || addingSubTaskTo === epic.id
    const deliverables = epic.deliverables || []

    // Sum estimations
    const totalEst = deliverables.reduce((acc: number, d: any) => acc + (d.estimation_days || 0), 0)

    return (
      <div key={`epic-${epic.id}`} className='flex flex-col border-b last:border-0 border-slate-200'>
        {/* Parent Epic Row */}
        <div
          className='p-1.5 px-4 items-center hover:bg-slate-50 transition-colors cursor-pointer text-sm bg-slate-50/50 group'
          onClick={e => toggleEpic(epic.id, e)}
          style={rowStyle}
        >
          {/* col 1: Initiative */}
          <div
            className={`text-slate-500 font-medium truncate text-xs flex items-center gap-1 ${groupBy === 'initiative' ? 'hidden' : ''}`}
          >
            {isExpanded ? (
              <ChevronUp className='w-3 h-3 text-slate-400 min-w-3' />
            ) : (
              <ChevronDown className='w-3 h-3 text-slate-400 min-w-3' />
            )}
            <span className='truncate' title={epic.initiative?.title}>
              {epic.initiative?.title || '—'}
            </span>
          </div>

          {/* col 2: Epic/Tag */}
          <div className='truncate flex items-center gap-1'>
            {groupBy === 'initiative' &&
              (isExpanded ? (
                <ChevronUp className='w-3 h-3 text-slate-400 min-w-3' />
              ) : (
                <ChevronDown className='w-3 h-3 text-slate-400 min-w-3' />
              ))}
            <Tag className='w-3 h-3 text-slate-400 min-w-3' />
            <span className='font-normal text-slate-500 truncate text-xs'>{epic.title}</span>
          </div>

          {/* col 3: Title / count badge */}
          <div className='font-bold text-slate-800 truncate flex items-center gap-2' title={epic.title}>
            <span className='font-bold text-slate-800 truncate'>{epic.title}</span>
            <span className='text-[10px] font-normal text-slate-400 bg-white px-1.5 rounded-full border border-slate-200 whitespace-nowrap'>
              {deliverables.length} תתי־משימות
            </span>
          </div>

          {/* col 4: Owner */}
          <div className='text-slate-600 truncate text-xs'>
            {epic.owner_id ? people?.find((p: any) => p.id === epic.owner_id)?.name : '—'}
          </div>

          {/* col 5: Status */}
          <div>
            <Badge variant='secondary' className='font-normal text-[11px] pb-0.5 bg-slate-200/50 text-slate-700'>
              {epic.execution_status === 'done'
                ? 'הושלם'
                : epic.execution_status === 'in_dev'
                  ? 'בביצוע'
                  : epic.execution_status === 'blocked'
                    ? 'חסום'
                    : 'בתכנון'}
            </Badge>
          </div>

          {/* col 6: Estimation */}
          <div className='text-slate-600 font-mono text-center text-xs font-bold'>
            {totalEst > 0 ? `${totalEst}d` : '—'}
          </div>

          {/* col 7: Schedule */}
          <div className={`text-slate-400 text-[11px] italic ${groupBy === 'month' ? 'hidden' : ''}`}>—</div>

          {/* col 8: Actions */}
          <div className='flex justify-end opacity-0 group-hover:opacity-100 transition-opacity'>
            <Button
              variant='ghost'
              size='icon'
              className='h-6 w-6 text-primary hover:bg-primary/10'
              onClick={e => {
                e.stopPropagation()
                setAddingSubTaskTo(epic.id)
                setExpandedEpics(prev => new Set(prev).add(epic.id))
              }}
              title='הוסף תת-משימה'
            >
              <Plus className='w-3 h-3' />
            </Button>
          </div>
        </div>

        {/* Child Deliverable Rows */}
        {isExpanded && (
          <div className='bg-white border-t border-slate-100 divide-y divide-slate-50 relative'>
            <div className='absolute right-6 top-0 bottom-0 w-px bg-slate-100 z-0'></div>
            {deliverables.map((deliverable: any) => (
              <div
                key={`deliv-${deliverable.id}`}
                className='p-1.5 px-4 items-center hover:bg-slate-50 transition-colors text-sm relative z-10'
                style={rowStyle}
              >
                {/* col 1: Initiative (spacer) */}
                <div className={groupBy === 'initiative' ? 'hidden' : ''}></div>

                {/* col 2: Epic/Tag (indent label) */}
                <div className='text-slate-300 pointer-events-none text-xs'>↳ תת־משימה</div>

                {/* col 3: Title */}
                <div className='font-medium text-slate-700 truncate' title={deliverable.title}>
                  <InlineEdit
                    value={deliverable.title}
                    onSave={v => handleUpdateDeliverable(deliverable.id, 'title', v)}
                    className='w-full'
                  />
                </div>

                {/* col 4: Owner */}
                <div>
                  <Select
                    value={deliverable.owner_id || 'none'}
                    onValueChange={v => handleUpdateDeliverable(deliverable.id, 'owner_id', v === 'none' ? null : v)}
                  >
                    <SelectTrigger className='h-7 w-full border-transparent hover:border-slate-200 bg-transparent shadow-none px-2 text-xs'>
                      <SelectValue placeholder='ללא שיוך' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='none' className='text-slate-400 italic'>
                        ללא שיוך
                      </SelectItem>
                      {people?.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* col 5: Status */}
                <div>
                  <Select
                    value={deliverable.status}
                    onValueChange={v => handleUpdateDeliverable(deliverable.id, 'status', v)}
                  >
                    <SelectTrigger
                      className={`h-7 w-full border-transparent shadow-none px-2 text-[11px] ${getStatusBadgeColor(deliverable.status)}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(opt => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* col 6: Estimation */}
                <div className='text-slate-600 font-mono text-center text-xs flex items-center justify-center'>
                  <InlineEdit
                    value={deliverable.estimation_days ? deliverable.estimation_days.toString() : ''}
                    onSave={v => handleUpdateDeliverable(deliverable.id, 'estimation_days', v ? parseFloat(v) : null)}
                    className='w-8 text-center'
                  />
                  <span className='text-slate-400 ml-0.5'>d</span>
                </div>

                {/* col 7: Schedule */}
                <div className={`text-slate-500 text-[11px] ${groupBy === 'month' ? 'hidden' : ''}`}>
                  {deliverable.planned_week_start
                    ? new Date(deliverable.planned_week_start).toLocaleDateString('he-IL', {
                        day: '2-digit',
                        month: '2-digit'
                      })
                    : '?'}
                  {' - '}
                  {deliverable.planned_week_end
                    ? new Date(deliverable.planned_week_end).toLocaleDateString('he-IL', {
                        day: '2-digit',
                        month: '2-digit'
                      })
                    : '?'}
                </div>

                {/* col 8: Actions (empty for sub-rows) */}
                <div></div>
              </div>
            ))}

            {/* Inline Sub-task Creator */}
            {addingSubTaskTo === epic.id && (
              <div className='pr-12 border-t border-slate-50'>{renderInlineRow(epic.id)}</div>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderInlineRow = (forceEpicId?: string) => (
    <div
      className={`p-1.5 px-4 items-center transition-colors text-sm bg-blue-50/50 border-b border-blue-100 ${forceEpicId ? 'border-none bg-slate-50' : ''}`}
      style={rowStyle}
    >
      {/* col 1: Initiative picker */}
      <div className={groupBy === 'initiative' ? 'hidden' : ''}>
        {!forceEpicId ? (
          <Select
            value={(newRowData as any).initiative_id || ''}
            onValueChange={v => setNewRowData({ ...newRowData, initiative_id: v } as any)}
          >
            <SelectTrigger className='h-7 w-full border-slate-200 bg-white shadow-none px-2 text-xs'>
              <SelectValue placeholder='* בחר יוזמה' />
            </SelectTrigger>
            <SelectContent>
              {initiatives?.map((i: any) => (
                <SelectItem key={i.id} value={i.id.toString()}>
                  {i.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      {/* col 2: Epic tag input */}
      <div>
        {!forceEpicId ? (
          <Input
            value={newRowData.new_epic_title}
            onChange={e => setNewRowData({ ...newRowData, new_epic_title: e.target.value })}
            placeholder='תגית (אופציונלי)'
            className='h-7 text-xs bg-white shadow-none focus-visible:ring-1 focus-visible:ring-primary'
            autoFocus
          />
        ) : (
          <div className='text-slate-400 text-xs'>✧ תת־משימה</div>
        )}
      </div>

      {/* col 3: Title */}
      <div>
        <Input
          value={newRowData.title}
          onChange={e => setNewRowData({ ...newRowData, title: e.target.value })}
          placeholder='שם המשימה/תוצר'
          className='h-7 text-xs font-bold bg-white shadow-none focus-visible:ring-1 focus-visible:ring-primary w-full'
          onKeyDown={e => {
            if (e.key === 'Enter') handleSaveInlineRow(forceEpicId)
            if (e.key === 'Escape') {
              setIsCreatingInline(false)
              setAddingSubTaskTo(null)
            }
          }}
          autoFocus={!!forceEpicId}
        />
      </div>

      {/* col 4: Owner */}
      <div>
        <Select value={newRowData.owner_id} onValueChange={v => setNewRowData({ ...newRowData, owner_id: v })}>
          <SelectTrigger className='h-7 w-full border-slate-200 bg-white shadow-none px-2 text-xs'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='none' className='text-slate-400 italic'>
              ללא שיוך
            </SelectItem>
            {people?.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* col 5: Status */}
      <div>
        <Select value={newRowData.status} onValueChange={v => setNewRowData({ ...newRowData, status: v })}>
          <SelectTrigger className='h-7 w-full shadow-none px-2 text-[11px] bg-white border-slate-200'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map(opt => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* col 6: Estimation */}
      <div>
        <Input
          value={newRowData.estimation}
          onChange={e => setNewRowData({ ...newRowData, estimation: e.target.value })}
          placeholder='d'
          className='h-7 text-xs text-center font-mono bg-white shadow-none focus-visible:ring-1 focus-visible:ring-primary'
          onKeyDown={e => e.key === 'Enter' && handleSaveInlineRow(forceEpicId)}
        />
      </div>

      {/* col 7: Schedule (placeholder) */}
      <div className={`text-slate-400 text-[11px] flex items-center ${groupBy === 'month' ? 'hidden' : ''}`}>—</div>

      {/* col 8: Save action */}
      <div className='flex gap-1 justify-end'>
        <Button
          variant='ghost'
          size='icon'
          className='h-6 w-6 text-emerald-600 hover:bg-emerald-50'
          onClick={() => handleSaveInlineRow(forceEpicId)}
        >
          <Plus className='w-3 h-3' />
        </Button>
      </div>
    </div>
  )

  return (
    <div className='space-y-6 pb-12'>
      <div className='flex flex-col gap-4'>
        <div className='flex items-center justify-between'>
          <h1 className='text-3xl font-bold tracking-tight'>משימות ותוצרים</h1>
          <Button onClick={() => setIsCreatingInline(true)} disabled={isCreatingInline}>
            <Plus className='w-4 h-4 ml-2' />
            משימה חדשה
          </Button>
        </div>

        <div className='flex items-center gap-4 bg-slate-50/50 p-2 rounded-md border min-w-max w-fit'>
          <div className='flex items-center space-x-2 space-x-reverse bg-white p-1 rounded-md shadow-sm border border-slate-200'>
            <Button
              variant={view === 'active' ? 'secondary' : 'ghost'}
              size='sm'
              onClick={() => setView('active')}
              className={view === 'active' ? 'bg-slate-200 shadow-sm font-medium' : 'text-slate-500'}
            >
              משימות פעילות
            </Button>
            <Button
              variant={view === 'all' ? 'secondary' : 'ghost'}
              size='sm'
              onClick={() => setView('all')}
              className={view === 'all' ? 'bg-slate-200 shadow-sm font-medium' : 'text-slate-500'}
            >
              צפה בהכל
            </Button>
          </div>

          <div className='h-6 w-px bg-slate-200 mx-2' />

          <div className='flex items-center gap-2'>
            <span className='text-sm text-slate-500 font-medium'>קבץ לפי:</span>
            <Select value={groupBy} onValueChange={(val: any) => setGroupBy(val)}>
              <SelectTrigger className='w-[140px] bg-white h-9'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='none'>ללא קיבוץ</SelectItem>
                <SelectItem value='initiative'>יוזמה</SelectItem>
                <SelectItem value='month'>חודש יעד</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className='border bg-white shadow-sm rounded-md overflow-hidden'>
        {/* Table Header — always 8 cols, mirror rowStyle exactly */}
        <div
          className='p-1.5 bg-slate-100 border-b font-semibold text-slate-600 text-sm px-4 z-10 relative select-none'
          style={rowStyle}
        >
          {/* col 1 */}
          <div
            className={`cursor-pointer hover:text-slate-900 flex items-center ${groupBy === 'initiative' ? 'hidden' : ''}`}
            onClick={() => handleSort('initiative')}
          >
            יוזמה <SortIcon columnKey='initiative' />
          </div>
          {/* col 2 */}
          <div className='cursor-pointer hover:text-slate-900 flex items-center' onClick={() => handleSort('epic')}>
            תגית <SortIcon columnKey='epic' />
          </div>
          {/* col 3 */}
          <div className='cursor-pointer hover:text-slate-900 flex items-center' onClick={() => handleSort('title')}>
            שם המשימה/תוצר <SortIcon columnKey='title' />
          </div>
          {/* col 4 */}
          <div className='cursor-pointer hover:text-slate-900 flex items-center' onClick={() => handleSort('owner')}>
            אחראי <SortIcon columnKey='owner' />
          </div>
          {/* col 5 */}
          <div className='cursor-pointer hover:text-slate-900 flex items-center' onClick={() => handleSort('status')}>
            סטטוס <SortIcon columnKey='status' />
          </div>
          {/* col 6 */}
          <div
            className='cursor-pointer hover:text-slate-900 flex items-center justify-center'
            onClick={() => handleSort('estimation')}
          >
            הערכה <SortIcon columnKey='estimation' />
          </div>
          {/* col 7 */}
          <div
            className={`cursor-pointer hover:text-slate-900 flex items-center ${groupBy === 'month' ? 'hidden' : ''}`}
            onClick={() => handleSort('target')}
          >
            לו&quot;ז <SortIcon columnKey='target' />
          </div>
          {/* col 8 */}
          <div></div>
        </div>

        <div className='flex flex-col pb-4'>
          {groups.length === 0 || (groups.length === 1 && groups[0].rows.length === 0) ? (
            <div className='p-8 text-center text-slate-500 italic bg-white'>לא נמצאו משימות מתאימות לפילטר</div>
          ) : (
            groups.map((group, idx) => (
              <div key={idx} className='flex flex-col bg-white'>
                {groupBy !== 'none' && (
                  <div className='p-2 px-4 bg-slate-50/80 border-b border-t font-semibold text-slate-700 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] first:border-t-0 sticky top-0 backdrop-blur-sm z-10 flex items-center justify-between'>
                    <span>{group.header}</span>
                    <Badge variant='outline' className='bg-white'>
                      {group.rows.length} שורות
                    </Badge>
                  </div>
                )}

                <div className='flex flex-col'>
                  {group.rows.map((epic: any) => {
                    const deliverables = epic.deliverables || []
                    if (deliverables.length <= 1) {
                      return renderSingleDeliverableRow(epic, deliverables[0])
                    } else {
                      return renderMultiDeliverableRow(epic)
                    }
                  })}
                </div>
              </div>
            ))
          )}

          {/* Main List Inline Creator */}
          {isCreatingInline && renderInlineRow()}
        </div>

        {!isCreatingInline && (
          <div
            className='px-4 py-3 bg-white border-t border-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-50 cursor-pointer flex items-center gap-2 text-sm transition-colors'
            onClick={() => setIsCreatingInline(true)}
          >
            <div className='border border-slate-200 rounded text-slate-400 bg-white shadow-sm p-0.5'>
              <Plus className='w-3 h-3' />
            </div>{' '}
            הוסף משימה
          </div>
        )}
      </div>
    </div>
  )
}
