import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

export function PersonEditModal({
  person,
  isOpen,
  onClose,
  onSave,
  onCreate,
  teams
}: {
  person: any | null
  isOpen: boolean
  onClose: () => void
  onSave: (id: string, updates: any) => void
  onCreate: (updates: any) => void
  teams: any[]
}) {
  const [formData, setFormData] = useState<any>({})

  useEffect(() => {
    if (person) {
      if (person.isNew) {
        setFormData({
          name: '',
          role: 'eng',
          permission: 'member',
          team_id: null,
          counts_toward_capacity: true,
          active: true,
          join_date: new Date().toISOString().split('T')[0],
          leave_date: null
        })
      } else {
        setFormData({
          name: person.name || '',
          role: person.role || 'other',
          permission: person.permission || 'viewer',
          team_id: person.team_id || null,
          counts_toward_capacity: person.counts_toward_capacity ?? true,
          active: person.active ?? true,
          join_date: person.join_date || null,
          leave_date: person.leave_date || null
        })
      }
    }
  }, [person])

  if (!person) return null

  const isNew = person.isNew

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isNew) {
      onCreate(formData)
    } else {
      onSave(person.id, formData)
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className='sm:max-w-[425px]' dir='rtl'>
        <DialogHeader>
          <DialogTitle>{isNew ? 'הוסף אדם חדש' : 'ערוך פרטי אדם'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='space-y-4 pt-4'>
          <div className='grid grid-cols-4 items-center gap-4'>
            <Label className='text-right'>שם</Label>
            <Input
              className='col-span-3'
              value={formData.name || ''}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className='grid grid-cols-4 items-center gap-4'>
            <Label className='text-right'>תפקיד</Label>
            <Select value={formData.role} onValueChange={val => setFormData({ ...formData, role: val })}>
              <SelectTrigger className='col-span-3'>
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

          <div className='grid grid-cols-4 items-center gap-4'>
            <Label className='text-right'>הרשאה</Label>
            <Select value={formData.permission} onValueChange={val => setFormData({ ...formData, permission: val })}>
              <SelectTrigger className='col-span-3'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='admin'>Admin</SelectItem>
                <SelectItem value='member'>Member</SelectItem>
                <SelectItem value='viewer'>Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='grid grid-cols-4 items-center gap-4'>
            <Label className='text-right'>צוות</Label>
            <Select
              value={formData.team_id || 'none'}
              onValueChange={val => setFormData({ ...formData, team_id: val === 'none' ? null : val })}
            >
              <SelectTrigger className='col-span-3'>
                <div className='w-full text-right'>
                  <SelectValue placeholder='ללא קבוצה' />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='none'>{'[מדורי]'}</SelectItem>
                {teams.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='grid grid-cols-4 items-center gap-4'>
            <Label className='text-right'>תאריך הצטרפות</Label>
            <Input
              type='date'
              className='col-span-3 justify-between flex-row-reverse'
              lang='he-IL'
              value={formData.join_date || ''}
              onChange={e => setFormData({ ...formData, join_date: e.target.value || null })}
            />
          </div>

          <div className='grid grid-cols-4 items-center gap-4'>
            <Label className='text-right'>תאריך עזיבה</Label>
            <Input
              type='date'
              lang='he-IL'
              className='col-span-3 justify-between flex-row-reverse'
              value={formData.leave_date || ''}
              onChange={e => setFormData({ ...formData, leave_date: e.target.value || null })}
            />
          </div>

          <div className='flex items-center gap-2 mt-2'>
            <Checkbox
              id='counts_cap'
              checked={formData.counts_toward_capacity}
              onCheckedChange={checked => setFormData({ ...formData, counts_toward_capacity: checked === true })}
            />
            <Label htmlFor='counts_cap'>נספר בחישוב ל-capacity</Label>
          </div>

          <div className='flex items-center gap-2 mt-2'>
            <Checkbox
              id='is_active'
              checked={formData.active}
              onCheckedChange={checked => setFormData({ ...formData, active: checked === true })}
            />
            <Label htmlFor='is_active'>פעיל (משתמש היסטורי אם כבוי)</Label>
          </div>

          <DialogFooter className='mt-6 gap-2'>
            <Button type='button' variant='outline' onClick={onClose}>
              ביטול
            </Button>
            <Button type='submit'>{isNew ? 'הוסף' : 'שמור'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
