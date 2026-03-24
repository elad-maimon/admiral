'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, ChevronDown, ChevronUp, Tag, Pencil } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { InlineEdit } from '@/components/ui/inline-edit'
import { Input } from '@/components/ui/input'

export function EpicsDashboard() {
  const queryClient = useQueryClient()

  const [view, setView] = useState<'all' | 'active'>('active')
  const [groupBy, setGroupBy] = useState<'none' | 'initiative' | 'month'>('none')
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set())

  const [dodModalOpen, setDodModalOpen] = useState(false)
  const [dodModalDeliverable, setDodModalDeliverable] = useState<any>(null)
  const [dodModalText, setDodModalText] = useState('')

  // New inline row state
  const [isCreatingInline, setIsCreatingInline] = useState(false)
  const [newRowData, setNewRowData] = useState({
    title: '',
    epic_id: 'new',
    new_epic_title: '',
    owner_id: 'none',
    estimation: '',
    status: 'backlog',
    importance: 3,
    lighthouse_month: ''
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
        initiative_id: '',
        lighthouse_month: ''
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
    const payloadTargetEpic = epicId || newRowData.epic_id

    if (payloadTargetEpic === 'new') {
      if (!newRowData.title.trim() && !newRowData.new_epic_title.trim()) {
        setIsCreatingInline(false)
        setAddingSubTaskTo(null)
        return
      }
      if (!(newRowData as any).initiative_id) {
        alert('יש לבחור יוזמה לפני יצירת משימה ראשית')
        return
      }

      const hasDeliverable = newRowData.title.trim().length > 0

      mutCreateEpicTask.mutate({
        type: 'new_epic',
        epic: {
          title: newRowData.new_epic_title || newRowData.title,
          initiative_id: parseInt((newRowData as any).initiative_id),
          importance: (newRowData as any).importance,
          owner_id: newRowData.owner_id !== 'none' ? newRowData.owner_id : undefined
        },
        deliverable: hasDeliverable
          ? {
              title: newRowData.title,
              status: newRowData.status,
              estimation_days: newRowData.estimation ? parseFloat(newRowData.estimation) : undefined,
              lighthouse_month: (newRowData as any).lighthouse_month ? `${(newRowData as any).lighthouse_month}-01` : undefined
            }
          : undefined
      })
    } else {
      if (!newRowData.title.trim()) {
        setIsCreatingInline(false)
        setAddingSubTaskTo(null)
        return
      }
      mutCreateEpicTask.mutate({
        type: 'existing_epic',
        deliverable: {
          epic_id: payloadTargetEpic,
          title: newRowData.title,
          status: newRowData.status,
          estimation_days: newRowData.estimation ? parseFloat(newRowData.estimation) : undefined,
          lighthouse_month: (newRowData as any).lighthouse_month ? `${(newRowData as any).lighthouse_month}-01` : undefined
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
        valA = getFirstDeliv(a)?.lighthouse_month || a.target_date || '9999-12-31'
        valB = getFirstDeliv(b)?.lighthouse_month || b.target_date || '9999-12-31'
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

  const getMonthOptions = () => {
    const options = []
    const now = new Date()
    for (let i = -3; i <= 8; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
        const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
        const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        options.push({ value: val, label })
    }
    return options
  }
  const monthOptions = getMonthOptions()

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

  const renderNewEpicCell = () => (
    <>
      <td className='py-0.5 px-2 align-middle w-[140px] bg-blue-50 border-b border-r border-slate-200/60'>
        <Select
          value={(newRowData as any).initiative_id || ''}
          onValueChange={v => {
            const init = initiatives?.find((i: any) => i.id.toString() === v)
            setNewRowData({ ...newRowData, initiative_id: v, owner_id: init?.owner_id || 'none' } as any)
          }}
        >
          <SelectTrigger className='h-7 w-full border-slate-200 bg-white shadow-none px-2 text-xs !p-1'>
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
      </td>
      <td className='py-0.5 px-2 align-middle w-[220px] bg-blue-50 border-b border-l border-slate-200/60'>
        <div className='flex flex-col gap-1'>
          <Input
            value={newRowData.new_epic_title}
            onChange={e => setNewRowData({ ...newRowData, new_epic_title: e.target.value })}
            placeholder='אפיק (אופציונלי)'
            className='h-7 text-xs bg-white shadow-none focus-visible:ring-1 focus-visible:ring-primary w-full'
          />
            <div className='flex items-center gap-1.5'>
              <span className='text-[10px] text-slate-500'>עדיפות:</span>
              <Select
                value={String((newRowData as any).importance)}
                onValueChange={v => setNewRowData({ ...newRowData, importance: parseInt(v) } as any)}
              >
                <SelectTrigger className='h-5 text-[10px] border-slate-200 bg-white shadow-none px-1.5 py-0 w-[78px] min-h-0'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='4' className='text-[10px]'>
                    NTH
                  </SelectItem>
                  <SelectItem value='3' className='text-[10px]'>
                    רגיל
                  </SelectItem>
                  <SelectItem value='2' className='text-[10px]'>
                    אסטרטגי
                  </SelectItem>
                  <SelectItem value='1' className='text-[10px]'>
                    מחויב
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
        </div>
      </td>
      <td className='py-0.5 px-2 align-middle w-[100px] bg-blue-50 border-b border-l border-slate-200/60'>
        <Select value={newRowData.owner_id} onValueChange={(v) => setNewRowData({ ...newRowData, owner_id: v } as any)}>
          <SelectTrigger className='h-7 border-transparent hover:border-slate-200 bg-white shadow-none px-2 text-xs'>
            <SelectValue placeholder='ללא שיוך' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='none' className='text-[10px] italic'>
              ללא שיוך
            </SelectItem>
            {people?.map((p: any) => (
              <SelectItem key={p.id} value={p.id} className='text-[10px]'>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
    </>
  )

  const renderNewDeliverableCells = (forceEpicId: boolean) => (
    <>
      <td className='p-1.5 align-middle'>
        <Input
          value={newRowData.title}
          onChange={e => setNewRowData({ ...newRowData, title: e.target.value })}
          placeholder='שם ה-deliverable'
          className='h-7 text-xs font-bold bg-white shadow-none focus-visible:ring-1 focus-visible:ring-primary w-full'
          onKeyDown={e => {
            if (e.key === 'Enter') handleSaveInlineRow(forceEpicId ? addingSubTaskTo! : undefined)
            if (e.key === 'Escape') {
              setIsCreatingInline(false)
              setAddingSubTaskTo(null)
            }
          }}
          autoFocus={forceEpicId}
        />
      </td>
      <td className='p-2 align-middle w-[360px]'></td>
      <td className='p-1.5 align-middle w-[110px]'>
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
      </td>
      <td className='p-2 align-middle w-[80px]'>
        <Input
          value={newRowData.estimation}
          onChange={e => setNewRowData({ ...newRowData, estimation: e.target.value })}
          placeholder='d'
          className='h-7 text-xs text-center font-mono bg-white shadow-none focus-visible:ring-1 focus-visible:ring-primary'
          onKeyDown={e => e.key === 'Enter' && handleSaveInlineRow(forceEpicId ? addingSubTaskTo! : undefined)}
        />
      </td>
      <td className='p-1.5 align-middle w-[80px]'>
        <Select
          value={(newRowData as any).lighthouse_month ? `${(newRowData as any).lighthouse_month}-01` : 'none'}
          onValueChange={v => setNewRowData({ ...newRowData, lighthouse_month: v === 'none' ? '' : v.substring(0, 7) } as any)}
        >
          <SelectTrigger className='h-7 w-[68px] shadow-none px-1.5 text-[11px] bg-white border-slate-200 tracking-tight'>
            <SelectValue placeholder='-' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='none'>-</SelectItem>
            {monthOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className='p-2 align-middle w-[40px] text-left'>
        <Button
          variant='ghost'
          size='icon'
          className='h-6 w-6 text-emerald-600 hover:bg-emerald-50'
          onClick={() => handleSaveInlineRow(forceEpicId ? addingSubTaskTo! : undefined)}
        >
          <Plus className='w-3 h-3' />
        </Button>
      </td>
    </>
  )

  return (
    <div className='space-y-6 pb-12'>
      <div className='flex flex-col gap-4'>
        <div className='flex items-center justify-between'>
          <h1 className='text-3xl font-bold tracking-tight'>משימות ותוצרים</h1>
          <Button onClick={() => setIsCreatingInline(true)} disabled={isCreatingInline}>
            <Plus className='w-4 h-4 ml-2' />
            הוספת אפיק
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
        <div className='overflow-x-auto'>
          <table className='w-full text-right text-sm'>
            <thead className='bg-slate-50 py-2 border-b select-none font-semibold text-xs text-slate-500'>
              <tr>
                <th
                  className='p-2.5 px-4 whitespace-nowrap font-semibold cursor-pointer hover:text-slate-900 group/th w-[140px]'
                  onClick={() => handleSort('initiative')}
                >
                  יוזמה <SortIcon columnKey='initiative' />
                </th>
                <th
                  className='p-2.5 px-4 whitespace-nowrap font-semibold cursor-pointer hover:text-slate-900 group/th w-[220px]'
                  onClick={() => handleSort('epic')}
                >
                  אפיק <SortIcon columnKey='epic' />
                </th>
                <th
                  className='p-2.5 px-4 whitespace-nowrap font-semibold cursor-pointer hover:text-slate-900 group/th w-[100px]'
                  onClick={() => handleSort('owner')}
                >
                  אחראי/ת <SortIcon columnKey='owner' />
                </th>
                <th
                  className='p-2.5 whitespace-nowrap font-semibold cursor-pointer hover:text-slate-900 group/th w-[260px]'
                  onClick={() => handleSort('title')}
                >
                  שם ה-deliverable <SortIcon columnKey='title' />
                </th>
                <th
                  className='p-2.5 whitespace-nowrap font-semibold cursor-pointer hover:text-slate-900 group/th w-[360px]'
                  onClick={() => handleSort('dod')}
                >
                  DoD <SortIcon columnKey='dod' />
                </th>
                <th
                  className='p-2.5 whitespace-nowrap font-semibold cursor-pointer hover:text-slate-900 group/th w-[110px]'
                  onClick={() => handleSort('status')}
                >
                  סטטוס <SortIcon columnKey='status' />
                </th>
                <th
                  className='p-2.5 whitespace-nowrap font-semibold cursor-pointer hover:text-slate-900 group/th w-[70px] text-center'
                  onClick={() => handleSort('estimation')}
                >
                  הערכה <SortIcon columnKey='estimation' />
                </th>
                <th
                  className='p-2.5 whitespace-nowrap font-semibold cursor-pointer hover:text-slate-900 group/th w-[80px]'
                  onClick={() => handleSort('target')}
                >
                  LH <SortIcon columnKey='target' />
                </th>
                <th className='p-2.5 w-[40px]'></th>
              </tr>
            </thead>
            {groups.length === 0 || (groups.length === 1 && groups[0].rows.length === 0) ? (
              <tbody>
                <tr>
                  <td colSpan={9} className='p-8 text-center text-slate-500 italic'>
                    לא נמצאו משימות מתאימות לפילטר
                  </td>
                </tr>
              </tbody>
            ) : (
              groups.map((group, gIdx) => (
                <tbody key={`group-${gIdx}`} className='divide-y divide-slate-100'>
                  {groupBy !== 'none' && (
                    <tr className='bg-slate-50/80 border-b font-semibold text-slate-700 text-sm'>
                      <td colSpan={9} className='p-2 px-4'>
                        <div className='flex items-center justify-between'>
                          <span>{group.header}</span>
                          <Badge variant='outline' className='bg-white'>
                            {group.rows.length} אפיקים
                          </Badge>
                        </div>
                      </td>
                    </tr>
                  )}
                  {group.rows.map((epic: any) => {
                    const deliverables = epic.deliverables || []
                    const rowCount = Math.max(1, deliverables.length) + (addingSubTaskTo === epic.id ? 1 : 0)
                    const totalEst = deliverables.reduce((acc: number, d: any) => acc + (d.estimation_days || 0), 0)

                    const epicCell = (
                      <>
                        <td
                          rowSpan={rowCount}
                          className='py-0.5 px-2 border-b border-slate-200/60 bg-slate-50/30 align-top w-[140px]'
                        >
                          {epic.initiative ? (
                            <div className='text-xs font-medium text-slate-600 truncate' title={epic.initiative.title}>
                              {epic.initiative.title}
                            </div>
                          ) : (
                            <span className='text-slate-400 italic text-xs'>—</span>
                          )}
                        </td>
                        <td
                          rowSpan={rowCount}
                          className='py-0.5 px-2 border-b border-l border-slate-200/60 bg-slate-50/30 align-top w-[220px] relative group/epic'
                        >
                          <div className='flex flex-col flex-1 min-w-0'>
                            <div className='flex items-start justify-between gap-1 mb-1'>
                              <div
                                className='font-bold text-slate-800 text-sm leading-tight whitespace-nowrap overflow-hidden text-ellipsis cursor-text flex-1'
                                title={epic.title}
                              >
                                <InlineEdit
                                  value={epic.title}
                                  onSave={v => handleUpdateEpic(epic.id, 'title', v)}
                                  className='w-full !p-0 !m-0 !bg-transparent !border-transparent hover:!text-slate-900'
                                />
                              </div>
                              <Button
                                variant='ghost'
                                size='icon'
                                className='h-5 w-5 min-w-5 rounded hover:bg-slate-200 text-slate-400 opacity-0 group-hover/epic:opacity-100 transition-opacity shrink-0'
                                onClick={() => setAddingSubTaskTo(epic.id)}
                                title='הוסף deliverable'
                              >
                                <Plus className='w-3 h-3' />
                              </Button>
                            </div>

                            <div className='flex flex-row items-center gap-1.5 flex-wrap'>
                              <Select
                                value={epic.planning_status || 'scoping'}
                                onValueChange={v => handleUpdateEpic(epic.id, 'planning_status', v)}
                              >
                                <SelectTrigger className='h-4 text-[10px] border-slate-200 bg-white shadow-none px-1 py-0 w-[70px] min-h-0'>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {['scoping', 'active', 'cancelled'].map(opt => (
                                    <SelectItem key={opt} value={opt} className='text-[10px]'>
                                      {opt}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Badge
                                variant='outline'
                                className={`font-medium text-[10px] px-1.5 py-0 h-4 leading-4 cursor-pointer hover:opacity-80 transition-colors ${
                                  epic.importance === 1
                                    ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                    : epic.importance === 2
                                      ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                                      : epic.importance === 3
                                        ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                        : epic.importance === 4
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                          : 'bg-white text-slate-500 hover:bg-slate-50'
                                }`}
                                onClick={() => {
                                  let next = (epic.importance || 0) + 1
                                  if (next > 4) next = 1
                                  handleUpdateEpic(epic.id, 'importance', next)
                                }}
                              >
                                {epic.importance === 1
                                  ? 'מחויב'
                                  : epic.importance === 2
                                    ? 'אסטרטגי'
                                    : epic.importance === 3
                                      ? 'רגיל'
                                      : epic.importance === 4
                                        ? 'NTH'
                                        : 'Imp+'}
                              </Badge>
                              {totalEst > 0 && (
                                <span className='font-mono font-medium text-slate-500 bg-slate-100 px-1 rounded h-4 leading-4 flex items-center justify-center text-[10px] min-w-[20px]'>
                                  {totalEst}d
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td
                          rowSpan={rowCount}
                          className='py-0.5 px-2 border-b border-l border-slate-200/60 bg-slate-50/30 align-top w-[100px]'
                        >
                          <Select
                            value={epic.owner_id || 'none'}
                            onValueChange={v => handleUpdateEpic(epic.id, 'owner_id', v === 'none' ? null : v)}
                          >
                            <SelectTrigger className='h-7 border-transparent hover:border-slate-200 bg-transparent shadow-none px-2 text-xs'>
                              <SelectValue placeholder='ללא שיוך' />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='none' className='text-[10px] italic'>
                                ללא שיוך
                              </SelectItem>
                              {people?.map((p: any) => (
                                <SelectItem key={p.id} value={p.id} className='text-[10px]'>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      </>
                    )

                    if (deliverables.length === 0) {
                      return (
                        <tr
                          key={`epic-${epic.id}`}
                          className='hover:bg-slate-50 transition-colors bg-white group border-b border-slate-100 last:border-0'
                        >
                          {epicCell}
                          {addingSubTaskTo === epic.id ? (
                            renderNewDeliverableCells(true)
                          ) : (
                            <td colSpan={6} className='p-3 text-slate-400 italic text-xs'>
                              אין תוצרים עדיין.
                            </td>
                          )}
                        </tr>
                      )
                    }

                    const rows = []
                    for (let i = 0; i < deliverables.length; i++) {
                      const deliverable = deliverables[i]
                      rows.push(
                        <tr
                          key={`deliv-${deliverable.id}`}
                          className='hover:bg-slate-50 transition-colors bg-white group border-b border-slate-100 last:border-0'
                        >
                          {i === 0 && epicCell}
                          <td className='p-1.5 align-middle'>
                            <div
                              className='font-medium text-slate-700 cursor-text block w-full'
                              title={deliverable.title}
                            >
                              <InlineEdit
                                value={deliverable.title}
                                onSave={v => handleUpdateDeliverable(deliverable.id, 'title', v)}
                                className='w-full !p-0 !m-0 !bg-transparent !border-transparent line-clamp-2 whitespace-normal break-words leading-tight'
                                multiline={true}
                              />
                            </div>
                          </td>
                          <td className='p-1.5 align-middle w-[360px]'>
                            <div className='group relative flex items-start w-full bg-transparent hover:bg-slate-50 rounded border border-transparent hover:border-slate-200 h-[36px] overflow-hidden'>
                              <div className='flex-1 h-full overflow-hidden text-[11px] text-slate-600 px-1 py-0.5 cursor-text z-0'>
                                <InlineEdit
                                  value={deliverable.dod || ''}
                                  onSave={v => handleUpdateDeliverable(deliverable.id, 'dod', v)}
                                  className='w-full h-full min-h-[34px] !p-0 !m-0 !bg-transparent !border-transparent leading-tight resize-none whitespace-pre-wrap overflow-y-auto'
                                  multiline={true}
                                />
                              </div>
                              <Button
                                variant='outline'
                                size='icon'
                                className='h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 bg-white shadow-sm border border-slate-200 transition-opacity absolute left-1 top-1 z-10'
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDodModalDeliverable(deliverable)
                                  setDodModalText(deliverable.dod || '')
                                  setDodModalOpen(true)
                                }}
                              >
                                <Pencil className='w-3 h-3 text-slate-400 hover:text-slate-600' />
                              </Button>
                            </div>
                          </td>
                          <td className='p-1.5 align-middle w-[110px]'>
                            <Select
                              value={deliverable.status}
                              onValueChange={v => handleUpdateDeliverable(deliverable.id, 'status', v)}
                            >
                              <SelectTrigger
                                className={`h-7 border-transparent shadow-none px-2 text-[11px] ${getStatusBadgeColor(deliverable.status)}`}
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
                          </td>
                          <td className='p-1.5 align-middle w-[70px]'>
                            <div className='flex items-center justify-center text-slate-600 font-mono text-xs'>
                              <InlineEdit
                                value={deliverable.estimation_days ? deliverable.estimation_days.toString() : ''}
                                onSave={v =>
                                  handleUpdateDeliverable(deliverable.id, 'estimation_days', v ? parseFloat(v) : null)
                                }
                                className='w-8 text-center'
                              />
                              <span className='ml-0.5 text-slate-400'>d</span>
                            </div>
                          </td>
                          <td className='p-1.5 align-middle w-[80px]'>
                            <Select
                              value={deliverable.lighthouse_month ? deliverable.lighthouse_month.substring(0, 10) : 'none'}
                              onValueChange={v =>
                                handleUpdateDeliverable(deliverable.id, 'lighthouse_month', v === 'none' ? null : v)
                              }
                            >
                              <SelectTrigger className='h-7 w-[68px] border-transparent hover:border-slate-200 bg-transparent shadow-none px-1 text-[11px] tracking-tight font-medium'>
                                <SelectValue placeholder='-' />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value='none'>-</SelectItem>
                                {monthOptions.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className='p-2 align-middle text-left w-[40px]'></td>
                        </tr>
                      )
                    }

                    if (addingSubTaskTo === epic.id) {
                      rows.push(
                        <tr key={`add-${epic.id}`} className='bg-blue-50/50 border-b border-slate-100 last:border-0'>
                          {renderNewDeliverableCells(true)}
                        </tr>
                      )
                    }

                    return rows
                  })}
                </tbody>
              ))
            )}
            {isCreatingInline && (
              <tbody>
                <tr className='bg-blue-50/50 border-t-2 border-slate-200'>
                  {renderNewEpicCell()}
                  {renderNewDeliverableCells(false)}
                </tr>
              </tbody>
            )}
          </table>
        </div>

        {!isCreatingInline && (
          <div
            className='px-4 py-3 bg-white border-t border-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-50 cursor-pointer flex items-center gap-2 text-sm transition-colors'
            onClick={() => setIsCreatingInline(true)}
          >
            <div className='border border-slate-200 rounded text-slate-400 bg-white shadow-sm p-0.5'>
              <Plus className='w-3 h-3' />
            </div>{' '}
            הוספת אפיק
          </div>
        )}
      </div>

      <Dialog open={dodModalOpen} onOpenChange={setDodModalOpen}>
        <DialogContent className='sm:max-w-[600px]'>
          <DialogHeader>
            <DialogTitle className='text-lg font-bold'>
              DoD - {dodModalDeliverable?.title}
            </DialogTitle>
          </DialogHeader>
          <div className='py-4'>
            <textarea
              className='flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 min-h-[280px] resize-y whitespace-pre-wrap leading-relaxed'
              placeholder='הזן פירוט מדדי סיום במלואם...'
              value={dodModalText}
              onChange={e => setDodModalText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDodModalOpen(false)}>
              ביטול
            </Button>
            <Button
              onClick={() => {
                handleUpdateDeliverable(dodModalDeliverable.id, 'dod', dodModalText)
                setDodModalOpen(false)
              }}
            >
              שמירה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
