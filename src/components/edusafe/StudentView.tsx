import { useEffect, useRef, useState } from "react";
import { Megaphone, Lock, X, Send, Search, Image as ImgIcon, Star, ArrowLeft } from "lucide-react";
import {
  useReports, useStudents, useAudit, getDeviceToken,
  triageSeverity, generateCaseId, hashEmojis,
} from "@/lib/edusafe/store";
import { EMOJI_PALETTE, ZONAS, TIPOS } from "@/lib/edusafe/mock";
import type { Report, ChatMessage } from "@/lib/edusafe/types";

type Screen = "E1" | "E2" | "E6" | "E7" | "E8" | "E9" | "E10";

interface DraftAnswer {
  description: string;
  victimaSelf: boolean | null;
  involvedIds: string[];
  zona: string;
  cuando: string;
  evidences: string[];
}

const initialDraft: DraftAnswer = {
  description: "", victimaSelf: null, involvedIds: [], zona: "", cuando: "", evidences: [],
};

export function StudentView() {
  const [screen, setScreen] = useState<Screen>("E1");
  const [reports, setReports] = useReports();
  const [, addAudit] = useAudit();
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);

  const activeCase = reports.find(r => r.id === activeCaseId) || null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EFF6FF] to-[#ECFDF5] font-[Nunito,system-ui,sans-serif] pb-24">
      <div className="max-w-md mx-auto p-4">
        <header className="pt-12 pb-4 text-center">
          <h1 className="text-2xl font-extrabold text-[#0B3D91]">EduSafe</h1>
          <p className="text-xs text-gray-500">powered by Moriarty</p>
        </header>

        {screen === "E1" && <ScreenE1 onStart={() => setScreen("E2")} onFollow={() => setScreen("E8")} />}
        {screen === "E2" && (
          <ScreenChatbot
            onComplete={(draft) => {
              // E6 → E7
              setScreen("E6");
              (window as any).__edusafeDraft = draft;
            }}
          />
        )}
        {screen === "E6" && (
          <ScreenE6
            onConfirm={(emojis) => {
              const draft: DraftAnswer = (window as any).__edusafeDraft;
              const id = generateCaseId();
              const sev = triageSeverity(draft.description);
              const tipo = guessTipo(draft);
              const newReport: Report = {
                id, emojiKey: hashEmojis(emojis), emojis, deviceToken: getDeviceToken(),
                createdAt: Date.now(), updatedAt: Date.now(),
                status: "abierto", severity: sev, tipo, zona: draft.zona, cuando: draft.cuando,
                description: draft.description, victimaSelf: !!draft.victimaSelf,
                involved: draft.involvedIds.map(i => ({ studentId: i, role: "agresor" as const })),
                evidences: draft.evidences, chat: [],
                checklist: [
                  { key: "recepcion", label: "Recepción del caso", done: true, date: new Date().toISOString().slice(0,10) },
                  { key: "entrevista_victima", label: "Entrevista con víctima", done: false },
                  { key: "entrevista_agresor", label: "Entrevista con presunto agresor", done: false },
                  { key: "notificacion_familias", label: "Notificación a familias", done: false },
                  { key: "comunicacion_inspeccion", label: "Comunicación a inspección", done: false },
                  { key: "resolucion", label: "Resolución", done: false },
                ],
              };
              setReports([newReport, ...reports]);
              addAudit({ id: "a" + Date.now(), ts: Date.now(), actor: "Sistema", action: "Caso creado", caseId: id });
              setActiveCaseId(id);
              setScreen("E7");
            }}
          />
        )}
        {screen === "E7" && activeCase && (
          <ScreenE7 report={activeCase} onContinue={() => setScreen("E9")} />
        )}
        {screen === "E8" && (
          <ScreenE8 onSuccess={(id) => { setActiveCaseId(id); setScreen("E9"); }} onBack={() => setScreen("E1")} />
        )}
        {screen === "E9" && activeCase && (
          activeCase.status === "resuelto" || activeCase.status === "cerrado_falsa"
            ? <ScreenE10 report={activeCase} onRate={(rating) => {
                setReports(reports.map(r => r.id === activeCase.id ? { ...r, closure: { ...(r.closure!), rating } } : r));
              }} />
            : <ScreenE9 report={activeCase} onSend={(msg) => {
                setReports(reports.map(r => r.id === activeCase.id ? { ...r, chat: [...r.chat, msg], updatedAt: Date.now() } : r));
              }} onBack={() => setScreen("E1")} />
        )}
      </div>

      <PanicButton />
    </div>
  );
}

