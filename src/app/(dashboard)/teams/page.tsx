import { Suspense } from "react";
import { i18n } from "@/lib/i18n";
import { TeamsDashboard } from "@/components/teams/teams-dashboard";

export default function TeamsPage() {
  return (
    <Suspense fallback={<div className="p-8 animate-pulse text-center">Loading...</div>}>
      <TeamsDashboard />
    </Suspense>
  );
}
