"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { InlineEdit } from "@/components/ui/inline-edit";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function InitiativeGroup({ title, initiatives }: { title: string, initiatives: any[] }) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold tracking-wider text-muted-foreground flex items-center gap-2">
        <ChevronDown className="w-4 h-4" />
        {title.toUpperCase()}
      </h2>

      <div className="space-y-2 pl-6">
        {initiatives.map((init: any) => (
          <InitiativeRow key={init.id} init={init} />
        ))}
      </div>
    </div>
  );
}

function InitiativeRow({ init }: { init: any }) {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  const updateInitiative = useMutation({
    mutationFn: async (updates: any) => {
      const res = await fetch('/api/v1/initiatives/patch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: init.id, updates })
      });
      if (!res.ok) throw new Error('Failed to update initiative');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['initiatives'] });
    }
  });

  const updateEpic = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
      const res = await fetch('/api/v1/epics/patch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates })
      });
      if (!res.ok) throw new Error('Failed to update epic');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['initiatives'] });
    }
  });

  // Format dates: find max target date among epics
  const sortedTargetDates = init.epics
    .map((e: any) => e.target_date)
    .filter(Boolean)
    .sort();
  const targetDateStr = sortedTargetDates.length > 0
    ? new Date(sortedTargetDates[sortedTargetDates.length - 1]).toLocaleDateString('he-IL', { month: 'short', day: 'numeric' })
    : 'לא הוגדר';

  return (
    <div className="border bg-white rounded-md shadow-sm overflow-hidden text-sm">
      <div
        className="flex items-center gap-4 p-3 hover:bg-slate-50 transition-colors"
      >
        <div
          className="w-6 text-slate-400 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>

        <div className="flex-1 font-semibold text-slate-900 w-fit inline-block">
          <InlineEdit
            value={init.title}
            onSave={(val) => updateInitiative.mutate({ title: val })}
            className="font-semibold text-sm h-6"
          />
        </div>

        <div className="w-[120px] text-slate-600 truncate border-b border-transparent hover:border-slate-300">
          {init.owner?.name || 'ללא בעלים'}
        </div>

        <div className="w-[200px] flex items-center gap-3">
          <Progress value={init.progress_est} className="h-2 flex-1" />
          <span className="text-xs font-mono w-[3ch]">{Math.round(init.progress_est)}%</span>
        </div>

        <div className="w-[120px] text-slate-500 text-xs text-left">
          יעד: {targetDateStr}
        </div>
      </div>

      {expanded && (
        <div className="bg-slate-50 border-t p-3 pl-12">
          {init.epics.length === 0 ? (
            <div className="text-slate-400 py-2 border border-dashed rounded flex justify-center items-center">
              אין אפיקים.
              <button className="text-primary hover:underline pr-2">+ הוסף אפיק</button>
            </div>
          ) : (
            <div className="space-y-2">
              {init.epics.map((epic: any) => (
                <div key={epic.id} className="flex items-center gap-4 bg-white p-2 border rounded shadow-sm hover:shadow transition-shadow">
                  <div className="flex-1 font-medium">
                    <InlineEdit
                      value={epic.title}
                      onSave={(val) => updateEpic.mutate({ id: epic.id, updates: { title: val } })}
                      className="font-medium text-xs h-6 max-w-full"
                    />
                  </div>
                  <div className="w-[100px] text-slate-600 truncate text-xs border-b border-transparent hover:border-slate-300">
                    {/* Epics don't strictly have individual owners in the seed sometimes, but they can */}
                    {epic.owner_id ? 'יש בעלים' : init.owner?.name}
                  </div>
                  <div className="w-[100px]">
                    <Badge variant={epic.importance === 1 ? 'default' : epic.importance === 2 ? 'secondary' : 'outline'} className="text-[10px] whitespace-nowrap">
                      {epic.importance === 1 ? 'התחייבות' : epic.importance === 2 ? 'אסטרטגי' : epic.importance === 3 ? 'גבוה' : 'נחמד שיהיה'}
                    </Badge>
                  </div>
                  <div className="w-[150px] flex items-center gap-2">
                    <Progress value={epic.progress_est} className="h-2 flex-1" />
                    <span className="text-[10px] text-slate-500">{epic.completed_deliverable_count}/{epic.deliverable_count}</span>
                  </div>
                  <div className="w-[100px] text-[10px] text-slate-500 border-b border-transparent hover:border-slate-300 text-center">
                    {epic.target_date ? new Date(epic.target_date).toLocaleDateString('he-IL', { month: 'short', day: 'numeric' }) : 'לל"ת'}
                  </div>
                </div>
              ))}
              <div className="pt-2 flex justify-start">
                  <button className="text-[11px] text-primary bg-primary/10 px-2 py-1 rounded hover:underline hover:bg-primary/20 font-medium transition-colors">
                    + הוסף אפיק
                  </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
