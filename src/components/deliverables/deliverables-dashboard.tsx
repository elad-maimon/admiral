"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, ChevronDown, ChevronUp, AlertCircle, Award, LayoutList, Trash2, Edit2, Tag } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from "@/components/ui/badge";
import { InlineEdit } from '@/components/ui/inline-edit';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

export function DeliverablesDashboard() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Load state from URL or defaults
  const [view, setView] = useState<'all' | 'active'>(
    (searchParams.get('view') as 'all' | 'active') || 'active'
  );
  const [groupBy, setGroupBy] = useState<'none' | 'initiative' | 'month'>(
    (searchParams.get('groupBy') as 'none' | 'initiative' | 'month') || 'none'
  );
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(() => {
    const sKey = searchParams.get('sortKey');
    const sDir = searchParams.get('sortDir');
    if (sKey && (sDir === 'asc' || sDir === 'desc')) return { key: sKey, direction: sDir };
    return null;
  });

  // Sync state to URL and localStorage
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('view', view);
    params.set('groupBy', groupBy);
    if (sortConfig) {
      params.set('sortKey', sortConfig.key);
      params.set('sortDir', sortConfig.direction);
    }
    const newUrl = `?${params.toString()}`;
    router.replace(newUrl, { scroll: false });
    localStorage.setItem('admiral_deliverables_state', newUrl);
  }, [view, groupBy, sortConfig, router]);

  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());

  // New inline row state
  const [isCreatingInline, setIsCreatingInline] = useState(false);
  const [newRowData, setNewRowData] = useState({ title: '', epic_id: 'new', new_epic_title: '', owner_id: 'none', estimation: '', status: 'backlog' });
  const [addingSubTaskTo, setAddingSubTaskTo] = useState<string | null>(null);

  const { data: epics, isLoading: loadingEpics } = useQuery({
    queryKey: ['epics'],
    queryFn: async () => {
      const res = await fetch('/api/v1/epics');
      return res.json();
    }
  });

  const { data: people } = useQuery({ queryKey: ['people'], queryFn: async () => (await fetch('/api/v1/people')).json() });
  const { data: initiatives } = useQuery({ queryKey: ['initiatives'], queryFn: async () => (await fetch('/api/v1/initiatives')).json() });

  // By default expand Epics that have > 1 deliverable once data loads
  useEffect(() => {
    if (epics) {
      const defaultExpanded = new Set<string>();
      epics.forEach((epic: any) => {
        if (epic.deliverables && epic.deliverables.length > 1) {
          defaultExpanded.add(epic.id);
        }
      });
      setExpandedEpics(defaultExpanded);
    }
  }, [epics]);

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
        });
        if (!res.ok) throw new Error('Failed');
        return res.json();
      } else {
        const res = await fetch('/api/v1/deliverables', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload.deliverable)
        });
        if (!res.ok) throw new Error('Failed');
        return res.json();
      }
    },
    onSuccess: (data, opts) => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      setIsCreatingInline(false);
      setAddingSubTaskTo(null);
      setNewRowData({ title: '', epic_id: 'new', new_epic_title: '', owner_id: 'none', estimation: '', status: 'backlog', initiative_id: '' } as any);
      if (opts.type === 'existing_epic') {
         setExpandedEpics(prev => new Set(prev).add(opts.deliverable.epic_id));
      }
    }
  });

  const mutEditDeliverable = useMutation({
    mutationFn: async (payload: { id: string, updates: any }) => {
      const res = await fetch('/api/v1/deliverables/patch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['epics'] })
  });

  const mutEditEpic = useMutation({
    mutationFn: async (payload: { id: string, updates: any }) => {
      const res = await fetch('/api/v1/epics/patch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['epics'] })
  });

  const mutDeleteEpic = useMutation({
    mutationFn: async (id: string) => {
       /* Implementation for delete later */
       alert("Delete epic " + id);
    }
  });

  const mutDeleteDeliverable = useMutation({
    mutationFn: async (id: string) => {
       /* Implementation for delete later */
       alert("Delete deliverable " + id);
    }
  });

  const toggleEpic = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(expandedEpics);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedEpics(next);
  };

  const handleUpdateDeliverable = (id: string, field: string, value: any) => {
    mutEditDeliverable.mutate({ id, updates: { [field]: value } });
  };

  const handleUpdateEpic = (id: string, field: string, value: any) => {
    mutEditEpic.mutate({ id, updates: { [field]: value } });
  };

  const handleSaveInlineRow = (epicId?: string) => {
    if (!newRowData.title.trim()) {
      setIsCreatingInline(false);
      setAddingSubTaskTo(null);
      return;
    }

    const payloadTargetEpic = epicId || newRowData.epic_id;

    if (payloadTargetEpic === 'new') {
      if (!(newRowData as any).initiative_id) {
         alert("יש לבחור יוזמה לפני יצירת משימה ראשית");
         return;
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
      });
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
      });
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey) return null;
    return sortConfig.direction === 'asc'
      ? <ChevronUp className="w-4 h-4 text-primary ml-1 inline-block" />
      : <ChevronDown className="w-4 h-4 text-primary ml-1 inline-block" />;
  };

  if (loadingEpics) return <div className="p-4 animate-pulse">טוען נתונים...</div>;

  // Process data for presentation
  let epicRows = epics || [];

  if (view === 'active') {
    epicRows = epicRows.filter((epic: any) => {
      const isEpicActive = epic.planning_status === 'active' || epic.planning_status === 'scoping';
      const isDelivActive = epic.deliverables?.some((d: any) => !['done', 'cancelled'].includes(d.status));
      return isEpicActive || isDelivActive;
    });
  }

  // Sorting
  if (sortConfig) {
    epicRows.sort((a: any, b: any) => {
      let valA, valB;
      const getFirstDeliv = (e: any) => e.deliverables && e.deliverables.length > 0 ? e.deliverables[0] : null;

      if (sortConfig.key === 'epic') {
        valA = a.title || '';
        valB = b.title || '';
      } else if (sortConfig.key === 'title') {
        const dA = getFirstDeliv(a);
        const dB = getFirstDeliv(b);
        valA = dA ? dA.title : a.title;
        valB = dB ? dB.title : b.title;
      } else if (sortConfig.key === 'initiative') {
        valA = a.initiative?.title || '';
        valB = b.initiative?.title || '';
      } else if (sortConfig.key === 'owner') {
        valA = getFirstDeliv(a)?.owner_id || a.owner_id || '';
        valB = getFirstDeliv(b)?.owner_id || b.owner_id || '';
      } else if (sortConfig.key === 'scoped') {
        valA = a.planning_status || '';
        valB = b.planning_status || '';
      } else if (sortConfig.key === 'status') {
        valA = getFirstDeliv(a)?.status || a.execution_status || '';
        valB = getFirstDeliv(b)?.status || b.execution_status || '';
      } else if (sortConfig.key === 'target') {
        valA = getFirstDeliv(a)?.planned_week_start || a.target_date || '9999-12-31';
        valB = getFirstDeliv(b)?.planned_week_start || b.target_date || '9999-12-31';
      }

      const order = sortConfig.direction === 'asc' ? 1 : -1;
      if (valA < valB) return -1 * order;
      if (valA > valB) return 1 * order;
      return 0;
    });
  }

  // Grouping
  let groups: { header: string; rows: any[] }[] = [];
  if (groupBy !== 'none') {
    const groupedMap = new Map<string, any[]>();
    epicRows.forEach((epic: any) => {
      let key = 'ללא קבוצה';
      if (groupBy === 'initiative') {
        key = epic.initiative?.title || 'ללא יוזמה';
      } else if (groupBy === 'month') {
        key = epic.target_date ? new Date(epic.target_date).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' }) : 'ללא חודש יעד';
      }

      if (!groupedMap.has(key)) groupedMap.set(key, []);
      groupedMap.get(key)!.push(epic);
    });

    groups = Array.from(groupedMap.entries()).map(([header, rows]) => ({ header, rows }));
  } else {
    groups = [{ header: 'Flat', rows: epicRows }];
  }

  const statusOptions = ['backlog', 'ideation', 'rfd', 'in_dev', 'blocked', 'done', 'cancelled'];
  const getStatusBadgeColor = (status: string) => {
    switch(status) {
      case 'done': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'in_dev': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'blocked': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getPlanningStatusBadgeColor = (status: string) => {
    switch(status) {
      case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'scoping': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getGridCols = () => {
    const cols = [];
    cols.push('minmax(140px,1.5fr)');  // 1: Epic Name
    cols.push('minmax(200px,2fr)');    // 2: Deliverable Name
    cols.push('minmax(120px,1fr)');    // 3: Initiative (Chip)
    cols.push('140px');                // 4: Owner
    cols.push('80px');                 // 5: Scoped?
    cols.push('100px');                // 6: Status
    cols.push('minmax(120px,1.5fr)');  // 7: DoD
    cols.push('100px');                // 8: LH Month
    cols.push('100px');                // 9: Target
    cols.push('70px');                 // 10: Actions
    return cols.join(' ');
  };

  const rowStyle = { display: 'grid', gridTemplateColumns: getGridCols(), gap: '0.5rem' };

  // Helper for Epic Name icons
  const renderEpicIcons = (epic: any) => (
    <div className="flex gap-1 ml-2">
      {epic.importance === 1 && <div title="Mandatory"><AlertCircle className="w-3.5 h-3.5 text-red-500" /></div>}
      {epic.importance === 2 && <div title="Strategic"><Award className="w-3.5 h-3.5 text-blue-500" /></div>}
    </div>
  );

  const getMonthStr = (dateStr: string) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('he-IL', { month: 'short', year: '2-digit' });
  };

  const renderSingleDeliverableRow = (epic: any, deliverable: any) => (
    <div key={`epic-${epic.id}`} className="p-1 px-4 items-center hover:bg-slate-50 transition-colors text-sm bg-white border-b last:border-0 border-slate-100 group" style={rowStyle}>
      {/* 1: Epic Name */}
      <div className="flex items-center gap-1 font-medium text-slate-800 pr-1 truncate">
        {renderEpicIcons(epic)}
        <InlineEdit
          value={epic.title}
          onSave={(v) => handleUpdateEpic(epic.id, 'title', v)}
          className="w-full truncate"
        />
      </div>

      {/* 2: Deliverable Name */}
      <div className="truncate flex items-center pr-2" title={deliverable?.title || epic.title}>
        <span className="text-slate-300 font-mono ml-2 pointer-events-none">↳</span>
        <InlineEdit
          value={deliverable?.title || epic.title}
          onSave={(v) => deliverable ? handleUpdateDeliverable(deliverable.id, 'title', v) : handleUpdateEpic(epic.id, 'title', v)}
          className="font-normal text-slate-700 w-full"
        />
      </div>

      {/* 3: Initiative */}
      <div className="truncate flex items-center">
        {epic.initiative ? (
          <Badge variant="secondary" className="font-normal text-[11px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 truncate max-w-full">
            {epic.initiative.title}
          </Badge>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </div>

      {/* 4: Owner */}
      <div>
        <Select
          value={(deliverable?.owner_id || epic.owner_id) || 'none'}
          onValueChange={(v) => deliverable ? handleUpdateDeliverable(deliverable.id, 'owner_id', v === 'none' ? null : v) : handleUpdateEpic(epic.id, 'owner_id', v === 'none' ? null : v)}
        >
          <SelectTrigger className="h-7 w-full border-transparent hover:border-slate-200 bg-transparent shadow-none px-2 text-xs">
            <SelectValue placeholder="ללא פעיל" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none" className="text-slate-400 italic">ללא פעיל</SelectItem>
            {people?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* 5: Scoped */}
      <div className="flex justify-center">
        <Switch
           checked={epic.planning_status === 'active'}
           onCheckedChange={(checked) => handleUpdateEpic(epic.id, 'planning_status', checked ? 'active' : 'scoping')}
           className="scale-75"
        />
      </div>

      {/* 6: Status */}
      <div>
        {deliverable ? (
          <Select value={deliverable.status} onValueChange={(v) => handleUpdateDeliverable(deliverable.id, 'status', v)}>
             <SelectTrigger className={`h-7 w-full border-transparent shadow-none px-2 text-[11px] ${getStatusBadgeColor(deliverable.status)}`}>
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               {statusOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
             </SelectContent>
          </Select>
        ) : (
          <Badge variant="outline" className="font-normal pb-0.5 text-[11px] bg-slate-50 text-slate-400 border-slate-100">אין תוצר</Badge>
        )}
      </div>

      {/* 7: DoD */}
      <div className="truncate text-xs text-slate-500 italic pr-2">
        {deliverable ? (
          <InlineEdit
             value={deliverable.dod || ''}
             onSave={(v) => handleUpdateDeliverable(deliverable.id, 'dod', v)}
             className="w-full text-xs"
          />
        ) : '—'}
      </div>

      {/* 8: Lighthouse Month */}
      <div className="text-slate-500 text-[11px] text-center">
        {/* Placeholder for LH month mapping later */}
        <span className="text-slate-300">—</span>
      </div>

      {/* 9: Target Date (Month only) */}
      <div className="text-slate-600 font-mono text-center text-[11px] flex items-center justify-center">
         {getMonthStr(deliverable?.planned_week_end || epic.target_date)}
      </div>

      {/* 10: Actions */}
      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => alert("Edit full epic modal")} title="עריכה מלאה">
          <Edit2 className="w-3 h-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => mutDeleteEpic.mutate(epic.id)} title="מחיקה">
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );

  const renderMultiDeliverableRow = (epic: any) => {
    const isExpanded = expandedEpics.has(epic.id) || addingSubTaskTo === epic.id;
    const deliverables = epic.deliverables || [];

    return (
      <div key={`epic-${epic.id}`} className="flex flex-col border-b last:border-0 border-slate-200">
        {/* Parent Epic Row */}
        <div
          className="p-1 px-4 items-center hover:bg-slate-50 transition-colors cursor-pointer text-sm bg-slate-50/50 group"
          onClick={(e) => toggleEpic(epic.id, e)}
          style={rowStyle}
        >
          {/* 1: Epic Name */}
          <div className="font-bold text-slate-800 truncate flex items-center gap-1 pr-1">
             {renderEpicIcons(epic)}
             <InlineEdit
                value={epic.title}
                onSave={(v) => handleUpdateEpic(epic.id, 'title', v)}
                className="w-full truncate"
             />
          </div>

          {/* 2: Deliverables Count */}
          <div className="truncate flex items-center gap-2 pr-2">
             <span className="text-slate-300 font-mono ml-2 pointer-events-none">↳</span>
             <Badge variant="outline" className="font-normal text-[11px] text-slate-400 border-slate-200">
                {deliverables.length} תוצרים
             </Badge>
          </div>

          {/* 3: Initiative */}
          <div className="truncate flex items-center">
            {epic.initiative ? (
              <Badge variant="secondary" className="font-normal text-[11px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 truncate max-w-full">
                {epic.initiative.title}
              </Badge>
            ) : (
              <span className="text-slate-300">—</span>
            )}
          </div>

          {/* 4: Owner (Aggregation) */}
          <div className="text-slate-600 truncate text-xs pl-2">
            {epic.owner_id ? people?.find((p: any) => p.id === epic.owner_id)?.name + '(ראשי)' : '—'}
          </div>

          {/* 5: Scoped */}
          <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
            <Switch
               checked={epic.planning_status === 'active'}
               onCheckedChange={(checked) => handleUpdateEpic(epic.id, 'planning_status', checked ? 'active' : 'scoping')}
               className="scale-75"
            />
          </div>

          {/* 6: Status (Aggregation) */}
          <div>
             <Badge variant="secondary" className="font-normal text-[11px] pb-0.5 bg-slate-200/50 text-slate-700">
                {epic.execution_status === 'done' ? 'הושלם במלואו' :
                 epic.execution_status === 'in_dev' ? 'בביצוע' : 'בתכנון'}
             </Badge>
          </div>

          {/* 7: DoD */}
          <div className="text-slate-400 text-[11px] italic pr-2">—</div>

          {/* 8: LH Month */}
          <div className="text-slate-300 text-center text-[11px]">—</div>

          {/* 9: Target Date */}
          <div className="text-slate-600 font-mono text-center text-[11px]">
            {getMonthStr(epic.target_date)}
          </div>

          {/* 10: Actions */}
          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-primary hover:bg-primary/10" onClick={(e) => { e.stopPropagation(); setAddingSubTaskTo(epic.id); setExpandedEpics(prev => new Set(prev).add(epic.id)); }} title="הוסף תוצר">
              <Plus className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); alert("Edit epic"); }} title="עריכה מלאה">
              <Edit2 className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); mutDeleteEpic.mutate(epic.id); }} title="מחיקה">
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Child Deliverable Rows */}
        {isExpanded && (
          <div className="bg-white border-t border-slate-100 divide-y divide-slate-50 relative">
            <div className="absolute right-6 top-0 bottom-0 w-px bg-slate-100 z-0"></div>
            {deliverables.map((deliverable: any) => (
              <div key={`deliv-${deliverable.id}`} className="p-1 px-4 items-center hover:bg-slate-50 transition-colors text-sm pr-12 relative z-10" style={rowStyle}>

                {/* 1: Epic Name (Empty for child rows) */}
                <div className="text-slate-300 pointer-events-none text-xs">&nbsp;</div>

                {/* 2: Deliverable Name */}
                <div className="font-normal text-slate-700 truncate flex items-center pr-2" title={deliverable.title}>
                  <span className="text-slate-300 font-mono ml-2 pointer-events-none">↳</span>
                  <InlineEdit
                    value={deliverable.title}
                    onSave={(v) => handleUpdateDeliverable(deliverable.id, 'title', v)}
                    className="w-full"
                  />
                </div>

                {/* 3: Initiative (Empty here) */}
                <div></div>

                {/* 4: Owner */}
                <div>
                  <Select
                    value={deliverable.owner_id || 'none'}
                    onValueChange={(v) => handleUpdateDeliverable(deliverable.id, 'owner_id', v === 'none' ? null : v)}
                  >
                    <SelectTrigger className="h-7 w-full border-transparent hover:border-slate-200 bg-transparent shadow-none px-2 text-xs">
                      <SelectValue placeholder="ללא שיוך" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-slate-400 italic">ללא שיוך</SelectItem>
                      {people?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* 5: Scoped (Empty for individual deliverables usually) */}
                <div></div>

                {/* 6: Status */}
                <div>
                  <Select value={deliverable.status} onValueChange={(v) => handleUpdateDeliverable(deliverable.id, 'status', v)}>
                    <SelectTrigger className={`h-7 w-full border-transparent shadow-none px-2 text-[11px] ${getStatusBadgeColor(deliverable.status)}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* 7: DoD */}
                <div className="truncate text-xs text-slate-500 italic pr-2">
                  <InlineEdit
                     value={deliverable.dod || ''}
                     onSave={(v) => handleUpdateDeliverable(deliverable.id, 'dod', v)}
                     className="w-full text-xs"
                  />
                </div>

                {/* 8: LH Month */}
                <div className="text-slate-300 text-[11px] text-center">—</div>

                {/* 9: Target Date */}
                <div className="text-slate-600 font-mono text-center text-[11px]">
                  {getMonthStr(deliverable.planned_week_end)}
                </div>

                {/* 10: Actions */}
                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => alert("Edit deliverable modal")} title="עריכה מלאה">
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => mutDeleteDeliverable.mutate(deliverable.id)} title="מחיקה">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Inline Sub-task Creator */}
            {addingSubTaskTo === epic.id && (
               <div className="pr-12 border-t border-slate-50">
                 {renderInlineRow(epic.id)}
               </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderInlineRow = (forceEpicId?: string) => (
    <div className={`p-1.5 px-4 items-center transition-colors text-sm bg-blue-50/50 border-b border-blue-100 ${forceEpicId ? 'border-none bg-slate-50' : ''}`} style={rowStyle}>
      {/* 1: Epic Name / Initiative For New */}
      <div className="flex gap-2 pr-1">
        {!forceEpicId ? (
          <>
            <div className="w-1/2">
              <Select
                value={(newRowData as any).initiative_id || ''}
                onValueChange={(v) => setNewRowData({...newRowData, initiative_id: v} as any)}
              >
                <SelectTrigger className="h-7 w-full border-slate-200 bg-white shadow-none px-2 text-xs">
                  <SelectValue placeholder="* בחר יוזמה" />
                </SelectTrigger>
                <SelectContent>
                  {initiatives?.map((i: any) => <SelectItem key={i.id} value={i.id.toString()}>{i.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-1/2">
              <Input
                value={newRowData.new_epic_title}
                onChange={e => setNewRowData({...newRowData, new_epic_title: e.target.value})}
                placeholder="שם האפיק (אופציונלי)"
                className="h-7 text-xs bg-white shadow-none focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>
          </>
        ) : (
          <div className="text-slate-400 text-xs flex items-center">
             <span className="text-blue-600 font-bold ml-1">✧</span> תוצר חדש
          </div>
        )}
      </div>

      {/* 2: Deliverable Title */}
      <div className="pr-2">
        <Input
          value={newRowData.title}
          onChange={e => setNewRowData({...newRowData, title: e.target.value})}
          placeholder="שם התוצר"
          className="h-7 text-xs font-bold bg-white shadow-none focus-visible:ring-1 focus-visible:ring-primary w-full"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSaveInlineRow(forceEpicId);
            if (e.key === 'Escape') { setIsCreatingInline(false); setAddingSubTaskTo(null); }
          }}
          autoFocus={!!forceEpicId}
        />
      </div>

      {/* 3: Initiative Chip (Skip) */}
      <div></div>

      {/* 4: Owner */}
      <div>
        <Select
          value={newRowData.owner_id}
          onValueChange={(v) => setNewRowData({...newRowData, owner_id: v})}
        >
          <SelectTrigger className="h-7 w-full border-slate-200 bg-white shadow-none px-2 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none" className="text-slate-400 italic">ללא שיוך</SelectItem>
            {people?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* 5: Scoped */}
      <div></div>

      {/* 6: Status */}
      <div>
        <Select value={newRowData.status} onValueChange={(v) => setNewRowData({...newRowData, status: v})}>
          <SelectTrigger className={`h-7 w-full shadow-none px-2 text-[11px] bg-white border-slate-200`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* 7: DoD */}
      <div></div>

      {/* 8: LH Month */}
      <div></div>

      {/* 9: Target */}
      <div></div>

      {/* 10: Actions */}
      <div className="flex gap-1 justify-end">
        <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-600 hover:bg-emerald-50" onClick={() => handleSaveInlineRow(forceEpicId)} title="שמור">
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
           <LayoutList className="w-6 h-6 text-primary" />
           תוצרים ותוכניות
        </h1>

        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2 space-x-reverse bg-slate-100/50 p-1 rounded-md border border-slate-200">
            <Button
              variant={view === 'active' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('active')}
              className={view === 'active' ? 'bg-white shadow-sm font-medium' : 'text-slate-500'}
            >
              פעילים בלבד
            </Button>
            <Button
              variant={view === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('all')}
              className={view === 'all' ? 'bg-white shadow-sm font-medium' : 'text-slate-500'}
            >
              הכל
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 font-medium">קבץ לפי:</span>
            <Select value={groupBy} onValueChange={(val: any) => setGroupBy(val)}>
              <SelectTrigger className="w-[140px] bg-white h-9 shadow-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ללא קיבוץ</SelectItem>
                <SelectItem value="initiative">יוזמה (Initiative)</SelectItem>
                <SelectItem value="month">חודש יעד</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={() => setIsCreatingInline(true)} disabled={isCreatingInline} className="shadow-sm">
            <Plus className="w-4 h-4 ml-2" />
            תוצר חדש
          </Button>
        </div>
      </div>

      <div className="border bg-white shadow-sm rounded-md overflow-hidden flex flex-col">
        {/* Table Header */}
        <div className="p-2 px-4 bg-slate-50 border-b font-semibold text-slate-600 text-sm shadow-sm z-10 sticky top-14 select-none" style={rowStyle}>
          <div className="cursor-pointer hover:text-slate-900 flex items-center" onClick={() => handleSort('epic')}>
            אפיק <SortIcon columnKey="epic" />
          </div>
          <div className="cursor-pointer hover:text-slate-900 flex items-center" onClick={() => handleSort('title')}>
            שם התוצר <SortIcon columnKey="title" />
          </div>
          <div className="cursor-pointer hover:text-slate-900 flex items-center" onClick={() => handleSort('initiative')}>
            יוזמה <SortIcon columnKey="initiative" />
          </div>
          <div className="cursor-pointer hover:text-slate-900 flex items-center" onClick={() => handleSort('owner')}>
            אחראי <SortIcon columnKey="owner" />
          </div>
          <div className="cursor-pointer hover:text-slate-900 flex items-center justify-center" onClick={() => handleSort('scoped')}>
            Scoped <SortIcon columnKey="scoped" />
          </div>
          <div className="cursor-pointer hover:text-slate-900 flex items-center" onClick={() => handleSort('status')}>
            סטטוס <SortIcon columnKey="status" />
          </div>
          <div className="cursor-pointer hover:text-slate-900 flex items-center" onClick={() => handleSort('dod')}>
            DoD <SortIcon columnKey="dod" />
          </div>
          <div className="cursor-pointer hover:text-slate-900 flex items-center justify-center">
            LH Month
          </div>
          <div className="cursor-pointer hover:text-slate-900 flex items-center justify-center" onClick={() => handleSort('target')}>
            חודש יעד <SortIcon columnKey="target" />
          </div>
          <div></div>
        </div>

        <div className="flex flex-col pb-4 bg-white relative">
          {groups.length === 0 || (groups.length === 1 && groups[0].rows.length === 0) ? (
            <div className="p-12 text-center text-slate-400 bg-white">
              <LayoutList className="w-12 h-12 mx-auto mb-4 opacity-20" />
              לא נמצאו תוצרים מתאימים לתצוגה זו
            </div>
          ) : (
            groups.map((group, idx) => (
              <div key={idx} className="flex flex-col bg-white">
                {groupBy !== 'none' && (
                  <div className="p-2 px-4 bg-slate-100/80 border-b border-t font-semibold text-slate-700 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] first:border-t-0 sticky top-[90px] backdrop-blur-md z-10 flex items-center justify-between">
                    <span className="flex items-center gap-2"><Tag className="w-4 h-4 text-primary" /> {group.header}</span>
                    <Badge variant="outline" className="bg-white">{group.rows.length} שורות</Badge>
                  </div>
                )}

                <div className="flex flex-col divide-y divide-slate-100">
                  {group.rows.map((epic: any) => {
                    const deliverables = epic.deliverables || [];
                    if (deliverables.length <= 1) {
                      return renderSingleDeliverableRow(epic, deliverables[0]);
                    } else {
                      return renderMultiDeliverableRow(epic);
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
             className="px-4 py-3 border-t border-slate-100 text-primary font-medium hover:bg-slate-50 cursor-pointer flex items-center justify-center gap-2 text-sm transition-colors sticky bottom-0 bg-white shadow-[0_-4px_6px_-6px_rgba(0,0,0,0.1)]"
             onClick={() => setIsCreatingInline(true)}
          >
             <Plus className="w-4 h-4" /> שורה חדשה
          </div>
        )}
      </div>
    </div>
  );
}
