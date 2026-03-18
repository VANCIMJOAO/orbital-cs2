"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import {
  CalendarDays, CheckSquare, Handshake, FileText,
  Target, Users, Tv, Swords, Clock, Loader2, ExternalLink,
  Save, CircleDot, Brain, AlertCircle
} from "lucide-react";
import Link from "next/link";

interface BrandTask {
  id: number;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  week: number;
  week_label: string;
  week_date: string;
  done: boolean;
}

interface BrandChecklist {
  id: number;
  title: string;
  category: string;
  priority: string;
  done: boolean;
}

interface BrandNote {
  id: number;
  section_key: string;
  content: string | null;
}

interface Desbloqueador {
  id: string;
  label: string;
  done: boolean;
}

export default function BrandDashboard() {
  const [tasks, setTasks] = useState<BrandTask[]>([]);
  const [checklist, setChecklist] = useState<BrandChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalNote, setGlobalNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [cup2Date, setCup2Date] = useState("2026-05-15");
  const [desbloqueadores, setDesbloqueadores] = useState<Desbloqueador[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [savingDesb, setSavingDesb] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/brand");
      if (!res.ok) return;
      const data = await res.json();
      setTasks(data.tasks || []);
      setChecklist(data.checklist || []);
      const notesArr = (data.notes || []) as BrandNote[];

      const globalN = notesArr.find((n: BrandNote) => n.section_key === "global");
      if (globalN) setGlobalNote(globalN.content || "");

      const cup2N = notesArr.find((n: BrandNote) => n.section_key === "cup2_date");
      if (cup2N && cup2N.content) setCup2Date(cup2N.content);

      const desbN = notesArr.find((n: BrandNote) => n.section_key === "desbloqueadores");
      if (desbN && desbN.content) {
        try { setDesbloqueadores(JSON.parse(desbN.content)); } catch { /* ignore */ }
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalItems = tasks.length + checklist.length;
  const doneItems = tasks.filter(t => t.done).length + checklist.filter(c => c.done).length;
  const progressPct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  const now = new Date();
  const cup2 = new Date(cup2Date);
  const daysUntilCup2 = Math.max(0, Math.ceil((cup2.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const cup1 = { players: 40, presenciais: 60, live: 120, premiacao: 2000, partidas: 14, times: 8 };
  const cup2Targets = { players: 80, presenciais: 120, live: 300, premiacao: 4000 };

  const nextTasks = tasks.filter(t => !t.done && t.week === 1).slice(0, 3);

  async function saveNote() {
    setSavingNote(true);
    try {
      await fetch("/api/brand/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section_key: "global", content: globalNote }),
      });
    } catch { /* ignore */ } finally {
      setSavingNote(false);
    }
  }

  async function toggleDesbloqueador(id: string) {
    setSavingDesb(true);
    const updated = desbloqueadores.map(d => d.id === id ? { ...d, done: !d.done } : d);
    setDesbloqueadores(updated);
    try {
      await fetch("/api/brand/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section_key: "desbloqueadores", content: JSON.stringify(updated) }),
      });
    } catch { /* ignore */ } finally {
      setSavingDesb(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 text-orbital-purple animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-orbitron)] text-lg tracking-wider text-orbital-text">
            BRAND COMMAND CENTER
          </h1>
          <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim mt-1">
            Painel de gestão de marca da Orbital Roxa
          </p>
        </div>
      </div>

      {/* AI Analysis Panel */}
      <div className="bg-orbital-purple/5 border border-orbital-purple/15 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-orbital-purple" />
            <span className="font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-[0.15em] text-orbital-purple">ANÁLISE IA</span>
          </div>
          <button
            onClick={async () => {
              setAiLoading(true);
              setAiAnalysis(null);
              try {
                const res = await fetch("/api/brand/ai/execute", {
                  method: "POST", credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "analise-geral" }),
                });
                const data = await res.json();
                if (data.analysis) setAiAnalysis(data.analysis);
              } catch { /* ignore */ }
              setAiLoading(false);
            }}
            disabled={aiLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orbital-purple/10 border border-orbital-purple/25 text-orbital-purple font-[family-name:var(--font-jetbrains)] text-[0.55rem] hover:bg-orbital-purple/20 disabled:opacity-40 transition-all"
          >
            {aiLoading ? <Loader2 size={11} className="animate-spin" /> : <Brain size={11} />}
            {aiLoading ? "ANALISANDO..." : "ANALISAR MARCA"}
          </button>
        </div>
        {aiAnalysis ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-white/60">{aiAnalysis.resumo}</span>
              <span className="font-[family-name:var(--font-orbitron)] text-lg text-orbital-purple">{aiAnalysis.nota}<span className="text-[0.5rem] text-white/20">/10</span></span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-3">
                <div className="font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-[0.15em] text-green-400 mb-2">PRIORIDADES</div>
                {aiAnalysis.prioridades?.map((p: string, i: number) => (
                  <div key={i} className="flex items-start gap-1.5 mb-1">
                    <span className="text-green-400 text-[0.5rem] mt-0.5">▸</span>
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-white/50">{p}</span>
                  </div>
                ))}
              </div>
              <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-3">
                <div className="font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-[0.15em] text-red-400 mb-2">RISCOS</div>
                {aiAnalysis.riscos?.map((r: string, i: number) => (
                  <div key={i} className="flex items-start gap-1.5 mb-1">
                    <AlertCircle size={8} className="text-red-400 mt-0.5 shrink-0" />
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-white/50">{r}</span>
                  </div>
                ))}
              </div>
              <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-3">
                <div className="font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-[0.15em] text-amber-400 mb-2">OPORTUNIDADES</div>
                {aiAnalysis.oportunidades?.map((o: string, i: number) => (
                  <div key={i} className="flex items-start gap-1.5 mb-1">
                    <span className="text-amber-400 text-[0.5rem] mt-0.5">★</span>
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-white/50">{o}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-white/20">
            Clique em &quot;ANALISAR MARCA&quot; para a IA avaliar o progresso da ORBITAL ROXA
          </p>
        )}
      </div>

      {/* Progress + Countdown Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#111] border border-[#1A1A1A] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">PROGRESSO GERAL</span>
            <span className="font-[family-name:var(--font-orbitron)] text-sm text-orbital-purple">{progressPct}%</span>
          </div>
          <div className="w-full h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-orbital-purple rounded-full"
            />
          </div>
          <p className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim mt-2">
            {doneItems} de {totalItems} itens concluídos (tasks + checklist)
          </p>
        </div>

        <div className="bg-[#111] border border-[#1A1A1A] p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-orbital-purple" />
            <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">COUNTDOWN CUP #2</span>
          </div>
          <div className="font-[family-name:var(--font-orbitron)] text-2xl text-orbital-text">
            {daysUntilCup2} <span className="text-sm text-orbital-text-dim">dias</span>
          </div>
          <p className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim mt-1">
            Data alvo: {new Date(cup2Date).toLocaleDateString("pt-BR")}
          </p>
        </div>
      </div>

      {/* Cup #1 KPIs */}
      <div>
        <h2 className="font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-orbital-text-dim mb-3">
          CUP #1 — RESULTADOS
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Players", value: cup1.players, icon: Users },
            { label: "Presenciais", value: `${cup1.presenciais}+`, icon: Users },
            { label: "Pico Live", value: cup1.live, icon: Tv },
            { label: "Premiação", value: `R$${(cup1.premiacao / 1000).toFixed(0)}k`, icon: Target },
            { label: "Partidas", value: cup1.partidas, icon: Swords },
            { label: "Times", value: cup1.times, icon: Users },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-[#111] border border-[#1A1A1A] p-3 text-center">
              <kpi.icon size={14} className="text-orbital-text-dim mx-auto mb-1" />
              <div className="font-[family-name:var(--font-orbitron)] text-sm text-orbital-text">{kpi.value}</div>
              <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">{kpi.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Cup #2 Targets */}
      <div>
        <h2 className="font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-orbital-text-dim mb-3">
          CUP #2 — METAS
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Players", target: cup2Targets.players, cup1: cup1.players },
            { label: "Presenciais", target: cup2Targets.presenciais, cup1: cup1.presenciais },
            { label: "Pico Live", target: cup2Targets.live, cup1: cup1.live },
            { label: "Premiação", target: cup2Targets.premiacao, cup1: cup1.premiacao },
          ].map((m) => {
            const growth = Math.round(((m.target - m.cup1) / m.cup1) * 100);
            return (
              <div key={m.label} className="bg-[#111] border border-[#1A1A1A] p-3 text-center">
                <div className="font-[family-name:var(--font-orbitron)] text-sm text-orbital-purple">
                  {m.label === "Premiação" ? `R$${(m.target / 1000).toFixed(0)}k` : `${m.target}+`}
                </div>
                <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">{m.label}</div>
                <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-green-500 mt-1">
                  +{growth}% vs Cup #1
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Desbloqueadores + Proximas Acoes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#111] border border-[#1A1A1A] p-5">
          <h2 className="font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-orbital-text-dim mb-4">
            DESBLOQUEADORES CRITICOS
          </h2>
          <div className="space-y-3">
            {desbloqueadores.map((d) => (
              <button
                key={d.id}
                onClick={() => toggleDesbloqueador(d.id)}
                disabled={savingDesb}
                className="flex items-center gap-3 w-full text-left group"
              >
                <div className={`w-5 h-5 rounded-sm border flex items-center justify-center shrink-0 transition-colors ${
                  d.done ? "bg-green-500/20 border-green-500" : "border-[#333] hover:border-orbital-purple"
                }`}>
                  {d.done && <CircleDot size={10} className="text-green-500" />}
                </div>
                <span className={`font-[family-name:var(--font-jetbrains)] text-xs transition-colors ${
                  d.done ? "text-orbital-text-dim line-through" : "text-orbital-text group-hover:text-orbital-purple"
                }`}>
                  {d.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#111] border border-[#1A1A1A] p-5">
          <h2 className="font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-orbital-text-dim mb-4">
            PROXIMAS ACOES
          </h2>
          {nextTasks.length === 0 ? (
            <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
              Todas as tasks da semana 1 concluídas!
            </p>
          ) : (
            <div className="space-y-2">
              {nextTasks.map((t) => (
                <div key={t.id} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orbital-purple mt-1.5 shrink-0" />
                  <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text">
                    {t.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Notas */}
      <div className="bg-[#111] border border-[#1A1A1A] p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-orbital-text-dim">
            NOTAS DA OPERACAO
          </h2>
          <button
            onClick={saveNote}
            disabled={savingNote}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-purple transition-colors"
          >
            {savingNote ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
            Salvar
          </button>
        </div>
        <textarea
          value={globalNote}
          onChange={(e) => setGlobalNote(e.target.value)}
          rows={4}
          className="w-full bg-[#0A0A0A] border border-[#1A1A1A] p-3 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text placeholder-orbital-text-dim/40 resize-none focus:outline-none focus:border-orbital-purple/40"
          placeholder="Anotações gerais sobre a operação..."
        />
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-orbital-text-dim mb-3">
          ACESSO RAPIDO
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: "/admin/brand/cronograma", label: "Cronograma", icon: CalendarDays },
            { href: "/admin/brand/checklist", label: "Checklist", icon: CheckSquare },
            { href: "/admin/brand/patrocinio", label: "Patrocínios", icon: Handshake },
            { href: "/admin/brand/proposta", label: "Proposta", icon: FileText },
          ].map((link) => (
            <Link key={link.href} href={link.href}>
              <div className="bg-[#111] border border-[#1A1A1A] p-4 flex items-center gap-3 hover:border-orbital-purple/40 transition-colors group cursor-pointer">
                <link.icon size={16} className="text-orbital-text-dim group-hover:text-orbital-purple transition-colors" />
                <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text group-hover:text-orbital-purple transition-colors">
                  {link.label}
                </span>
                <ExternalLink size={10} className="text-orbital-text-dim/40 ml-auto" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
