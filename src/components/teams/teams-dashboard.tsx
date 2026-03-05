"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { i18n } from '@/lib/i18n';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, Users, UserCog, Edit, History } from 'lucide-react';
import { InlineEdit } from "@/components/ui/inline-edit";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PersonEditModal } from './person-edit-modal';

export function TeamsDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const { data: teams, isLoading: loadingTeams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await fetch('/api/v1/teams');
      return res.json();
    }
  });

  const [showHistorical, setShowHistorical] = useState(
    searchParams.get('historical') === 'true'
  );
  const [selectedTeam, setSelectedTeam] = useState<string>(
    searchParams.get('team') || 'all'
  );
  const [editingPerson, setEditingPerson] = useState<any | null>(null);

  // Sync state to URL and localStorage
  useEffect(() => {
    const params = new URLSearchParams();
    if (showHistorical) params.set('historical', 'true');
    if (selectedTeam !== 'all') params.set('team', selectedTeam);

    const newUrl = `?${params.toString()}`;
    router.replace(newUrl, { scroll: false });
    localStorage.setItem('admiral_teams_state', newUrl);
  }, [showHistorical, selectedTeam, router]);

  const { data: people, isLoading: loadingPeople } = useQuery({
    queryKey: ['people', showHistorical],
    queryFn: async () => {
      const activeParam = showHistorical ? '?active=none' : '';
      const res = await fetch(`/api/v1/people${activeParam}`);
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
          counts_toward_capacity: true,
          active: true
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

  // We don't filter people array here anymore since the API does it.
  const filteredPeople = people || [];

  let peopleByTeam: any[] = [];

  if (showHistorical) {
    peopleByTeam = [{
      id: 'historical',
      name: 'כל היסטוריית המשתמשים',
      members: filteredPeople,
      capacityCount: 0,
      isHistoricalWrapper: true
    }];
  } else {
    peopleByTeam = (teams || []).map((team: any) => {
      const members = filteredPeople.filter((p: any) => p.team_id === team.id);
      const capacityCount = members.filter((m: any) => m.counts_toward_capacity).length;
      return { ...team, members, capacityCount };
    });

    const unassignedMembers = filteredPeople.filter((p: any) => !p.team_id);
    if (unassignedMembers.length > 0) {
      peopleByTeam.push({
        id: 'unassigned',
        name: 'ללא קבוצה',
        members: unassignedMembers,
        capacityCount: unassignedMembers.filter((m: any) => m.counts_toward_capacity).length,
        isUnassigned: true
      });
    }

    if (selectedTeam !== 'all') {
      peopleByTeam = peopleByTeam.filter((t: any) => t.id === selectedTeam);
    }
  }

  const roleColors: Record<string, string> = {
    'eng': 'bg-blue-100/50 text-blue-800 border-[0.5px] border-blue-200',
    'product': 'bg-purple-100/50 text-purple-800 border-[0.5px] border-purple-200',
    'manager': 'bg-emerald-100/50 text-emerald-800 border-[0.5px] border-emerald-200',
    'other': 'bg-slate-100/50 text-slate-800 border-[0.5px] border-slate-200'
  };

  const roleLabels: Record<string, string> = {
    'eng': 'מפתח/ת',
    'product': 'מוצר',
    'manager': 'מנהל/ת',
    'other': 'אחר'
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    // Handle Supabase DATE string format YYYY-MM-DD
    return new Date(dateString).toLocaleDateString('he-IL');
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
           <Users className="w-6 h-6 text-primary" />
           {i18n.nav.teams}
        </h1>

        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2 space-x-reverse bg-slate-100/50 p-1 rounded-md border border-slate-200">
            <Button
              variant={!showHistorical ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowHistorical(false)}
              className={!showHistorical ? 'bg-white shadow-sm font-medium' : 'text-slate-500'}
            >
              פעילים בלבד
            </Button>
            <Button
              variant={showHistorical ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowHistorical(true)}
              className={showHistorical ? 'bg-white shadow-sm font-medium flex items-center gap-1' : 'text-slate-500 flex items-center gap-1'}
            >
              <History className="w-3.5 h-3.5" /> מידע היסטורי
            </Button>
          </div>

          {!showHistorical && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 font-medium">סינון צוות:</span>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="w-[180px] bg-white h-9 shadow-sm">
                  <SelectValue placeholder="כל הצוותים" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הצוותים</SelectItem>
                  {teams?.map((team: any) => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                  {(filteredPeople || []).filter((p: any) => !p.team_id).length > 0 && (
                    <SelectItem value="unassigned">ללא קבוצה</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {!showHistorical && (
            <Button onClick={() => createTeam.mutate()} disabled={createTeam.isPending} className="shadow-sm">
              <Plus className="w-4 h-4 ml-2" />
              צוות חדש
            </Button>
          )}
        </div>
      </div>

      <div className="border bg-white shadow-sm rounded-md overflow-hidden">
        {/* Table Header: Name, Role, Capacity, Join, Leave, Actions */}
        <div className="grid grid-cols-[minmax(180px,1fr)_120px_80px_100px_100px_60px] gap-4 p-3 bg-slate-50 border-b font-semibold text-slate-600 text-sm pl-4 pr-6">
          <div>שם</div>
          <div>תפקיד</div>
          <div className="text-center" title="נספר בחישוב קיבולת למחזור?">קיבולת?</div>
          <div className="text-center">תאריך הצטרפות</div>
          <div className="text-center">תאריך עזיבה</div>
          <div className="text-center">פעולות</div>
        </div>

        <div className="divide-y divide-slate-200">
          {peopleByTeam.length === 0 ? (
             <div className="p-8 text-center text-slate-500 italic">אין צוותים או אנשים מתאימים לפילטרים.</div>
          ) : peopleByTeam.map((team: any) => (
            <div key={team.id} className="group/team">
              {/* Group Header */}
              {!showHistorical && (
                <div className="bg-slate-100/50 p-3 px-4 flex items-center justify-between border-b">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded ${showHistorical ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary'}`}>
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
                    <span className="ml-4 text-xs font-medium text-slate-500 px-2 py-0.5 rounded-full shadow-sm border bg-white">
                      סה&quot;כ: {team.members.length} {team.members.length > 0 && !showHistorical && `| קיבולת: ${team.capacityCount}`}
                    </span>
                  </div>

                  {!showHistorical && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-primary hover:bg-primary/10 -my-1" onClick={() => createPerson.mutate(team.isUnassigned ? null : team.id)}>
                      <Plus className="w-3 h-3 ml-1" />
                      הוסף אדם
                    </Button>
                  )}
                </div>
              )}

              {/* Group Rows */}
              <div className="divide-y divide-slate-100">
                {team.members.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-400 italic bg-white">אין אנשים משויכים עדיין.</div>
                ) : (
                  team.members.map((person: any) => (
                    <div key={person.id} className={`grid grid-cols-[minmax(180px,1fr)_120px_80px_100px_100px_60px] gap-4 p-2 px-6 items-center hover:bg-slate-50 transition-colors text-sm ${showHistorical ? 'bg-amber-50/10' : 'bg-white'}`}>
                      {/* Name - not editable inline */}
                      <div className="font-medium text-slate-900 pr-2">
                        {person.name}
                      </div>

                      {/* Role - not editable inline */}
                      <div>
                        <div className={`text-xs px-2.5 py-1 rounded-full text-center font-medium ${roleColors[person.role || 'other']}`}>
                          {roleLabels[person.role || 'other']}
                        </div>
                      </div>

                      {/* Capacity - Editable Inline */}
                      <div className="flex justify-center">
                        <Checkbox
                          checked={person.counts_toward_capacity}
                          onCheckedChange={(checked: boolean | "indeterminate") => updatePerson.mutate({ id: person.id, updates: { counts_toward_capacity: checked === true } })}
                          disabled={showHistorical}
                        />
                      </div>

                      {/* Join Date - View Only */}
                      <div className="text-center text-slate-600 text-xs">
                        {formatDate(person.join_date)}
                      </div>

                      {/* Leave Date - View Only */}
                      <div className="text-center text-slate-600 text-xs">
                        {formatDate(person.leave_date)}
                      </div>

                      {/* Actions */}
                      <div className="flex justify-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 text-slate-400 hover:text-slate-900 hover:bg-slate-200"
                          onClick={() => setEditingPerson(person)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <PersonEditModal
        person={editingPerson}
        isOpen={!!editingPerson}
        onClose={() => setEditingPerson(null)}
        onSave={(id: string, updates: any) => updatePerson.mutate({ id, updates })}
        teams={teams || []}
      />
    </div>
  );
}
