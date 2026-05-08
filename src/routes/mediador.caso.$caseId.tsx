import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { initSeedIfNeeded, useView } from "@/lib/edusafe/store";
import { ViewSwitcher } from "@/components/edusafe/ViewSwitcher";
import { MediatorHeader } from "@/components/edusafe/MediatorView";
import { CaseDetailPage } from "@/components/edusafe/CaseDetail";

export const Route = createFileRoute("/mediador/caso/$caseId")({
  component: CaseRoute,
});

function CaseRoute() {
  const { caseId } = Route.useParams();
  const [ready, setReady] = useState(false);
  const [, setView] = useView();

  useEffect(() => {
    initSeedIfNeeded();
    setView("mediador");
    setReady(true);
  }, [setView]);

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-[#F3F4F6] font-sans">
      <ViewSwitcher />
      <MediatorHeader />
      <CaseDetailPage caseId={caseId} />
    </div>
  );
}
