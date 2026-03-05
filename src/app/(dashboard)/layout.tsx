import { Navigation } from "@/components/layout/navigation";

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
            <h1 className="font-bold text-xl tracking-tight text-primary">אדמירל</h1>
            <Navigation />
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
