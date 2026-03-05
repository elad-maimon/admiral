"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function TaskCreateModal({
  isOpen,
  onClose,
  onSave,
  initiatives,
  epics,
  people,
  defaultEpicId
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: any) => void;
  initiatives: any[];
  epics: any[];
  people: any[];
  defaultEpicId?: string;
}) {
  const [formData, setFormData] = useState({
    title: '',
    epicChoice: 'new',
    newEpicTitle: '',
    initiative_id: '',
    owner_id: '',
    estimation_days: ''
  });

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({ ...prev, epicChoice: defaultEpicId || 'new' }));
    }
  }, [isOpen, defaultEpicId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.epicChoice === 'new') {
      onSave({
        type: 'new_epic',
        epic: {
          title: formData.newEpicTitle || formData.title,
          initiative_id: formData.initiative_id,
          planning_status: 'active'
        },
        deliverable: {
          title: formData.title,
          owner_id: formData.owner_id ? formData.owner_id : undefined,
          estimation_days: formData.estimation_days ? parseFloat(formData.estimation_days) : undefined,
          status: 'backlog'
        }
      });
    } else {
      onSave({
        type: 'existing_epic',
        deliverable: {
          epic_id: formData.epicChoice,
          title: formData.title,
          owner_id: formData.owner_id ? formData.owner_id : undefined,
          estimation_days: formData.estimation_days ? parseFloat(formData.estimation_days) : undefined,
          status: 'backlog'
        }
      });
    }

    onClose();
    setTimeout(() => {
      setFormData({
        title: '', epicChoice: 'new', newEpicTitle: '', initiative_id: '', owner_id: '', estimation_days: ''
      });
    }, 200);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>משימה / תוצר חדש</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>שם המשימה/תוצר <span className="text-red-500">*</span></Label>
            <Input
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              required
              placeholder="לדוגמה: עיצוב מסך התחברות"
            />
          </div>

          <div className="space-y-2 pt-4 border-t">
            <Label>שיוך לפרויקט / תגית אפיק <span className="text-red-500">*</span></Label>
            <Select
              value={formData.epicChoice}
              onValueChange={val => setFormData({...formData, epicChoice: val})}
              required
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new" className="font-bold text-primary">-- יצירת פרויקט / אפיק חדש --</SelectItem>
                {epics.map(e => <SelectItem key={e.id} value={e.id}>{e.title} {e.initiative?.title ? `(${e.initiative.title})` : ''}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {formData.epicChoice === 'new' && (
            <div className="space-y-4 bg-slate-50 p-4 rounded-md border mt-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">שם הפרויקט/אפיק (אופציונלי - יועתק מהמשימה אם ריק)</Label>
                <Input
                  value={formData.newEpicTitle}
                  onChange={e => setFormData({...formData, newEpicTitle: e.target.value})}
                  placeholder={formData.title || "שם התגית לפרויקט"}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">יוזמה (Initiative) <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.initiative_id}
                  onValueChange={val => setFormData({...formData, initiative_id: val})}
                  required={formData.epicChoice === 'new'}
                >
                  <SelectTrigger className="bg-white"><SelectValue placeholder="בחר יוזמה" /></SelectTrigger>
                  <SelectContent>
                    {initiatives.map(i => <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-4 border-t mt-4">
            <div className="space-y-2">
              <Label>אחראי</Label>
              <Select
                value={formData.owner_id || 'none'}
                onValueChange={val => setFormData({...formData, owner_id: val === 'none' ? '' : val})}
              >
                <SelectTrigger><SelectValue placeholder="ללא אחראי" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ללא אחראי</SelectItem>
                  {people.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>הערכת ימים (אופציונלי)</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={formData.estimation_days}
                onChange={e => setFormData({...formData, estimation_days: e.target.value})}
                placeholder="למשל: 3"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>ביטול</Button>
            <Button type="submit">שמור</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
