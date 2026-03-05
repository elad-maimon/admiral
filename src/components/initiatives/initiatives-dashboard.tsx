"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { i18n } from '@/lib/i18n';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { InlineEdit } from "@/components/ui/inline-edit";

export function InitiativesDashboard() {
  const [selectedOwner, setSelectedOwner] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const queryClient = useQueryClient();

  const { data: people, isLoading: loadingPeople } = useQuery({
    queryKey: ['people'],
    queryFn: async () => {
      const res = await fetch('/api/v1/people');
      return res.json();
    }
  });

  const { data: initiatives, isLoading: loadingInitiatives } = useQuery({
    queryKey: ['initiatives', selectedOwner],
    queryFn: async () => {
      const url = new URL('/api/v1/initiatives', window.location.origin);
      if (selectedOwner !== 'all') {
        url.searchParams.set('owner_id', selectedOwner);
      }
      const res = await fetch(url.toString());
      return res.json();
    }
  });

  const createInitiative = useMutation({
    mutationFn: async () => {
      // Default to the first person or current filter if valid
      const defaultOwner = (selectedOwner !== 'all' && selectedOwner)
        ? selectedOwner
        : people?.[0]?.id;

      if (!defaultOwner) return;

      const res = await fetch('/api/v1/initiatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'יוזמה חדשה', owner_id: defaultOwner })
      });
      if (!res.ok) throw new Error('Failed to create initiative');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['initiatives'] });
    }
  });

  const updateInitiative = useMutation({
    mutationFn: async ({ id, updates }: { id: string | number, updates: any }) => {
      const res = await fetch('/api/v1/initiatives/patch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates })
      });
      if (!res.ok) throw new Error('Failed to update initiative');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['initiatives'] });
    }
  });

  if (loadingPeople || loadingInitiatives) {
    return <div className="text-muted-foreground animate-pulse p-4">טוען נתונים...</div>;
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Compute max target date for each initiative for sorting/display
  const preparedInitiatives = (initiatives || []).map((init: any) => {
    const sortedTargetDates = init.epics
      .map((e: any) => e.target_date)
      .filter(Boolean)
      .sort();

    return {
      ...init,
      max_target_date: sortedTargetDates.length > 0 ? sortedTargetDates[sortedTargetDates.length - 1] : null,
      max_target_date_str: sortedTargetDates.length > 0
        ? new Date(sortedTargetDates[sortedTargetDates.length - 1]).toLocaleDateString('he-IL', { month: 'short', day: 'numeric' })
        : 'לא הוגדר'
    };
  });

  const sortedInitiatives = [...preparedInitiatives].sort((a: any, b: any) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (sortField === 'owner_name') {
      aVal = a.owner?.name || '';
      bVal = b.owner?.name || '';
    } else if (sortField === 'max_target_date') {
      aVal = a.max_target_date || '9999-12-31';
      bVal = b.max_target_date || '9999-12-31';
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{i18n.nav.initiatives}</h1>

        <div className="flex items-center gap-4">
          <Select value={selectedOwner} onValueChange={setSelectedOwner}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="כל הבעלים" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הבעלים</SelectItem>
              {people?.filter((p: any) => ['manager', 'product'].includes(p.role) || true).map((person: any) => (
                <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={() => createInitiative.mutate()} disabled={createInitiative.isPending}>
            <Plus className="w-4 h-4 ml-2" />
            {i18n.common.add} יוזמה
          </Button>
        </div>
      </div>

      <div className="border bg-white rounded-md shadow-sm overflow-hidden text-sm">
        <div className="flex items-center gap-4 p-3 bg-slate-50 font-bold border-b text-slate-600">
          <div className="w-6"></div>

          <div
            className="w-12 cursor-pointer hover:text-slate-900 flex items-center gap-1"
            onClick={() => handleSort('id')}
          >
            ID {sortField === 'id' && <ArrowUpDown className="w-3 h-3" />}
          </div>

          <div
            className="flex-1 cursor-pointer hover:text-slate-900 flex items-center gap-1"
            onClick={() => handleSort('title')}
          >
            שם יוזמה {sortField === 'title' && <ArrowUpDown className="w-3 h-3" />}
          </div>

          <div
            className="w-[150px] cursor-pointer hover:text-slate-900 flex items-center gap-1"
            onClick={() => handleSort('owner_name')}
          >
            בעלים {sortField === 'owner_name' && <ArrowUpDown className="w-3 h-3" />}
          </div>

          <div
            className="w-[200px] cursor-pointer hover:text-slate-900 flex items-center gap-1"
            onClick={() => handleSort('progress_est')}
          >
            התקדמות {sortField === 'progress_est' && <ArrowUpDown className="w-3 h-3" />}
          </div>

          <div
            className="w-[120px] cursor-pointer hover:text-slate-900 flex items-center gap-1 text-left"
            onClick={() => handleSort('max_target_date')}
          >
            יעד {sortField === 'max_target_date' && <ArrowUpDown className="w-3 h-3" />}
          </div>
        </div>

        <div className="divide-y">
          {sortedInitiatives.length === 0 ? (
            <div className="p-8 text-center text-slate-500">אין יוזמות להצגה.</div>
          ) : (
            sortedInitiatives.map((init: any) => (
              <InitiativeRow
                key={init.id}
                init={init}
                people={people}
                onUpdate={(updates) => updateInitiative.mutate({ id: init.id, updates })}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function InitiativeRow({ init, people, onUpdate }: { init: any, people: any[], onUpdate: (u: any) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white">
      <div className="flex items-center gap-4 p-3 hover:bg-slate-50 transition-colors group">
        <div
          className="w-6 text-slate-400 cursor-pointer flex justify-center"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>

        <div className="w-12 text-slate-500 font-mono">
          #{init.id}
        </div>

        <div className="flex-1 font-semibold text-slate-900 inline-block">
          <InlineEdit
            value={init.title}
            onSave={(val) => onUpdate({ title: val })}
            className="font-semibold text-sm h-6"
          />
        </div>

        <div className="w-[150px]">
          <Select
            value={init.owner_id}
            onValueChange={(val) => onUpdate({ owner_id: val })}
          >
            <SelectTrigger className="h-7 text-xs border-transparent shadow-none hover:border-slate-300 focus:ring-0 px-2 -ml-2 w-full justify-start gap-2">
              <span className="truncate">{init.owner?.name || 'בחר בעלים...'}</span>
            </SelectTrigger>
            <SelectContent>
              {people?.map((person: any) => (
                <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-[200px] flex items-center gap-3">
          <Progress value={init.progress_est} className="h-2 flex-1" />
          <span className="text-xs font-mono w-[3ch]">{Math.round(init.progress_est)}%</span>
        </div>

        <div className="w-[120px] text-slate-500 text-xs text-left">
          {init.max_target_date_str}
        </div>
      </div>

      {expanded && (
        <div className="bg-slate-50/50 p-3 pl-14 border-t border-slate-100 shadow-inner">
          <div className="text-xs text-slate-400 mb-2">אפיקים זיהוי: {init.epics?.length || 0}</div>
          {/* We will leave epic complex inline rendering for the epic list per spec,
              but it remains viewable in initiatives if desired here. */}
        </div>
      )}
    </div>
  );
}
