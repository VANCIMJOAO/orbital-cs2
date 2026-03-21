"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Target, Users, DollarSign, ListTodo, Calendar, Loader2, Copy, Clock, ChevronDown, Sparkles, Check } from "lucide-react";

interface Action { id: string; title: string; desc: string; icon: typeof Brain }

const ACTIONS: Action[] = [
  { id: "analise-marca", title: "ANÁLISE DE MARCA", desc: "Analisa o posicionamento atual da Orbital Roxa no mercado", icon: Brain },
  { id: "analise-concorrentes", title: "CONCORRENTES", desc: "Identifica concorrentes e como estão posicionados", icon: Target },
  { id: "buscar-leads", title: "BUSCAR LEADS", desc: "Encontra times, jogadores e comunidades pra captar", icon: Users },
  { id: "buscar-patrocinadores", title: "PATROCINADORES", desc: "Sugere patrocinadores da região com estratégia de abordagem", icon: DollarSign },
  { id: "proximos-passos", title: "PRÓXIMOS PASSOS", desc: "Sugere as próximas ações prioritárias baseado no progresso", icon: ListTodo },
  { id: "gerar-cronograma", title: "CRONOGRAMA SEMANAL", desc: "Cria cronograma da próxima semana com tarefas distribuídas", icon: Calendar },
];

function renderMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("## ")) return <h2 key={i} className="font-[family-name:var(--font-orbitron)] text-sm text-orbital-purple mt-4 mb-1">{line.replace("## ", "")}</h2>;
    if (line.startsWith("### ")) return <h3 key={i} className="font-[family-name:var(--font-orbitron)] text-xs text-orbital-text mt-3 mb-1">{line.replace("### ", "")}</h3>;
    if (line.startsWith("# ")) return <h1 key={i} className="font-[family-name:var(--font-orbitron)] text-base text-orbital-purple mt-4 mb-2">{line.replace("# ", "")}</h1>;
    if (line.startsWith("- [ ] ")) return <div key={i} className="flex items-center gap-2 ml-2"><div className="w-3 h-3 border border-orbital-text-dim/30" /><span className="text-orbital-text">{line.replace("- [ ] ", "")}</span></div>;
    if (line.startsWith("- [x] ")) return <div key={i} className="flex items-center gap-2 ml-2"><div className="w-3 h-3 border border-green-400 bg-green-400/20" /><span className="text-orbital-text line-through opacity-50">{line.replace("- [x] ", "")}</span></div>;
    if (line.startsWith("- ")) return <div key={i} className="flex items-start gap-2 ml-2"><span className="text-orbital-purple mt-1 shrink-0">-</span><span className="text-orbital-text">{formatBold(line.slice(2))}</span></div>;
    if (line.match(/^\d+\. /)) return <div key={i} className="flex items-start gap-2 ml-2"><span className="text-orbital-purple shrink-0">{line.match(/^\d+/)![0]}.</span><span className="text-orbital-text">{formatBold(line.replace(/^\d+\. /, ""))}</span></div>;
    if (line.trim() === "") return <div key={i} className="h-2" />;
    return <p key={i} className="text-orbital-text">{formatBold(line)}</p>;
  });
}

function formatBold(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i} className="text-orbital-purple">{part.slice(2, -2)}</strong>;
    return part;
  });
}

export default function AssistentePage() {
  const [results, setResults] = useState<Record<string, { text: string; time: string }>>({});
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const execute = async (actionId: string) => {
    setLoadingAction(actionId);
    setExpanded(actionId);
    try {
      const res = await fetch("/api/brand/ai/execute", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: actionId }) });
      const d = await res.json();
      setResults(prev => ({ ...prev, [actionId]: { text: d.result || d.error || "Sem resultado", time: new Date().toLocaleString("pt-BR") } }));
    } catch {
      setResults(prev => ({ ...prev, [actionId]: { text: "Erro ao executar", time: new Date().toLocaleString("pt-BR") } }));
    }
    setLoadingAction(null);
  };

  const copyText = (text: string, key: string) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 2000); };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-orbitron)] text-lg tracking-wider text-orbital-text">ASSISTENTE IA</h1>
        <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim mt-1">Análises automatizadas de marketing — clique pra executar</p>
      </div>

      {/* Actions grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {ACTIONS.map(action => {
          const result = results[action.id];
          const isLoading = loadingAction === action.id;
          const isExpanded = expanded === action.id;
          const Icon = action.icon;

          return (
            <div key={action.id} className="bg-[#0A0A0A] border border-orbital-border hover:border-orbital-purple/30 transition-all overflow-hidden">
              {/* Card header */}
              <div className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-orbital-purple/10 border border-orbital-purple/20">
                    <Icon size={16} className="text-orbital-purple" />
                  </div>
                  <div className="flex-1">
                    <div className="font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-text">{action.title}</div>
                    <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim mt-0.5">{action.desc}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <button onClick={() => execute(action.id)} disabled={isLoading} className="flex items-center gap-1 px-3 py-1.5 bg-orbital-purple text-white font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider hover:bg-orbital-purple/80 transition-colors disabled:opacity-40">
                    {isLoading ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />} {isLoading ? "GERANDO..." : "EXECUTAR"}
                  </button>
                  {result && (
                    <div className="flex items-center gap-1 font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-text-dim">
                      <Clock size={8} /> {result.time}
                    </div>
                  )}
                </div>
              </div>

              {/* Result */}
              <AnimatePresence>
                {result && isExpanded && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="border-t border-orbital-purple/20 bg-[#111] p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-orbital-purple">RESULTADO</span>
                        <div className="flex gap-2">
                          <button onClick={() => copyText(result.text, action.id)} className="flex items-center gap-1 px-1.5 py-0.5 text-[0.5rem] font-[family-name:var(--font-jetbrains)] text-orbital-text-dim hover:text-orbital-text">
                            {copied === action.id ? <Check size={8} className="text-green-400" /> : <Copy size={8} />} {copied === action.id ? "COPIADO" : "COPIAR"}
                          </button>
                          <button onClick={() => setExpanded(null)} className="text-orbital-text-dim hover:text-orbital-text"><ChevronDown size={10} className="rotate-180" /></button>
                        </div>
                      </div>
                      <div className="font-[family-name:var(--font-jetbrains)] text-xs max-h-96 overflow-y-auto space-y-0.5 pr-2">
                        {renderMarkdown(result.text)}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Collapsed indicator */}
              {result && !isExpanded && (
                <button onClick={() => setExpanded(action.id)} className="w-full border-t border-orbital-border px-4 py-1.5 text-center font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-purple hover:bg-orbital-purple/5 transition-colors flex items-center justify-center gap-1">
                  <ChevronDown size={8} /> VER RESULTADO
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
