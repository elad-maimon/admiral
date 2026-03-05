import { i18n } from "@/lib/i18n";

export default function TeamsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{i18n.nav.teams}</h1>
      </div>
      <div>
        <p className="text-muted-foreground">טוען נתונים...</p>
      </div>
    </div>
  );
}
