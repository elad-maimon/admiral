"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { i18n } from '@/lib/i18n';
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

  if (loadingTeams || loadingPeople) return <div className="p-4 animate-pulse">טוען נתונים...</div>;

  const peopleByTeam = (teams || []).map((team: any) => ({
    ...team,
    members: (people || []).filter((p: any) => p.team_id === team.id)
  }));

  const unassignedPeople = (people || []).filter((p: any) => !p.team_id);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{i18n.nav.teams}</h1>
        <Button onClick={() => createTeam.mutate()} disabled={createTeam.isPending}>
          <Plus className="w-4 h-4 ml-2" />
          הוסף צוות
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {peopleByTeam.map((team: any) => (
          <TeamCard
            key={team.id}
            team={team}
            onUpdateTeam={updateTeam.mutate}
            onAddPerson={() => createPerson.mutate(team.id)}
            onUpdatePerson={updatePerson.mutate}
            allTeams={teams}
          />
        ))}

        {/* Unassigned People Card */}
        {unassignedPeople.length > 0 && (
          <TeamCard
            team={{ id: null, name: 'ללא צוות', members: unassignedPeople }}
            onUpdateTeam={() => {}} // cannot rename null team
            onAddPerson={() => createPerson.mutate(null)}
            onUpdatePerson={updatePerson.mutate}
            allTeams={teams}
            isUnassigned={true}
          />
        )}
      </div>
    </div>
  );
}

function TeamCard({ team, onUpdateTeam, onAddPerson, onUpdatePerson, allTeams, isUnassigned = false }: any) {
  return (
    <div className="border bg-white rounded-lg shadow-sm overflow-hidden flex flex-col h-full">
      <div className="bg-slate-50 border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-md ${isUnassigned ? 'bg-slate-200 text-slate-500' : 'bg-primary/10 text-primary'}`}>
            {isUnassigned ? <UserCog className="w-5 h-5" /> : <Users className="w-5 h-5" />}
          </div>
          {isUnassigned ? (
            <h2 className="text-lg font-bold text-slate-700">{team.name}</h2>
          ) : (
            <div className="text-lg font-bold text-slate-900">
              <InlineEdit
                value={team.name}
                onSave={(val) => onUpdateTeam({ id: team.id, updates: { name: val } })}
                className="h-8 text-lg"
              />
            </div>
          )}
        </div>
        <div className="text-sm text-slate-500 bg-white border px-2 py-1 rounded">
          {team.members.length} {team.members.length === 1 ? 'חבר צוות' : 'חברי צוות'}
        </div>
      </div>

      <div className="p-0 flex-1">
        <div className="w-full text-sm">
          <div className="grid grid-cols-[minmax(120px,1fr)_100px_100px_80px_60px] gap-2 p-3 bg-slate-50 border-b font-semibold text-slate-600 text-xs text-right">
            <div>שם</div>
            <div>תפקיד</div>
            <div>הרשאה</div>
            <div>שיוך צוות</div>
            <div className="text-center" title="נספר בחישוב קיבולת למחזור?">קיבולת?</div>
          </div>

          <div className="divide-y text-xs">
            {team.members.length === 0 ? (
              <div className="p-6 text-center text-slate-400 italic">אין חברי צוות.</div>
            ) : (
              team.members.map((person: any) => (
                <div key={person.id} className="grid grid-cols-[minmax(120px,1fr)_100px_100px_80px_60px] gap-2 p-2 px-3 items-center hover:bg-slate-50 transition-colors group">
                  <div className="font-medium text-slate-900">
                    <InlineEdit
                      value={person.name}
                      onSave={(val) => onUpdatePerson({ id: person.id, updates: { name: val } })}
                      className="h-6 font-medium"
                    />
                  </div>

                  <div>
                    <Select value={person.role || 'other'} onValueChange={(val) => onUpdatePerson({ id: person.id, updates: { role: val } })}>
                      <SelectTrigger className="h-6 text-xs px-1 border-transparent hover:border-slate-300 focus:ring-0 shadow-none -ml-1">
                        <SelectValue />
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
                    <Select value={person.permission || 'viewer'} onValueChange={(val) => onUpdatePerson({ id: person.id, updates: { permission: val } })}>
                      <SelectTrigger className="h-6 text-xs px-1 border-transparent hover:border-slate-300 focus:ring-0 shadow-none -ml-1">
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
                    <Select value={person.team_id || 'none'} onValueChange={(val) => onUpdatePerson({ id: person.id, updates: { team_id: val === 'none' ? null : val } })}>
                      <SelectTrigger className="h-6 text-xs px-1 border-transparent hover:border-slate-300 focus:ring-0 shadow-none -ml-1 text-slate-500 max-w-[80px]">
                        <div className="truncate text-right w-full"><SelectValue /></div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">ללא צוות</SelectItem>
                        {allTeams?.map((t: any) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-center">
                    <Checkbox
                      checked={person.counts_toward_capacity}
                      onCheckedChange={(checked: boolean | "indeterminate") => onUpdatePerson({ id: person.id, updates: { counts_toward_capacity: checked === true } })}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="p-3 bg-slate-50 border-t mt-auto">
        <Button variant="ghost" size="sm" className="w-full text-primary hover:text-primary/80 hover:bg-primary/10 text-xs" onClick={onAddPerson}>
          <Plus className="w-4 h-4 ml-1" />
          הוסף {isUnassigned ? 'אדם' : 'חבר צוות'}
        </Button>
      </div>
    </div>
  );
}
