"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Target, Users, Megaphone, CalendarDays, PenTool,
  Compass, Camera, Copy, Check, Trash2, Clock, FileText,
  Loader2, ChevronDown, ChevronUp, RefreshCw
} from "lucide-react";

interface Report {
  id: number;
  action_id: string;
  title: string;
  content: string | null;
  status: "generating" | "ready" | "error";
  created_at: string;
}

const ACTIONS = [
  { id: "analise-marca", icon: Target, label: "ANÁLISE DE MARCA", desc: "SWOT, posicionamento, público-alvo, diferencial competitivo, recomendações imediatas", color: "purple" },
  { id: "analise-concorrentes", icon: Users, label: "ANÁLISE DE CONCORRENTES", desc: "GamersClub, ESEA, Draft5, ligas regionais — o que copiar, evitar e explorar", color: "blue" },
  { id: "captar-leads", icon: Users, label: "CAPTAÇÃO DE LEADS", desc: "Estratégia por canal (WhatsApp, Discord, Instagram, presencial) com templates prontos", color: "green" },
  { id: "captar-patrocinadores", icon: Megaphone, label: "PROSPECÇÃO DE PATROCÍNIO", desc: "20 prospects com pitch personalizado, script de abordagem, timeline", color: "amber" },
  { id: "gerar-cronograma", icon: CalendarDays, label: "CRONOGRAMA CUP #2", desc: "8 semanas detalhadas com tarefas, posts e metas por semana", color: "red" },
  { id: "conteudo-semanal", icon: PenTool, label: "CONTEÚDO SEMANAL", desc: "7 dias de posts prontos com caption, hashtags e horário ideal", color: "pink" },
  { id: "posicionamento", icon: Compass, label: "POSICIONAMENTO", desc: "Manifesto, proposta de valor, pilares, tom de voz, personas, plano de ação", color: "indigo" },
  { id: "analise-instagram", icon: Camera, label: "ESTRATÉGIA INSTAGRAM", desc: "Perfil, estética, 20 primeiros posts, crescimento, métricas", color: "orange" },
];

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  purple: { bg: "bg-purple-500/8", border: "border-purple-500/20", text: "text-purple-400", glow: "hover:border-purple-500/40" },
  blue: { bg: "bg-blue-500/8", border: "border-blue-500/20", text: "text-blue-400", glow: "hover:border-blue-500/40" },
  green: { bg: "bg-green-500/8", border: "border-green-500/20", text: "text-green-400", glow: "hover:border-green-500/40" },
  amber: { bg: "bg-amber-500/8", border: "border-amber-500/20", text: "text-amber-400", glow: "hover:border-amber-500/40" },
  red: { bg: "bg-red-500/8", border: "border-red-500/20", text: "text-red-400", glow: "hover:border-red-500/40" },
  pink: { bg: "bg-pink-500/8", border: "border-pink-500/20", text: "text-pink-400", glow: "hover:border-pink-500/40" },
  indigo: { bg: "bg-indigo-500/8", border: "border-indigo-500/20", text: "text-indigo-400", glow: "hover:border-indigo-500/40" },
  orange: { bg: "bg-orange-500/8", border: "border-orange-500/20", text: "text-orange-400", glow: "hover:border-orange-500/40" },
};