function guessTipo(d: DraftAnswer): string {
  const t = d.description.toLowerCase();
  if (d.zona === "Online/RRSS") return "Ciberbullying";
  if (/golpe|paliza|empuj|patad|puñetaz/.test(t)) return "Físico";
  if (/insult|mote|grit|amenaz/.test(t)) return "Verbal";
  if (/ignor|excluy|sol[oa]|aislad/.test(t)) return "Social";
  return "Otro";
}

function PanicButton() {
  return (
    <button
      onClick={() => { window.location.href = "https://es.wikipedia.org/wiki/Matem%C3%A1ticas"; }}
      aria-label="Salir rápido"
      className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-2xl flex items-center justify-center active:scale-95 transition"
    >
      <X size={26} strokeWidth={3} />
    </button>
  );
}

function ScreenE1({ onStart, onFollow }: { onStart: () => void; onFollow: () => void }) {
  return (
    <div className="space-y-6 mt-4">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-blue-100">
        <p className="text-lg text-center text-gray-700 leading-relaxed">
          Este es un espacio <span className="font-bold text-[#0B3D91]">SEGURO</span> y{" "}
          <span className="font-bold text-emerald-600">ANÓNIMO</span>.
          <br />
          <span className="text-base text-gray-500">Tu voz importa.</span>
        </p>
      </div>
      <button
        onClick={onStart}
        className="w-full bg-[#BFDBFE] hover:bg-blue-200 text-[#0B3D91] font-bold rounded-3xl p-6 shadow-md flex items-center gap-4 active:scale-[0.98] transition"
      >
        <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center">
          <Megaphone size={28} />
        </div>
        <div className="text-left">
          <div className="text-lg">Iniciar reporte</div>
          <div className="text-xs font-normal text-gray-600">Cuéntanos qué ha pasado</div>
        </div>
      </button>
      <button
        onClick={onFollow}
        className="w-full bg-[#BBF7D0] hover:bg-emerald-200 text-emerald-800 font-bold rounded-3xl p-6 shadow-md flex items-center gap-4 active:scale-[0.98] transition"
      >
        <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center">
          <Lock size={28} />
        </div>
        <div className="text-left">
          <div className="text-lg">Seguir mi reporte</div>
          <div className="text-xs font-normal text-gray-700">Con tu código y emojis</div>
        </div>
      </button>
    </div>
  );
}

interface BotMsg { id: string; from: "bot" | "alumno"; node: React.ReactNode; }

