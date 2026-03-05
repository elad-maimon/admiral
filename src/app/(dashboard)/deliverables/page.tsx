import { Suspense } from "react";
import { DeliverablesDashboard } from "@/components/deliverables/deliverables-dashboard";

export default function DeliverablesPage() {
  return (
    <Suspense fallback={<div className="p-8 animate-pulse text-center">Loading Deliverables...</div>}>
      <DeliverablesDashboard />
    </Suspense>
  );
}
