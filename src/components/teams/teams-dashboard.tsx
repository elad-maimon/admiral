"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { i18n } from '@/lib/i18n';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Users, UserCog } from 'lucide-react';
import { InlineEdit } from "@/components/ui/inline-edit";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox";

export function TeamsDashboard() {
  const queryClient = useQueryClient();

  // Fetch Teams
  const { data: teams, isLoading: loadingTeams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await fetch('/api/v1/teams');
      return res.json();
    }
  });

  // Fetch all people
  const { data: people, isLoading: loadingPeople } = useQuery({
    queryKey: ['people'],
    queryFn: async () => {
      const res = await fetch('/api/v1/people');
      return res.json();
    }
  });

  const createTeam = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'צוות חדש' })
      });
      if (!res.ok) throw new Error('Failed to create team');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] })
  });

  const updateTeam = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
      const res = await fetch('/api/v1/teams/patch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates })
      });
      if (!res.ok) throw new Error('Failed to update team');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] })
  });

  const createPerson = useMutation({
    mutationFn: async (teamId: string | null) => {
      const res = await fetch('/api/v1/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'חבר צוות חדש',
          team_id: teamId,
          role: 'eng',
          permission: 'member',
          counts_toward_capacity: true
        })
      });
      if (!res.ok) throw new Error('Failed to create person');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['people'] })
  });

  const updatePerson = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
      const res = await fetch('/api/v1/people/patch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates })
      });
      if (!res.ok) throw new Error('Failed to update person');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['people'] })
  });

  const [selectedTeam, setSelectedTeam] = useState<string>('all');

  if (loadingTeams || loadingPeople) return <div className="p-4 animate-pulse">טוען נתונים...</div>;

  let peopleByTeam = (teams || []).map((team: any) => {
    const members = (people || []).filter((p: any) => p.team_id === team.id);
    const capacityCount = members.filter((m: any) => m.counts_toward_capacity).length;
    return {
      ...team,
      members,
      capacityCount
    };
  });

  const unassignedMembers = (people || []).filter((p: any) => !p.team_id);
  if (unassignedMembers.length > 0) {
    peopleByTeam.push({
      id: 'unassigned',
      name: 'ללא קבוצה',
      members: unassignedMembers,
      capacityCount: unassignedMembers.filter((m: any) => m.counts_toward_capacity).length,
      isUnassigned: true
    });
  }

  // Apply Team Filter
  if (selectedTeam !== 'all') {
    peopleByTeam = peopleByTeam.filter((t: any) => t.id === selectedTeam);
  }

  const roleColors: Record<string, string> = {
    'eng': 'bg-blue-100 text-blue-800 border-blue-200',
    'product': 'bg-purple-100 text-purple-800 border-purple-200',
    'manager': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'other': 'bg-slate-100 text-slate-800 border-slate-200'
  };

  const roleLabels: Record<string, string> = {
    'eng': 'מפתח/ת',
    'product': 'מוצר',
    'manager': 'מנהל/ת',
    'other': 'אחר'
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{i18n.nav.teams}</h1>

        <div className="flex items-center gap-4">
          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="כל הצוותים" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הצוותים</SelectItem>
              {teams?.map((team: any) => (
                <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
              ))}
              {unassignedMembers.length > 0 && (
                <SelectItem value="unassigned">ללא קבוצה</SelectItem>
              )}
            </SelectContent>
          </Select>

          <Button onClick={() => createTeam.mutate()} disabled={createTeam.isPending}>
            <Plus className="w-4 h-4 ml-2" />
            הוסף צוות
          </Button>
        </div>
      </div>

      <div className="border bg-white shadow-sm rounded-md overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[minmax(200px,1fr)_120px_100px_150px_80px_60px] gap-4 p-3 bg-slate-100 border-b font-semibold text-slate-600 text-sm">
          <div>שם</div>
          <div>תפקיד</div>
          <div>הרשאה</div>
          <div>שיוך צוות</div>
          <div className="text-center" title="נספר בחישוב קיבולת למחזור?">קיבולת?</div>
          <div className="text-center">פעולות</div>
        </div>

        <div className="divide-y divide-slate-200">
          {peopleByTeam.map((team: any) => (
            <div key={team.id} className="group/team">
              {/* Group Header */}
              <div className="bg-slate-50/80 p-3 flex items-center justify-between border-b">
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded bg-primary/10 text-primary`}>
                    {team.isUnassigned ? <UserCog className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                  </div>
                  {team.isUnassigned ? (
                    <span className="font-bold text-slate-700">{team.name}</span>
                  ) : (
                    <InlineEdit
                      value={team.name}
                      onSave={(val) => updateTeam.mutate({ id: team.id, updates: { name: val } })}
                      className="font-bold text-slate-900 text-base h-7"
                    />
                  )}
                  <span className="ml-4 text-xs font-semibold text-slate-500 bg-white border px-2 py-0.5 rounded-full shadow-sm">
                    סה"כ: {team.members.length} | קיבולת: {team.capacityCount}
                  </span>
                </div>

                <Button variant="ghost" size="sm" className="h-7 text-xs text-primary hover:bg-primary/10 -my-1" onClick={() => createPerson.mutate(team.isUnassigned ? null : team.id)}>
                  <Plus className="w-3 h-3 ml-1" />
                  הוסף לשורה
                </Button>
              </div>

              {/* Group Rows */}
              <div className="divide-y divide-slate-100">
                {team.members.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-400 italic bg-white">אין אנשים משויכים עדיין.</div>
                ) : (
                  team.members.map((person: any) => (
                    <div key={person.id} className="grid grid-cols-[minmax(200px,1fr)_120px_100px_150px_80px_60px] gap-4 p-2 px-3 items-center hover:bg-slate-50 transition-colors bg-white text-sm">
                      <div className="font-medium text-slate-900 pr-8">
                        <InlineEdit
                          value={person.name}
                          onSave={(val) => updatePerson.mutate({ id: person.id, updates: { name: val } })}
                          className="font-medium h-7"
                        />
                      </div>

                      <div>
                        <Select value={person.role || 'other'} onValueChange={(val) => updatePerson.mutate({ id: person.id, updates: { role: val } })}>
                          <SelectTrigger className="h-7 border-transparent hover:border-slate-300 focus:ring-0 shadow-none px-2 -ml-2 bg-transparent">
                             <div className={`text-xs px-2 py-0.5 rounded-full border ${roleColors[person.role || 'other']}`}>
                               {roleLabels[person.role || 'other']}
                             </div>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="eng">מפתח/ת</SelectItem>
                            <SelectItem value="product">מוצר</SelectItem>
                            <SelectItem value="manager">מנהל/ת</SelectItem>
                            <SelectItem value="other">אחר</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Select value={person.permission || 'viewer'} onValueChange={(val) => updatePerson.mutate({ id: person.id, updates: { permission: val } })}>
                          <SelectTrigger className="h-7 text-xs border-transparent hover:border-slate-300 focus:ring-0 shadow-none px-2 -ml-2 bg-transparent">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Select value={person.team_id || 'unassigned'} onValueChange={(val) => updatePerson.mutate({ id: person.id, updates: { team_id: val === 'unassigned' ? null : val } })}>
                          <SelectTrigger className="h-7 text-xs border-transparent hover:border-slate-300 focus:ring-0 shadow-none px-2 -ml-2 text-slate-500 max-w-[150px] bg-transparent">
                            <div className="truncate text-right w-full"><SelectValue /></div>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">ללא צוות</SelectItem>
                            {teams?.map((t: any) => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex justify-center">
                        <Checkbox
                          checked={person.counts_toward_capacity}
                          onCheckedChange={(checked: boolean | "indeterminate") => updatePerson.mutate({ id: person.id, updates: { counts_toward_capacity: checked === true } })}
                        />
                      </div>

                      <div className="flex justify-center">
                        {/* Placeholder for future delete/row actions if needed */}
                        <div className="w-5 h-5 opacity-0"></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