function ScreenChatbot({ onComplete }: { onComplete: (d: DraftAnswer) => void }) {
  const [draft, setDraft] = useState<DraftAnswer>(initialDraft);
  const [step, setStep] = useState(0);
  const [msgs, setMsgs] = useState<BotMsg[]>([
    { id: "b0", from: "bot", node: "Hola. Soy el asistente de EduSafe. Voy a hacerte unas preguntas. Tómate tu tiempo." },
    { id: "b1", from: "bot", node: "1. ¿Qué ha pasado?" },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: 99999, behavior: "smooth" }); }, [msgs]);

  function pushUser(node: React.ReactNode) { setMsgs(m => [...m, { id: "u" + Date.now() + Math.random(), from: "alumno", node }]); }
  function pushBot(node: React.ReactNode) { setMsgs(m => [...m, { id: "b" + Date.now() + Math.random(), from: "bot", node }]); }

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-blue-100 flex flex-col h-[75vh]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {msgs.map(m => (
          <div key={m.id} className={`flex ${m.from === "alumno" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-snug ${
              m.from === "alumno" ? "bg-[#BFDBFE] text-[#0B3D91] rounded-br-md" : "bg-gray-100 text-gray-700 rounded-bl-md"
            }`}>{m.node}</div>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-100 p-3">
        {step === 0 && (
          <DescriptionInput onSend={(text) => {
            pushUser(text);
            setDraft(d => ({ ...d, description: text }));
            setStep(1);
            setTimeout(() => pushBot("2. ¿A quién le está pasando?"), 200);
          }} />
        )}
        {step === 1 && (
          <RadioRow options={[{v:"si",l:"A mí"},{v:"no",l:"A otra persona"}]} onPick={(v) => {
            pushUser(v === "si" ? "A mí" : "A otra persona");
            setDraft(d => ({ ...d, victimaSelf: v === "si" }));
            setStep(2);
            setTimeout(() => pushBot("3. ¿Quién o quiénes están implicados? (puedes añadir varios)"), 200);
          }} />
        )}
        {step === 2 && (
          <StudentPicker
            value={draft.involvedIds}
            onChange={(ids) => setDraft(d => ({ ...d, involvedIds: ids }))}
            onConfirm={() => {
              if (draft.involvedIds.length === 0) { pushUser("Prefiero no decirlo"); }
              else pushUser(`${draft.involvedIds.length} persona(s) seleccionada(s)`);
              setStep(3);
              setTimeout(() => pushBot("4. ¿Dónde ocurrió?"), 200);
            }}
          />
        )}
        {step === 3 && (
          <Dropdown options={ZONAS} onPick={(z) => {
            pushUser(z);
            setDraft(d => ({ ...d, zona: z }));
            setStep(4);
            setTimeout(() => pushBot("5. ¿Cuándo ocurrió?"), 200);
          }} placeholder="Selecciona una zona…" />
        )}
        {step === 4 && (
          <RadioRow options={[{v:"Hoy",l:"Hoy"},{v:"Esta semana",l:"Esta semana"},{v:"Hace más tiempo",l:"Hace más tiempo"}]} onPick={(v) => {
            pushUser(v);
            setDraft(d => ({ ...d, cuando: v }));
            setStep(5);
            setTimeout(() => pushBot("6. ¿Tienes capturas o fotos? (opcional)"), 200);
          }} />
        )}
        {step === 5 && (
          <ImageUpload onDone={(imgs) => {
            if (imgs.length) pushUser(`${imgs.length} imagen(es) adjunta(s)`); else pushUser("Sin imágenes");
            const finalDraft = { ...draft, evidences: imgs };
            setDraft(finalDraft);
            setStep(6);
            setTimeout(() => onComplete(finalDraft), 400);
          }} />
        )}
      </div>
    </div>
  );
}

function DescriptionInput({ onSend }: { onSend: (s: string) => void }) {
  const [t, setT] = useState("");
  return (
    <div className="flex gap-2 items-end">
      <textarea
        value={t} onChange={e => setT(e.target.value)} rows={2}
        placeholder="Escribe lo que ha pasado…"
        className="flex-1 resize-none rounded-2xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0B3D91]"
      />
      <button
        disabled={!t.trim()}
        onClick={() => { onSend(t.trim()); setT(""); }}
        className="w-10 h-10 rounded-full bg-[#0B3D91] text-white flex items-center justify-center disabled:opacity-40"
      ><Send size={16}/></button>
    </div>
  );
}

function RadioRow({ options, onPick }: { options: {v:string; l:string}[]; onPick: (v:string)=>void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button key={o.v} onClick={() => onPick(o.v)}
          className="flex-1 min-w-[100px] py-2.5 px-3 rounded-2xl bg-[#BFDBFE] text-[#0B3D91] font-semibold text-sm hover:bg-blue-200 active:scale-95 transition">
          {o.l}
        </button>
      ))}
    </div>
  );
}

