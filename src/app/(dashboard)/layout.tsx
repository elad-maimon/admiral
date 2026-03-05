import Link from "next/link";
import { i18n } from "@/lib/i18n";
import { LayoutDashboard, Target, ListTodo, Map, Users } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="border-b bg-white top-0 sticky z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="font-bold text-xl tracking-tight text-primary">Admiral</h1>
            <nav className="hidden md:flex items-center gap-2">
              <NavLink href="/initiatives" icon={<LayoutDashboard className="w-4 h-4" />}>
                {i18n.nav.initiatives}
              </NavLink>
              <NavLink href="/epics" icon={<ListTodo className="w-4 h-4" />}>
                {i18n.nav.epics}
              </NavLink>
              <NavLink href="/lighthouse" icon={<Target className="w-4 h-4" />}>
                {i18n.nav.lighthouse}
              </NavLink>
              <NavLink href="/roadmap" icon={<Map className="w-4 h-4" />}>
                {i18n.nav.roadmap}
              </NavLink>
              <NavLink href="/teams" icon={<Users className="w-4 h-4" />}>
                {i18n.nav.teams}
              </NavLink>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}

function NavLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
    >
      {icon}
      {children}
    </Link>
  );
}
