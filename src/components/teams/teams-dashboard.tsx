'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { i18n } from '@/lib/i18n'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus, Users, UserCog, Edit, History, AlertCircle, Trash2 } from 'lucide-react'
import { InlineEdit } from '@/components/ui/inline-edit'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { PersonEditModal } from './person-edit-modal'
import { PendingRequestsModal } from './pending-requests-modal'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

export function TeamsDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  const [showHistorical, setShowHistorical] = useState(searchParams.get('historical') === 'true')
  const [selectedTeam, setSelectedTeam] = useState<string>(searchParams.get('team') || 'all')
  const [editingPerson, setEditingPerson] = useState<any | null>(null)
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false)
  const [isAddTeamModalOpen, setIsAddTeamModalOpen] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [teamToDelete, setTeamToDelete] = useState<any | null>(null)
  const [personToDelete, setPersonToDelete] = useState<any | null>(null)
  const [deletePersonError, setDeletePersonError] = useState<string | null>(null)

  const { data: teams, isLoading: loadingTeams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await fetch('/api/v1/teams')
      return res.json()
    }
  })

  // Only Admins will get data back from this endpoint due to RLS
  const { data: pendingRequests } = useQuery({
    queryKey: ['pending_requests'],
    queryFn: async () => {
      const res = await fetch('/api/v1/join-requests')
      return res.json()
    }
  })

  // Sync state to URL and localStorage
  useEffect(() => {
    const params = new URLSearchParams()
    if (showHistorical) params.set('historical', 'true')
    if (selectedTeam !== 'all') params.set('team', selectedTeam)

    const newUrl = `?${params.toString()}`
    router.replace(newUrl, { scroll: false })
    localStorage.setItem('admiral_teams_state', newUrl)
  }, [showHistorical, selectedTeam, router])

  const { data: people, isLoading: loadingPeople } = useQuery({
    queryKey: ['people', showHistorical],
    queryFn: async () => {
      const activeParam = showHistorical ? '?active=none' : ''
      const res = await fetch(`/api/v1/people${activeParam}`)
      return res.json()
    }
  })

  const createTeam = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/v1/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })
      if (!res.ok) throw new Error('Failed to create team')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      setIsAddTeamModalOpen(false)
      setNewTeamName('')
    }
  })

  const updateTeam = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const res = await fetch('/api/v1/teams/patch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates })
      })
      if (!res.ok) throw new Error('Failed to update team')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] })
  })

  const deleteTeam = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/teams?id=${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Failed to delete team')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] })
  })

  const createPerson = useMutation({
    mutationFn: async (personData: any) => {
      const res = await fetch('/api/v1/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(personData)
      })
      if (!res.ok) throw new Error('Failed to create person')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['people'] })
  })

  const updatePerson = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const res = await fetch('/api/v1/people/patch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates })
      })
      if (!res.ok) throw new Error('Failed to update person')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['people'] })
  })

  const deletePerson = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/people?id=${id}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete person')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] })
      setPersonToDelete(null)
      setDeletePersonError(null)
    },
    onError: (err: any) => {
      if (err.message === 'has_references') {
        setDeletePersonError('has_references')
      } else {
        setDeletePersonError(err.message)
      }
    }
  })

  // We don't filter people array here anymore since the API does it.
  const filteredPeople = people || []

  let peopleByTeam: any[] = []

  if (showHistorical) {
    peopleByTeam = [
      {
        id: 'historical',
        name: 'כל היסטוריית המשתמשים',
        members: filteredPeople,
        capacityCount: 0,
        isHistoricalWrapper: true
      }
    ]
  } else {
    peopleByTeam = (teams || []).map((team: any) => {
      const members = filteredPeople
        .filter((p: any) => p.team_id === team.id)
        .sort((a: any, b: any) => {
          const roleWeight: Record<string, number> = { manager: 1, product: 2, eng: 3, other: 4 }
          const wA = roleWeight[a.role || 'other'] || 5
          const wB = roleWeight[b.role || 'other'] || 5
          if (wA !== wB) return wA - wB
          return (a.name || '').localeCompare(b.name || '', 'he')
        })
      const capacityCount = members.filter((m: any) => m.counts_toward_capacity).length
      return { ...team, members, capacityCount }
    })

    const unassignedMembers = filteredPeople
      .filter((p: any) => !p.team_id)
      .sort((a: any, b: any) => {
        const roleWeight: Record<string, number> = { manager: 1, product: 2, eng: 3, other: 4 }
        const wA = roleWeight[a.role || 'other'] || 5
        const wB = roleWeight[b.role || 'other'] || 5
        if (wA !== wB) return wA - wB
        return (a.name || '').localeCompare(b.name || '', 'he')
      })

    if (unassignedMembers.length > 0) {
      peopleByTeam.unshift({
        id: 'unassigned',
        name: '[מדורי]',
        members: unassignedMembers,
        capacityCount: unassignedMembers.filter((m: any) => m.counts_toward_capacity).length,
        isUnassigned: true
      })
    }

    if (selectedTeam !== 'all') {
      peopleByTeam = peopleByTeam.filter((t: any) => t.id === selectedTeam)
    }
  }

  const roleColors: Record<string, string> = {
    eng: 'bg-blue-100/50 text-blue-800 border-[0.5px] border-blue-200',
    product: 'bg-purple-100/50 text-purple-800 border-[0.5px] border-purple-200',
    manager: 'bg-emerald-100/50 text-emerald-800 border-[0.5px] border-emerald-200',
    other: 'bg-slate-100/50 text-slate-800 border-[0.5px] border-slate-200'
  }

  const roleLabels: Record<string, string> = {
    eng: 'מפתח/ת',
    product: 'מוצר',
    manager: 'מנהל/ת',
    other: 'אחר'
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    // Handle Supabase DATE string format YYYY-MM-DD
    return new Date(dateString).toLocaleDateString('he-IL')
  }

  return (
    <div className='space-y-8 pb-12'>
      <div className='flex items-center justify-between border-b pb-4'>
        <div className='flex items-center gap-6'>
          <h1 className='text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2'>
            <Users className='w-6 h-6 text-primary' />
            {i18n.nav.teams}
          </h1>

          <div className='flex items-center gap-4'>
            <div className='flex items-center space-x-2 space-x-reverse bg-slate-100/50 p-1 rounded-md border border-slate-200'>
              <Button
                variant={!showHistorical ? 'secondary' : 'ghost'}
                size='sm'
                onClick={() => setShowHistorical(false)}
                className={!showHistorical ? 'bg-white shadow-sm font-medium' : 'text-slate-500'}
              >
                פעילים בלבד
              </Button>
              <Button
                variant={showHistorical ? 'secondary' : 'ghost'}
                size='sm'
                onClick={() => setShowHistorical(true)}
                className={
                  showHistorical
                    ? 'bg-white shadow-sm font-medium flex items-center gap-1'
                    : 'text-slate-500 flex items-center gap-1'
                }
              >
                <History className='w-3.5 h-3.5' /> מידע היסטורי
              </Button>
            </div>

            {!showHistorical && (
              <div className='flex items-center gap-2'>
                <span className='text-sm text-slate-500 font-medium'>סינון:</span>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger className='w-[180px] bg-white h-9 shadow-sm'>
                    <SelectValue placeholder='כל הצוותים' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>כל הצוותים</SelectItem>
                    {(filteredPeople || []).filter((p: any) => !p.team_id).length > 0 && (
                      <SelectItem value='unassigned'>{'[מדורי]'}</SelectItem>
                    )}
                    {teams?.map((team: any) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <div className='flex items-center gap-4'>
          {!showHistorical && (
            <div className='flex items-center gap-2'>
              <Button onClick={() => setIsAddTeamModalOpen(true)} className='shadow-sm'>
                <Plus className='w-4 h-4 ml-2' />
                צוות חדש
              </Button>
              <Button onClick={() => setEditingPerson({ isNew: true })} className='shadow-sm'>
                <Plus className='w-4 h-4 ml-2' />
                אדם חדש
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className='border bg-white shadow-sm rounded-md overflow-hidden'>
        {pendingRequests && pendingRequests.length > 0 && !showHistorical && (
          <div className='bg-amber-50 border-b border-amber-200 p-4 px-6 flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-amber-100 rounded-full text-amber-600'>
                <AlertCircle className='w-5 h-5' />
              </div>
              <div>
                <div className='font-bold text-amber-900'>בקשות הצטרפות ממתינות</div>
                <div className='text-sm text-amber-700 font-medium'>
                  ישנן {pendingRequests.length} בקשות הצטרפות שממתינות לאישור הנהלה.
                </div>
              </div>
            </div>
            <Button
              onClick={() => setIsPendingModalOpen(true)}
              className='bg-amber-600 hover:bg-amber-700 text-white border-transparent'
            >
              נהל בקשות
            </Button>
          </div>
        )}

        {/* Table Header: Name, Role, Capacity, Join, Leave, Actions */}
        <div className='grid grid-cols-[minmax(180px,1fr)_120px_80px_100px_100px_60px] gap-4 p-3 bg-slate-50 border-b font-semibold text-slate-600 text-sm pl-4 pr-6'>
          <div>שם</div>
          <div>תפקיד</div>
          <div className='text-center' title='נספר בחישוב קיבולת למחזור?'>
            קיבולת?
          </div>
          <div className='text-center'>תאריך הצטרפות</div>
          <div className='text-center'>תאריך עזיבה</div>
          <div className='text-center'>פעולות</div>
        </div>

        <div className='divide-y divide-slate-200'>
          {peopleByTeam.length === 0 ? (
            <div className='p-8 text-center text-slate-500 italic'>אין צוותים או אנשים מתאימים לפילטרים.</div>
          ) : (
            peopleByTeam.map((team: any) => (
              <div key={team.id} className='group/team'>
                {/* Group Header */}
                {!showHistorical && (
                  <div className='bg-slate-100/50 p-3 px-4 flex items-center justify-between border-b'>
                    <div className='flex items-center gap-3'>
                      <div
                        className={`p-1.5 rounded ${showHistorical ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary'}`}
                      >
                        {team.isUnassigned ? <UserCog className='w-4 h-4' /> : <Users className='w-4 h-4' />}
                      </div>
                      {team.isUnassigned ? (
                        <span className='font-bold text-slate-700'>{team.name}</span>
                      ) : (
                        <InlineEdit
                          value={team.name}
                          onSave={val => updateTeam.mutate({ id: team.id, updates: { name: val } })}
                          className='font-bold text-slate-900 text-base h-7'
                        />
                      )}
                      <span className='ml-4 text-xs font-medium text-slate-500 px-2 py-0.5 rounded-full shadow-sm border bg-white'>
                        סה&quot;כ: {team.members.length}{' '}
                        {team.members.length > 0 && !showHistorical && `| קיבולת: ${team.capacityCount}`}
                      </span>
                    </div>

                    {!showHistorical && !team.isUnassigned && (
                      <Button
                        variant='ghost'
                        size='sm'
                        className='h-7 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 -my-1'
                        onClick={() => setTeamToDelete(team)}
                        disabled={deleteTeam.isPending}
                      >
                        מחק צוות
                        <Trash2 className='w-3.5 h-3.5 mr-1.5' />
                      </Button>
                    )}
                  </div>
                )}

                {/* Group Rows */}
                <div className='divide-y divide-slate-100'>
                  {team.members.length === 0 ? (
                    <div className='p-4 text-center text-sm text-slate-400 italic bg-white'>
                      אין אנשים משויכים עדיין.
                    </div>
                  ) : (
                    team.members.map((person: any) => {
                      const now = new Date()
                      now.setHours(0, 0, 0, 0)
                      let isFuture = false
                      let hasLeft = false

                      if (person.join_date) {
                        const joinDate = new Date(person.join_date)
                        joinDate.setHours(0, 0, 0, 0)
                        if (joinDate > now) isFuture = true
                      }

                      if (person.leave_date) {
                        const leaveDate = new Date(person.leave_date)
                        leaveDate.setHours(0, 0, 0, 0)
                        if (leaveDate < now) hasLeft = true
                      }

                      return (
                        <div
                          key={person.id}
                          className={`grid grid-cols-[minmax(180px,1fr)_120px_80px_100px_100px_60px] gap-4 p-2 px-6 items-center hover:bg-slate-50 transition-colors text-sm ${showHistorical ? 'bg-amber-50/10' : 'bg-white'}`}
                        >
                          {/* Name - not editable inline */}
                          <div className='font-medium text-slate-900 pr-2 flex items-center gap-2'>
                            {person.name}
                            {hasLeft && (
                              <span className='text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold'>
                                עזב/ה
                              </span>
                            )}
                            {isFuture && (
                              <span className='text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold'>
                                עתידי
                              </span>
                            )}
                          </div>

                          {/* Role - not editable inline */}
                          <div>
                            <div
                              className={`text-xs px-2.5 py-1 rounded-full text-center font-medium ${roleColors[person.role || 'other']}`}
                            >
                              {roleLabels[person.role || 'other']}
                            </div>
                          </div>

                          {/* Capacity - Editable Inline */}
                          <div className='flex justify-center'>
                            <Checkbox
                              checked={person.counts_toward_capacity}
                              onCheckedChange={(checked: boolean | 'indeterminate') =>
                                updatePerson.mutate({
                                  id: person.id,
                                  updates: { counts_toward_capacity: checked === true }
                                })
                              }
                              disabled={showHistorical}
                            />
                          </div>

                          {/* Join Date - View Only */}
                          <div className='text-center text-slate-600 text-xs'>{formatDate(person.join_date)}</div>

                          {/* Leave Date - View Only */}
                          <div className='text-center text-slate-600 text-xs'>{formatDate(person.leave_date)}</div>

                          {/* Actions */}
                          <div className='flex justify-center gap-2'>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='w-7 h-7 text-slate-400 hover:text-red-600 hover:bg-slate-200'
                              onClick={() => {
                                setPersonToDelete(person)
                                setDeletePersonError(null)
                              }}
                            >
                              <Trash2 className='w-4 h-4' />
                            </Button>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='w-7 h-7 text-slate-400 hover:text-slate-900 hover:bg-slate-200'
                              onClick={() => setEditingPerson(person)}
                            >
                              <Edit className='w-4 h-4' />
                            </Button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <PersonEditModal
        person={editingPerson}
        isOpen={!!editingPerson}
        onClose={() => setEditingPerson(null)}
        onSave={(id: string, updates: any) => updatePerson.mutate({ id, updates })}
        teams={teams || []}
        onCreate={(updates: any) => createPerson.mutate(updates)}
      />

      <Dialog open={isAddTeamModalOpen} onOpenChange={open => !open && setIsAddTeamModalOpen(false)}>
        <DialogContent className='sm:max-w-[425px]' dir='rtl'>
          <DialogHeader>
            <DialogTitle>הוסף צוות חדש</DialogTitle>
          </DialogHeader>
          <div className='py-4 space-y-4'>
            <div className='space-y-2'>
              <Label>שם הצוות</Label>
              <Input
                value={newTeamName}
                onChange={e => setNewTeamName(e.target.value)}
                placeholder='לדוגמה: צוות פיתוח CORE'
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter' && newTeamName.trim() && !createTeam.isPending) {
                    createTeam.mutate(newTeamName)
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsAddTeamModalOpen(false)} disabled={createTeam.isPending}>
              ביטול
            </Button>
            <Button
              onClick={() => createTeam.mutate(newTeamName)}
              disabled={!newTeamName.trim() || createTeam.isPending}
            >
              הוסף צוות
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!teamToDelete} onOpenChange={open => !open && setTeamToDelete(null)}>
        <DialogContent className='sm:max-w-[425px]' dir='rtl'>
          <DialogHeader>
            <DialogTitle>מחיקת צוות</DialogTitle>
          </DialogHeader>
          <div className='py-4'>
            {teamToDelete?.members?.length > 0 ? (
              <p className='text-slate-600'>
                לא ניתן למחוק את הצוות &quot;{teamToDelete.name}&quot; מכיוון שיש בו חברי מחלקה משויכים. כדי למחוק את
                הצוות, יש להעביר קודם את חברי הצוות לצוות אחר או להסיר אותם.
              </p>
            ) : (
              <p className='text-slate-600'>
                האם אתה בטוח שברצונך למחוק את הצוות &quot;{teamToDelete?.name}&quot;? פעולה זו אינה הפיכה.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setTeamToDelete(null)} disabled={deleteTeam.isPending}>
              ביטול
            </Button>
            {teamToDelete?.members?.length === 0 && (
              <Button
                variant='destructive'
                onClick={() => {
                  deleteTeam.mutate(teamToDelete.id)
                  setTeamToDelete(null)
                }}
                disabled={deleteTeam.isPending}
              >
                מחק צוות
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!personToDelete}
        onOpenChange={open => {
          if (!open) {
            setPersonToDelete(null)
            setDeletePersonError(null)
          }
        }}
      >
        <DialogContent className='sm:max-w-[425px]' dir='rtl'>
          <DialogHeader>
            <DialogTitle>מחיקת משתמש</DialogTitle>
          </DialogHeader>
          <div className='py-4'>
            {deletePersonError === 'has_references' ? (
              <p className='text-slate-600'>
                לא ניתן למחוק את {personToDelete?.name} מכיוון שיש להם יעדים, משימות או מידע היסטורי המשויך אליהם
                במערכת.
                <br />
                <br />
                מומלץ במקום זאת לערוך את המשתמש ולסמן אותו כ<b>לא פעיל</b> ולהגדיר תאריך עזיבה.
              </p>
            ) : deletePersonError ? (
              <p className='text-red-500'>{deletePersonError}</p>
            ) : (
              <p className='text-slate-600'>
                האם אתה בטוח שברצונך למחוק את {personToDelete?.name}? פעולה זו אינה הפיכה, ויש להשתמש בה רק במקרה של
                יצירה בשוגג. במקרה של עזיבה, מומלץ במקום למחוק פשוט לסמן כ<b>&quot;לא פעיל&quot;</b> ולהוסיף תאריך עזיבה
                - זאת כדי לשמר היסטוריית יעדים ומשימות.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setPersonToDelete(null)
                setDeletePersonError(null)
              }}
            >
              ביטול
            </Button>
            {deletePersonError === 'has_references' && (
              <Button
                onClick={() => {
                  const person = personToDelete
                  setPersonToDelete(null)
                  setDeletePersonError(null)
                  setEditingPerson(person)
                }}
              >
                למסך עריכה
              </Button>
            )}
            {!deletePersonError && (
              <Button
                variant='destructive'
                onClick={() => deletePerson.mutate(personToDelete.id)}
                disabled={deletePerson.isPending}
              >
                {deletePerson.isPending ? 'מוחק...' : 'מחק לתמיד'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {pendingRequests && teams && (
        <PendingRequestsModal
          isOpen={isPendingModalOpen}
          onClose={() => setIsPendingModalOpen(false)}
          requests={pendingRequests}
          teams={teams}
          people={filteredPeople}
        />
      )}
    </div>
  )
}