function Dropdown({ options, onPick, placeholder }: { options: string[]; onPick: (v:string)=>void; placeholder?: string }) {
  const [v, setV] = useState("");
  return (
    <div className="flex gap-2">
      <select
        value={v} onChange={e => setV(e.target.value)}
        className="flex-1 rounded-2xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-[#0B3D91]"
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <button disabled={!v} onClick={() => onPick(v)} className="px-4 rounded-2xl bg-[#0B3D91] text-white text-sm font-semibold disabled:opacity-40">OK</button>
    </div>
  );
}

function StudentPicker({ value, onChange, onConfirm }: { value: string[]; onChange: (ids:string[])=>void; onConfirm: ()=>void }) {
  const students = useStudents();
  const [q, setQ] = useState("");
  const filtered = q.trim() ? students.filter(s => s.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : [];
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map(id => {
          const s = students.find(x => x.id === id);
          return s ? (
            <span key={id} className="bg-blue-100 text-[#0B3D91] text-xs px-2 py-1 rounded-full flex items-center gap-1">
              {s.name} · {s.curso}
              <button onClick={() => onChange(value.filter(v => v !== id))}><X size={12}/></button>
            </span>
          ) : null;
        })}
      </div>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar alumno…"
          className="w-full pl-8 pr-3 py-2 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:border-[#0B3D91]"/>
        {filtered.length > 0 && (
          <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden z-10">
            {filtered.map(s => (
              <button key={s.id} onClick={() => { if (!value.includes(s.id)) onChange([...value, s.id]); setQ(""); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                {s.name} <span className="text-gray-400">· {s.curso}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <button onClick={onConfirm} className="w-full py-2.5 rounded-2xl bg-[#0B3D91] text-white text-sm font-semibold">
        Continuar
      </button>
    </div>
  );
}

function ImageUpload({ onDone }: { onDone: (imgs: string[]) => void }) {
  const [imgs, setImgs] = useState<string[]>([]);
  const ref = useRef<HTMLInputElement>(null);
  function handle(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files).slice(0, 4);
    Promise.all(arr.map(f => new Promise<string>(res => {
      const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(f);
    }))).then(urls => setImgs(prev => [...prev, ...urls]));
  }
  return (
    <div className="space-y-2">
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handle(e.dataTransfer.files); }}
        onClick={() => ref.current?.click()}
        className="border-2 border-dashed border-blue-200 rounded-2xl p-4 text-center text-sm text-gray-500 cursor-pointer hover:bg-blue-50"
      >
        <ImgIcon className="mx-auto mb-1 text-blue-400" size={20}/>
        Arrastra o toca para añadir imágenes
        <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={e => handle(e.target.files)} />
      </div>
      {imgs.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {imgs.map((u, i) => <img key={i} src={u} className="w-14 h-14 rounded-xl object-cover" />)}
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={() => onDone([])} className="flex-1 py-2 rounded-2xl bg-gray-100 text-gray-600 text-sm font-semibold">Saltar</button>
        <button onClick={() => onDone(imgs)} className="flex-1 py-2 rounded-2xl bg-[#0B3D91] text-white text-sm font-semibold">Enviar reporte</button>
      </div>
    </div>
  );
}

function ScreenE6({ onConfirm }: { onConfirm: (emojis: string[]) => void }) {
  const [phase, setPhase] = useState<"first"|"confirm">("first");
  const [first, setFirst] = useState<string[]>([]);
  const [second, setSecond] = useState<string[]>([]);
  const [error, setError] = useState("");
  const cur = phase === "first" ? first : second;
  const setCur = phase === "first" ? setFirst : setSecond;
  function pick(e: string) {
    if (cur.length >= 3) return;
    const next = [...cur, e]; setCur(next);
    if (next.length === 3) {
      if (phase === "first") setTimeout(() => setPhase("confirm"), 400);
      else {
        if (next.join() === first.join()) onConfirm(first);
        else { setError("Los emojis no coinciden. Vuelve a intentarlo."); setSecond([]); setFirst([]); setTimeout(()=>setPhase("first"),800); }
      }
    }
  }
  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-blue-100 mt-4">
      <h2 className="text-lg font-bold text-[#0B3D91] mb-1">Crea tu llave de 3 emojis</h2>
      <p className="text-sm text-gray-500 mb-3">{phase === "first" ? "Toca 3 emojis en orden" : "Repítelos para confirmar"}</p>
      <div className="flex gap-2 justify-center mb-3 min-h-[44px]">
        {[0,1,2].map(i => (
          <div key={i} className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-2xl">
            {cur[i] || ""}
          </div>
        ))}
      </div>
      {error && <p className="text-red-500 text-sm text-center mb-2">{error}</p>}
      <div className="grid grid-cols-5 gap-2">
        {EMOJI_PALETTE.map(e => (
          <button key={e} onClick={() => pick(e)}
            className="aspect-square rounded-2xl bg-gray-50 hover:bg-blue-100 text-2xl active:scale-90 transition">
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

function ScreenE7({ report, onContinue }: { report: Report; onContinue: () => void }) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-blue-100 mt-4 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
        <Lock className="text-emerald-600" size={28}/>
      </div>
      <h2 className="text-lg font-bold text-gray-700 mb-1">Reporte enviado</h2>
      <p className="text-xs text-gray-500 mb-4">Tu código de caso es:</p>
      <div className="text-4xl font-extrabold text-[#0B3D91] tracking-wider mb-4">{report.id}</div>
      <div className="flex gap-2 justify-center mb-5">
        {report.emojis.map((e,i) => (
          <div key={i} className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-2xl">{e}</div>
        ))}
      </div>
      <p className="text-xs text-gray-500 leading-relaxed bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-4">
        <strong>Memoriza tu código y tus 3 emojis.</strong><br/>
        NO borres los datos del navegador o perderás el acceso a este chat.
      </p>
      <button onClick={onContinue} className="w-full py-3 rounded-2xl bg-[#0B3D91] text-white font-semibold">
        Abrir mi chat seguro
      </button>
    </div>
  );
}

function ScreenE8({ onSuccess, onBack }: { onSuccess: (id: string) => void; onBack: () => void }) {
  const [code, setCode] = useState("");
  const [emojis, setEmojis] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const [reports] = useReports();
  function tryEnter() {
    setErr("");
    const r = reports.find(x => x.id.toUpperCase() === code.toUpperCase().trim());
    if (!r) return setErr("Código no encontrado");
    if (hashEmojis(emojis) !== r.emojiKey) return setErr("Emojis incorrectos");
    if (r.deviceToken !== getDeviceToken()) {
      // demo permissive: still allow
    }
    onSuccess(r.id);
  }
  function pick(e: string) {
    if (emojis.length < 3) setEmojis([...emojis, e]);
  }
  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-blue-100 mt-4">
      <button onClick={onBack} className="text-sm text-gray-500 mb-2 flex items-center gap-1"><ArrowLeft size={14}/> Volver</button>
      <h2 className="text-lg font-bold text-[#0B3D91] mb-3">Seguir mi reporte</h2>
      <input value={code} onChange={e => setCode(e.target.value)} placeholder="Código (ej: AZ-1001)"
        className="w-full px-3 py-2.5 rounded-2xl border border-gray-200 text-sm mb-3 focus:outline-none focus:border-[#0B3D91]"/>
      <p className="text-xs text-gray-500 mb-2">Toca tus 3 emojis</p>
      <div className="flex gap-2 justify-center mb-3 min-h-[44px]">
        {[0,1,2].map(i => (
          <div key={i} className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-2xl">
            {emojis[i] || ""}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-2 mb-3">
        {EMOJI_PALETTE.map(e => (
          <button key={e} onClick={() => pick(e)}
            className="aspect-square rounded-2xl bg-gray-50 hover:bg-blue-100 text-2xl active:scale-90 transition">{e}</button>
        ))}
      </div>
      {emojis.length > 0 && (
        <button onClick={() => setEmojis([])} className="text-xs text-gray-400 mb-2">Limpiar emojis</button>
      )}
      {err && <p className="text-sm text-red-500 mb-2">{err}</p>}
      <button onClick={tryEnter} disabled={!code || emojis.length !== 3}
        className="w-full py-3 rounded-2xl bg-[#0B3D91] text-white font-semibold disabled:opacity-40">
        Entrar
      </button>
    </div>
  );
}

function ScreenE9({ report, onSend, onBack }: { report: Report; onSend: (m: ChatMessage)=>void; onBack: ()=>void }) {
  const [t, setT] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: 99999 }); }, [report.chat.length]);
  function send() {
    if (!t.trim()) return;
    onSend({ id: "m" + Date.now(), from: "alumno", text: t.trim(), ts: Date.now() });
    setT("");
  }
  function attach(files: FileList | null) {
    if (!files || !files[0]) return;
    const r = new FileReader();
    r.onload = () => onSend({ id: "m" + Date.now(), from: "alumno", image: r.result as string, ts: Date.now() });
    r.readAsDataURL(files[0]);
  }
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-blue-100 flex flex-col h-[78vh] mt-2">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <button onClick={onBack} className="text-gray-400"><ArrowLeft size={18}/></button>
        <div className="text-center">
          <div className="font-bold text-[#0B3D91]">{report.id}</div>
          <div className="text-[10px] text-gray-400 uppercase">canal seguro</div>
        </div>
        <div className="w-5"/>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        <div className="text-center text-xs text-gray-400 my-2">Caso recibido. Un mediador te responderá pronto.</div>
        {report.chat.map(m => (
          <div key={m.id} className={`flex ${m.from === "alumno" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm ${
              m.from === "alumno" ? "bg-[#BFDBFE] text-[#0B3D91] rounded-br-md" : "bg-gray-100 text-gray-700 rounded-bl-md"
            }`}>
              {m.image ? <img src={m.image} className="rounded-lg max-w-[200px]"/> : m.text}
              <div className="text-[10px] opacity-60 mt-0.5">{new Date(m.ts).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-100 p-2 flex gap-2 items-center">
        <button onClick={() => ref.current?.click()} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"><ImgIcon size={16}/></button>
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => attach(e.target.files)}/>
        <input value={t} onChange={e => setT(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Escribe…" className="flex-1 px-3 py-2 rounded-full bg-gray-50 border border-gray-100 text-sm focus:outline-none"/>
        <button onClick={send} className="w-9 h-9 rounded-full bg-[#0B3D91] text-white flex items-center justify-center"><Send size={14}/></button>
      </div>
    </div>
  );
}

function ScreenE10({ report, onRate }: { report: Report; onRate: (n:number)=>void }) {
  const [n, setN] = useState(report.closure?.rating || 0);
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100 mt-4 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3 text-2xl">✓</div>
      <h2 className="text-lg font-bold text-gray-700 mb-2">Caso cerrado</h2>
      <p className="text-sm text-gray-500 mb-5 leading-relaxed">
        Se han tomado medidas. Gracias por ayudar a que el cole sea un lugar seguro.
      </p>
      <p className="text-xs text-gray-400 mb-2">¿Cómo valoras la atención recibida?</p>
      <div className="flex justify-center gap-1 mb-2">
        {[1,2,3,4,5].map(i => (
          <button key={i} onClick={() => { setN(i); onRate(i); }}>
            <Star size={28} className={i <= n ? "fill-amber-400 text-amber-400" : "text-gray-300"}/>
          </button>
        ))}
      </div>
      {n > 0 && <p className="text-xs text-emerald-600">¡Gracias por tu valoración!</p>}
    </div>
  );
}
