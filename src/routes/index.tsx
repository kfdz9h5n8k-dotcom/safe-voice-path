import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { initSeedIfNeeded, useView } from "@/lib/edusafe/store";
import { ViewSwitcher } from "@/components/edusafe/ViewSwitcher";
import { StudentView } from "@/components/edusafe/StudentView";
import { MediatorView } from "@/components/edusafe/MediatorView";
import { DirectorView } from "@/components/edusafe/DirectorView";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [ready, setReady] = useState(false);
  const [view] = useView();

  useEffect(() => {
    initSeedIfNeeded();
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <>
      <ViewSwitcher />
      {view === "estudiante" && <StudentView />}
      {view === "mediador" && <MediatorView />}
      {view === "director" && <DirectorView />}
    </>
  );
}