export default function AIPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const [streamContent, setStreamContent] = useState("");
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch("/api/brand/ai", { credentials: "include" });
      const data = await res.json();
      setReports(data.reports || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const generateReport = async (actionId: string) => {
    if (generating) return;
    setGenerating(actionId);
    setStreamContent("");
    setActiveReport(null);

    try {
      const res = await fetch("/api/brand/ai", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro" }));
        setStreamContent(`❌ ${err.error}`);
        setGenerating(null);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) { setGenerating(null); return; }

      const decoder = new TextDecoder();
      let content = "";
      let reportId: number | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(l => l.startsWith("data: "));

        for (const line of lines) {
          const raw = line.slice(6);
          try {
            const data = JSON.parse(raw);
            if (data.reportId && !reportId) reportId = data.reportId;
            if (data.text) {
              content += data.text;
              setStreamContent(content);
            }
            if (data.done) {
              // Fetch the saved report
              if (reportId) {
                const rRes = await fetch(`/api/brand/ai/report?id=${reportId}`, { credentials: "include" });
                const rData = await rRes.json();
                if (rData.report) setActiveReport(rData.report);
              }
              await fetchReports();
            }
            if (data.error) {
              content += `\n\n❌ ${data.error}`;
              setStreamContent(content);
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      setStreamContent(`❌ Erro: ${err instanceof Error ? err.message : "Falha na conexão"}`);
    }

    setGenerating(null);
  };

  const loadReport = async (report: Report) => {
    if (report.status !== "ready") return;
    try {
      const res = await fetch(`/api/brand/ai/report?id=${report.id}`, { credentials: "include" });
      const data = await res.json();
      if (data.report) {
        setActiveReport(data.report);
        setStreamContent(data.report.content || "");
      }
    } catch { /* ignore */ }
  };

  const deleteReport = async (id: number) => {
    await fetch("/api/brand/ai", {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (activeReport?.id === id) {
      setActiveReport(null);
      setStreamContent("");
    }
    await fetchReports();
  };

  const copyContent = () => {
    navigator.clipboard.writeText(streamContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLastReport = (actionId: string) => reports.find(r => r.action_id === actionId && r.status === "ready");

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-orbital-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orbital-purple/10 border border-orbital-purple/30 flex items-center justify-center">
            <Brain size={18} className="text-orbital-purple" />
          </div>
          <div>
            <h1 className="font-[family-name:var(--font-orbitron)] text-sm tracking-[0.2em] text-white">INTELIGÊNCIA DE MARKETING</h1>
            <p className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-white/30">
              Agente IA · Análises e estratégias automatizadas · {reports.filter(r => r.status === "ready").length} relatórios gerados
            </p>
          </div>
        </div>
      </div>

      {/* Action cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ACTIONS.map(action => {
          const colors = COLOR_MAP[action.color];
          const lastReport = getLastReport(action.id);
          const isGenerating = generating === action.id;

          return (
            <button
              key={action.id}
              onClick={() => generateReport(action.id)}
              disabled={!!generating}
              className={`${colors.bg} border ${colors.border} ${colors.glow} p-4 text-left transition-all disabled:opacity-40 group relative overflow-hidden`}
            >
              {isGenerating && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
              )}
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <action.icon size={18} className={colors.text} />
                  {isGenerating && <Loader2 size={14} className={`${colors.text} animate-spin`} />}
                </div>
                <div className={`font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] ${colors.text} mb-1.5`}>
                  {action.label}
                </div>
                <p className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-white/25 leading-relaxed mb-3">
                  {action.desc}
                </p>
                <div className="flex items-center gap-1.5">
                  <Clock size={8} className="text-white/15" />
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.45rem] text-white/15">
                    {lastReport ? formatDate(lastReport.created_at) : "Nunca gerado"}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Report viewer */}
      <AnimatePresence>
        {(streamContent || generating) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-[#111] border border-[#1A1A1A]"
          >
            {/* Report header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#1A1A1A]">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-orbital-purple" />
                <span className="font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-[0.15em] text-white">
                  {activeReport?.title || ACTIONS.find(a => a.id === generating)?.label || "RELATÓRIO"}
                </span>
                {generating && (
                  <span className="flex items-center gap-1 font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-purple">
                    <Loader2 size={10} className="animate-spin" /> Gerando...
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {streamContent && !generating && (
                  <>
                    <button onClick={copyContent}
                      className="flex items-center gap-1 px-2 py-1 text-white/30 hover:text-orbital-purple font-[family-name:var(--font-jetbrains)] text-[0.5rem] transition-all">
                      {copied ? <><Check size={10} className="text-green-400" /> Copiado</> : <><Copy size={10} /> Copiar</>}
                    </button>
                    {activeReport && (
                      <button onClick={() => deleteReport(activeReport.id)}
                        className="p-1 text-white/20 hover:text-red-400 transition-all">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Report content */}
            <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
              <div className="prose prose-invert prose-sm max-w-none
                prose-headings:font-[family-name:var(--font-orbitron)] prose-headings:tracking-wider prose-headings:text-orbital-purple
                prose-h1:text-sm prose-h2:text-xs prose-h3:text-[0.7rem]
                prose-p:font-[family-name:var(--font-jetbrains)] prose-p:text-[0.65rem] prose-p:text-white/60 prose-p:leading-relaxed
                prose-li:font-[family-name:var(--font-jetbrains)] prose-li:text-[0.65rem] prose-li:text-white/60
                prose-strong:text-white prose-strong:font-semibold
                prose-code:text-orbital-purple prose-code:bg-orbital-purple/10 prose-code:px-1
                prose-hr:border-[#1A1A1A]
              ">
                {streamContent.split("\n").map((line, i) => {
                  if (line.startsWith("## ")) return <h2 key={i} className="mt-5 mb-2">{line.slice(3)}</h2>;
                  if (line.startsWith("### ")) return <h3 key={i} className="mt-4 mb-1.5">{line.slice(4)}</h3>;
                  if (line.startsWith("# ")) return <h1 key={i} className="mt-6 mb-3">{line.slice(2)}</h1>;
                  if (line.startsWith("---")) return <hr key={i} className="my-4" />;
                  if (line.startsWith("- ") || line.startsWith("* ")) return (
                    <div key={i} className="flex gap-2 ml-2 mb-0.5">
                      <span className="text-orbital-purple shrink-0">•</span>
                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-white/60">{line.slice(2)}</span>
                    </div>
                  );
                  if (/^\d+\.\s/.test(line)) return (
                    <div key={i} className="flex gap-2 ml-2 mb-0.5">
                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-purple shrink-0">{line.match(/^\d+/)?.[0]}.</span>
                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-white/60">{line.replace(/^\d+\.\s*/, "")}</span>
                    </div>
                  );
                  if (line.startsWith("**") && line.endsWith("**")) return (
                    <p key={i} className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-white font-semibold mt-3 mb-1">{line.replace(/\*\*/g, "")}</p>
                  );
                  if (line.trim() === "") return <div key={i} className="h-2" />;
                  return <p key={i} className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-white/60 leading-relaxed">{line}</p>;
                })}
                {generating && <span className="inline-block w-2 h-4 bg-orbital-purple animate-pulse ml-0.5" />}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report history */}
      {reports.length > 0 && (
        <div>
          <button onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-white/30 hover:text-white/50 transition-all">
            {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            HISTÓRICO DE RELATÓRIOS ({reports.length})
          </button>

          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-1">
                  {reports.map(report => (
                    <div key={report.id}
                      className={`flex items-center justify-between px-4 py-2.5 bg-[#111] border border-[#1A1A1A] transition-all ${
                        report.status === "ready" ? "cursor-pointer hover:border-orbital-purple/20" : "opacity-50"
                      } ${activeReport?.id === report.id ? "border-orbital-purple/40" : ""}`}
                      onClick={() => loadReport(report)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          report.status === "ready" ? "bg-green-500" : report.status === "generating" ? "bg-amber-500 animate-pulse" : "bg-red-500"
                        }`} />
                        <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-white/60">{report.title}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-white/20">{formatDate(report.created_at)}</span>
                        {report.status === "ready" && (
                          <button onClick={(e) => { e.stopPropagation(); deleteReport(report.id); }}
                            className="p-1 text-white/15 hover:text-red-400 transition-all">
                            <Trash2 size={10} />
                          </button>
                        )}
                        {report.status === "generating" && <RefreshCw size={10} className="text-amber-400 animate-spin" />}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
