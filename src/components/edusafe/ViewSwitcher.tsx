import { useNavigate } from "@tanstack/react-router";
import { useView } from "@/lib/edusafe/store";
import type { ViewMode } from "@/lib/edusafe/types";
import { GraduationCap, Shield, BarChart3 } from "lucide-react";

const opts: { v: ViewMode; label: string; Icon: any }[] = [
  { v: "estudiante", label: "Estudiante", Icon: GraduationCap },
  { v: "mediador", label: "Mediador", Icon: Shield },
  { v: "director", label: "Director", Icon: BarChart3 },
];

export function ViewSwitcher() {
  const [view, setView] = useView();
  const navigate = useNavigate();
  return (
    <div className="fixed top-3 right-3 z-50 bg-white/95 backdrop-blur rounded-full shadow-lg border border-gray-200 px-1.5 py-1 flex gap-1 text-xs">
      <span className="px-2 py-1 text-[10px] uppercase tracking-wide text-gray-400 self-center hidden sm:block">demo</span>
      {opts.map(({ v, label, Icon }) => (
        <button
          key={v}
          onClick={() => { setView(v); navigate({ to: "/" }); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
            view === v ? "bg-[#0B3D91] text-white shadow" : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Icon size={14} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
