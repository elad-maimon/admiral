'use client'

import { useState } from 'react'
import { declineJoinRequest, approveJoinRequest } from '@/app/api/v1/join-requests/actions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, UserCheck, XCircle, Clock } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'

interface PendingRequestsModalProps {
  isOpen: boolean
  onClose: () => void
  requests: any[]
  teams: any[]
  people: any[]
}

export function PendingRequestsModal({ isOpen, onClose, requests, teams, people }: PendingRequestsModalProps) {
  const [approvingReq, setApprovingReq] = useState<any | null>(null)

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className='max-w-3xl' dir='rtl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-xl'>
            <AlertCircle className='w-5 h-5 text-amber-500' />
            בקשות הצטרפות ממתינות ({requests.length})
          </DialogTitle>
        </DialogHeader>

        {approvingReq ? (
          <ApproveForm
            request={approvingReq}
            teams={teams}
            people={people}
            requestsLength={requests.length}
            onBack={() => setApprovingReq(null)}
            onDone={() => {
              setApprovingReq(null)
              if (requests.length <= 1) onClose()
            }}
          />
        ) : (
          <div className='divide-y border rounded-md mt-4'>
            {requests.length === 0 && <div className='p-8 text-center text-slate-500'>אין בקשות ממתינות.</div>}
            {requests.map(req => (
              <RequestRow
                key={req.id}
                req={req}
                requestsLength={requests.length}
                onApprove={() => setApprovingReq(req)}
                onCloseModal={onClose}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function RequestRow({
  req,
  requestsLength,
  onApprove,
  onCloseModal
}: {
  req: any
  requestsLength: number
  onApprove: () => void
  onCloseModal: () => void
}) {
  const [isDeclining, setIsDeclining] = useState(false)
  const queryClient = useQueryClient()

  const handleDecline = async () => {
    if (!confirm('האם לדחות את בקשת ההצטרפות?')) return
    setIsDeclining(true)
    try {
      await declineJoinRequest(req.id)
      queryClient.invalidateQueries({ queryKey: ['pending_requests'] })
      if (requestsLength <= 1) onCloseModal()
    } catch (e: any) {
      alert(e.message)
      setIsDeclining(false)
    }
  }

  return (
    <div className='p-4 flex items-center justify-between hover:bg-slate-50 transition-colors'>
      <div className='flex items-center gap-4'>
        <div className='w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500'>
          <Clock className='w-5 h-5' />
        </div>
        <div>
          <div className='font-bold text-slate-900'>{req.name || 'ללא שם גיבוי'}</div>
          <div className='text-sm text-slate-500' dir='ltr'>
            {req.email}
          </div>
          <div className='text-xs text-slate-400 mt-0.5'>
            הוגש בתאריך: {format(new Date(req.created_at), 'dd/MM/yyyy HH:mm')}
          </div>
        </div>
      </div>
      <div className='flex items-center gap-2'>
        <Button
          variant='destructive'
          size='sm'
          onClick={handleDecline}
          disabled={isDeclining}
          className='bg-red-50 text-red-600 hover:bg-red-100 border-red-200'
        >
          <XCircle className='w-4 h-4 ml-1.5' /> דחה
        </Button>
        <Button
          variant='default'
          size='sm'
          onClick={onApprove}
          className='bg-emerald-600 hover:bg-emerald-700 text-white'
        >
          <UserCheck className='w-4 h-4 ml-1.5' /> אשר והגדר
        </Button>
      </div>
    </div>
  )
}

function ApproveForm({
  request,
  teams,
  people,
  requestsLength,
  onBack,
  onDone
}: {
  request: any
  teams: any[]
  people: any[]
  requestsLength: number
  onBack: () => void
  onDone: () => void
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const queryClient = useQueryClient()
  const unlinkedPeople = (people || []).filter(p => !p.email)

  const [formData, setFormData] = useState({
    name: request.name || '',
    email: request.email || '',
    role: 'eng',
    permission: 'member',
    team_id: 'unassigned',
    existing_person_id: 'none'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await approveJoinRequest(request.id, {
        auth_user_id: request.auth_user_id,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        permission: formData.permission,
        team_id: formData.team_id === 'unassigned' ? null : formData.team_id,
        existing_person_id: formData.existing_person_id === 'none' ? undefined : formData.existing_person_id
      })
      queryClient.invalidateQueries({ queryKey: ['pending_requests'] })
      queryClient.invalidateQueries({ queryKey: ['people'] })
      onDone()
    } catch (err: any) {
      alert(err.message)
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className='mt-4 bg-slate-50 p-6 rounded-lg border border-slate-100 space-y-4 text-sm'>
      <div className='font-semibold text-slate-800 border-b pb-2 mb-4'>
        הגדרת פרופיל משתמש עבור דוא״ל: {request.email}
      </div>

      <div className='space-y-4 mb-4 p-4 border rounded bg-white'>
        <Label>שיוך לפרופיל קיים (אופציונלי)</Label>
        <Select
          value={formData.existing_person_id}
          onValueChange={v => setFormData({ ...formData, existing_person_id: v })}
        >
          <SelectTrigger className='bg-slate-50'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='none'>-- צור פרופיל חדש במערכת --</SelectItem>
            {unlinkedPeople.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} (ללא דוא״ל משויך)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className='text-xs text-slate-500'>ניתן לבחור פרופיל שיצרת מראש ללא דוא״ל, ולקשור אותו למשתמש גוגל זה.</p>
      </div>

      {formData.existing_person_id === 'none' && (
        <>
          <Label>יצירת פרופיל חדש</Label>

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label>שם מלא</Label>
              <Input
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className='bg-white'
              />
            </div>

            <div className={'space-y-2'}>
              <Label>תפקיד</Label>
              <Select value={formData.role} onValueChange={v => setFormData({ ...formData, role: v })}>
                <SelectTrigger className='bg-white'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='eng'>מפתח/ת</SelectItem>
                  <SelectItem value='product'>מוצר</SelectItem>
                  <SelectItem value='manager'>מנהל/ת</SelectItem>
                  <SelectItem value='other'>אחר</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label>הרשאת מערכת</Label>
              <Select value={formData.permission} onValueChange={v => setFormData({ ...formData, permission: v })}>
                <SelectTrigger className='bg-white'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='viewer'>צופה</SelectItem>
                  <SelectItem value='member'>חבר ארגון</SelectItem>
                  <SelectItem value='admin'>מנהל ארגון</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label>שיוך לצוות</Label>
              <Select value={formData.team_id} onValueChange={v => setFormData({ ...formData, team_id: v })}>
                <SelectTrigger className='bg-white'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='unassigned'>{'[מדורי]'}</SelectItem>
                  {teams.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}

      <div className='flex justify-end gap-3 mt-8 pt-4 border-t'>
        <Button type='button' variant='outline' onClick={onBack} disabled={isSubmitting}>
          ביטול
        </Button>
        <Button type='submit' disabled={isSubmitting} className='bg-emerald-600 hover:bg-emerald-700'>
          {isSubmitting
            ? 'שומר...'
            : formData.existing_person_id !== 'none'
              ? 'אשר וקשר לפרופיל'
              : 'אשר וצור משתמש חדש'}
        </Button>
      </div>
    </form>
  )
}
