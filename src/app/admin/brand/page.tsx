"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings, Search, BarChart3, Map, CalendarDays, PenTool,
  Loader2, Check, ChevronRight, Brain, AlertCircle, Globe,
  Camera, MapPin, Gamepad2, Save, RefreshCw, Copy, ExternalLink,
  Target, Users, TrendingUp, TrendingDown, Minus, Zap
} from "lucide-react";

// ═══ TYPES ═══
interface BrandConfig {
  instagram: string;
  site: string;
  region: string;
  niche: string;
  description: string;
}

interface AnalysisResult {
  step: string;
  status: "pending" | "running" | "done" | "error";
  content: string;
}

interface DiagnosticData {
  posicionamento: string;
  nota: number;
  forcas: string[];
  fraquezas: string[];
  oportunidades: string[];
  ameacas: string[];
  concorrentes: { nome: string; pontoForte: string; oportunidade: string }[];
  resumo: string;
}

interface PlanData {
  posicionamento: string;
  tomDeVoz: string;
  pilares: string[];
  cronograma: { semana: number; titulo: string; tarefas: string[] }[];
}

interface PostData {
  title: string;
  type: string;
  day: string;
  time: string;
  caption: string;
  hashtags: string;
}

// ═══ STEPS ═══
const STEPS = [
  { id: "setup", label: "CONFIGURAÇÃO", icon: Settings, desc: "Dados da marca" },
  { id: "analise", label: "ANÁLISE", icon: Search, desc: "IA analisa sua marca" },
  { id: "diagnostico", label: "DIAGNÓSTICO", icon: BarChart3, desc: "Situação atual" },
  { id: "plano", label: "PLANO", icon: Map, desc: "Estratégia de ação" },
  { id: "execucao", label: "EXECUÇÃO", icon: PenTool, desc: "Conteúdo pronto" },
];

const DEFAULT_CONFIG: BrandConfig = {
  instagram: "@orbitalroxa.gg",
  site: "orbitalroxa.com.br",
  region: "Ribeirão Preto, SP",
  niche: "CS2 / Esports",
  description: "Crew de produção de campeonatos de CS2. Cup #1 realizado com 40 jogadores, 8 times, 60+ presenciais. Plataforma própria com stats ao vivo, highlights e leaderboard.",
};

export default function BrandPage() {
  const [currentStep, setCurrentStep] = useState("setup");
  const [config, setConfig] = useState<BrandConfig>(DEFAULT_CONFIG);
  const [configSaved, setConfigSaved] = useState(false);
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [diagnostic, setDiagnostic] = useState<DiagnosticData | null>(null);
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState("");

  // Load saved config
  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/brand/notes?key=brand_config", { credentials: "include" });
      const data = await res.json();
      if (data.note?.content) {
        const saved = JSON.parse(data.note.content);
        setConfig({ ...DEFAULT_CONFIG, ...saved });
        setConfigSaved(true);
      }

      // Load saved diagnostic
      const dRes = await fetch("/api/brand/notes?key=brand_diagnostic", { credentials: "include" });
      const dData = await dRes.json();
      if (dData.note?.content) {
        setDiagnostic(JSON.parse(dData.note.content));
      }

      // Load saved plan
      const pRes = await fetch("/api/brand/notes?key=brand_plan", { credentials: "include" });
      const pData = await pRes.json();
      if (pData.note?.content) {
        setPlan(JSON.parse(pData.note.content));
      }

      // Load saved posts
      const postsRes = await fetch("/api/brand/notes?key=brand_posts_generated", { credentials: "include" });
      const postsData = await postsRes.json();
      if (postsData.note?.content) {
        setPosts(JSON.parse(postsData.note.content));
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  // Save config
  const saveConfig = async () => {
    try {
      await fetch("/api/brand/notes", {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section_key: "brand_config", content: JSON.stringify(config) }),
      });
      setConfigSaved(true);
    } catch { /* ignore */ }
  };

  // Save data to notes
  const saveToNotes = async (key: string, data: unknown) => {
    await fetch("/api/brand/notes", {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section_key: key, content: JSON.stringify(data) }),
    }).catch(() => {});
  };

  // AI Call helper
  const callAI = async (action: string, extraContext?: string): Promise<string> => {
    const res = await fetch("/api/brand/ai/execute", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, config, extraContext }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return typeof data.result === "string" ? data.result : JSON.stringify(data.result || data);
  };

  // ═══ STEP 2: ANÁLISE ═══
  const runAnalysis = async () => {
    setAnalyzing(true);
    const steps = [
      { id: "perfil", label: "Analisando perfil da marca..." },
      { id: "site", label: "Analisando site e plataforma..." },
      { id: "concorrentes", label: "Identificando concorrentes..." },
      { id: "mercado", label: "Analisando posicionamento no mercado..." },
    ];

    setAnalyses(steps.map(s => ({ step: s.label, status: "pending", content: "" })));

    for (let i = 0; i < steps.length; i++) {
      setAnalyses(prev => prev.map((a, j) => j === i ? { ...a, status: "running" } : a));

      try {
        const result = await callAI(`analise-${steps[i].id}`);
        setAnalyses(prev => prev.map((a, j) => j === i ? { ...a, status: "done", content: result } : a));
      } catch (err) {
        setAnalyses(prev => prev.map((a, j) => j === i ? { ...a, status: "error", content: err instanceof Error ? err.message : "Erro" } : a));
      }
    }

    setAnalyzing(false);
  };

  // ═══ STEP 3: DIAGNÓSTICO ═══
  const generateDiagnostic = async () => {
    setGenerating(true);
    try {
      const result = await callAI("diagnostico-completo");
      const parsed = JSON.parse(result);
      setDiagnostic(parsed);
      await saveToNotes("brand_diagnostic", parsed);
    } catch { /* ignore */ }
    setGenerating(false);
  };

  // ═══ STEP 4: PLANO ═══
  const generatePlan = async () => {
    setGenerating(true);
    try {
      const result = await callAI("gerar-plano");
      const parsed = JSON.parse(result);
      setPlan(parsed);
      await saveToNotes("brand_plan", parsed);
    } catch { /* ignore */ }
    setGenerating(false);
  };

  // ═══ STEP 5: EXECUÇÃO ═══
  const generatePosts = async () => {
    setGenerating(true);
    try {
      const result = await callAI("gerar-conteudo");
      const parsed = JSON.parse(result);
      setPosts(parsed);
      await saveToNotes("brand_posts_generated", parsed);
    } catch { /* ignore */ }
    setGenerating(false);
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(""), 2000);
  };

  const stepIndex = STEPS.findIndex(s => s.id === currentStep);

  const inputClass = "w-full bg-[#0A0A0A] border border-[#2A2A2A] text-sm text-white px-4 py-2.5 focus:border-orbital-purple outline-none font-[family-name:var(--font-jetbrains)] placeholder:text-white/15";
  const labelClass = "font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-purple mb-1.5 block";

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 size={20} className="text-orbital-purple animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-orbital-purple/10 border border-orbital-purple/30 flex items-center justify-center">
          <Brain size={18} className="text-orbital-purple" />
        </div>
        <div>
          <h1 className="font-[family-name:var(--font-orbitron)] text-sm tracking-[0.2em] text-white">BRAND INTELLIGENCE</h1>
          <p className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-white/30">Agente de marketing com IA</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((step, i) => {
          const isActive = step.id === currentStep;
          const isDone = i < stepIndex;
          return (
            <button key={step.id} onClick={() => setCurrentStep(step.id)}
              className={`flex-1 flex items-center gap-2 px-3 py-2.5 border transition-all ${
                isActive ? "bg-orbital-purple/10 border-orbital-purple/40" :
                isDone ? "bg-green-500/5 border-green-500/20" :
                "bg-[#111] border-[#1A1A1A] hover:border-[#2A2A2A]"
              }`}>
              <div className={`w-5 h-5 flex items-center justify-center text-[0.5rem] font-bold shrink-0 ${
                isDone ? "bg-green-500/20 text-green-400" : isActive ? "bg-orbital-purple/20 text-orbital-purple" : "bg-[#1A1A1A] text-white/20"
              }`}>
                {isDone ? <Check size={10} /> : i + 1}
              </div>
              <div className="text-left min-w-0 hidden md:block">
                <div className={`font-[family-name:var(--font-orbitron)] text-[0.4rem] tracking-[0.1em] ${isActive ? "text-orbital-purple" : isDone ? "text-green-400" : "text-white/20"}`}>
                  {step.label}
                </div>
                <div className="font-[family-name:var(--font-jetbrains)] text-[0.4rem] text-white/15 truncate">{step.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* ═══════ STEP 1: SETUP ═══════ */}
        {currentStep === "setup" && (
          <motion.div key="setup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
            <div className="bg-[#111] border border-[#1A1A1A] p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Settings size={16} className="text-orbital-purple" />
                <span className="font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-[0.15em] text-white">DADOS DA MARCA</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}><Camera size={10} className="inline mr-1" />INSTAGRAM</label>
                  <input value={config.instagram} onChange={e => setConfig({ ...config, instagram: e.target.value })} className={inputClass} placeholder="@seuinstagram" />
                </div>
                <div>
                  <label className={labelClass}><Globe size={10} className="inline mr-1" />SITE</label>
                  <input value={config.site} onChange={e => setConfig({ ...config, site: e.target.value })} className={inputClass} placeholder="seusite.com.br" />
                </div>
                <div>
                  <label className={labelClass}><MapPin size={10} className="inline mr-1" />REGIÃO</label>
                  <input value={config.region} onChange={e => setConfig({ ...config, region: e.target.value })} className={inputClass} placeholder="Cidade, Estado" />
                </div>
                <div>
                  <label className={labelClass}><Gamepad2 size={10} className="inline mr-1" />NICHO</label>
                  <input value={config.niche} onChange={e => setConfig({ ...config, niche: e.target.value })} className={inputClass} placeholder="CS2, Esports, Gaming..." />
                </div>
              </div>

              <div>
                <label className={labelClass}>DESCRIÇÃO DA MARCA</label>
                <textarea value={config.description} onChange={e => setConfig({ ...config, description: e.target.value })} rows={3} className={`${inputClass} resize-none`} placeholder="Descreva sua marca, o que faz, público-alvo..." />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button onClick={saveConfig}
                  className="flex items-center gap-2 px-4 py-2 bg-orbital-purple/15 border border-orbital-purple/30 text-orbital-purple font-[family-name:var(--font-jetbrains)] text-[0.6rem] hover:bg-orbital-purple/25 transition-all">
                  <Save size={12} /> SALVAR
                </button>
                <button onClick={() => { saveConfig(); setCurrentStep("analise"); }}
                  className="flex items-center gap-2 px-5 py-2 bg-orbital-purple border border-orbital-purple text-white font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider hover:bg-orbital-purple/80 transition-all">
                  PRÓXIMO <ChevronRight size={12} />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══════ STEP 2: ANÁLISE ═══════ */}
        {currentStep === "analise" && (
          <motion.div key="analise" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
            <div className="bg-[#111] border border-[#1A1A1A] p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Search size={16} className="text-orbital-purple" />
                  <span className="font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-[0.15em] text-white">ANÁLISE DA MARCA</span>
                </div>
                <button onClick={runAnalysis} disabled={analyzing}
                  className="flex items-center gap-2 px-4 py-2 bg-orbital-purple/15 border border-orbital-purple/30 text-orbital-purple font-[family-name:var(--font-jetbrains)] text-[0.6rem] hover:bg-orbital-purple/25 disabled:opacity-40 transition-all">
                  {analyzing ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
                  {analyzing ? "ANALISANDO..." : "INICIAR ANÁLISE"}
                </button>
              </div>

              <p className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-white/30 mb-4">
                A IA vai analisar {config.instagram}, {config.site} e identificar concorrentes no mercado de {config.niche} em {config.region}.
              </p>

              {/* Analysis steps */}
              <div className="space-y-3">
                {analyses.map((a, i) => (
                  <div key={i} className={`border p-4 transition-all ${
                    a.status === "running" ? "bg-orbital-purple/5 border-orbital-purple/30" :
                    a.status === "done" ? "bg-green-500/3 border-green-500/20" :
                    a.status === "error" ? "bg-red-500/5 border-red-500/20" :
                    "bg-[#0A0A0A] border-[#1A1A1A]"
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {a.status === "running" && <Loader2 size={12} className="text-orbital-purple animate-spin" />}
                      {a.status === "done" && <Check size={12} className="text-green-400" />}
                      {a.status === "error" && <AlertCircle size={12} className="text-red-400" />}
                      {a.status === "pending" && <div className="w-3 h-3 rounded-full bg-[#2A2A2A]" />}
                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-white/60">{a.step}</span>
                    </div>
                    {a.content && (
                      <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-white/40 whitespace-pre-wrap leading-relaxed pl-5">
                        {a.content.substring(0, 500)}{a.content.length > 500 ? "..." : ""}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {analyses.length > 0 && analyses.every(a => a.status === "done") && (
                <div className="flex justify-end mt-4">
                  <button onClick={() => { generateDiagnostic(); setCurrentStep("diagnostico"); }}
                    className="flex items-center gap-2 px-5 py-2 bg-orbital-purple border border-orbital-purple text-white font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider hover:bg-orbital-purple/80 transition-all">
                    GERAR DIAGNÓSTICO <ChevronRight size={12} />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ═══════ STEP 3: DIAGNÓSTICO ═══════ */}
        {currentStep === "diagnostico" && (
          <motion.div key="diag" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
            {!diagnostic && !generating ? (
              <div className="bg-[#111] border border-[#1A1A1A] p-6 text-center">
                <BarChart3 size={32} className="text-orbital-purple/30 mx-auto mb-3" />
                <p className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-white/30 mb-4">Execute a análise primeiro para gerar o diagnóstico</p>
                <button onClick={generateDiagnostic} disabled={generating}
                  className="flex items-center gap-2 mx-auto px-4 py-2 bg-orbital-purple/15 border border-orbital-purple/30 text-orbital-purple font-[family-name:var(--font-jetbrains)] text-[0.6rem] hover:bg-orbital-purple/25 disabled:opacity-40 transition-all">
                  {generating ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
                  GERAR DIAGNÓSTICO
                </button>
              </div>
            ) : generating ? (
              <div className="bg-[#111] border border-[#1A1A1A] p-12 text-center">
                <Loader2 size={24} className="text-orbital-purple animate-spin mx-auto mb-3" />
                <p className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-white/40">Gerando diagnóstico completo...</p>
              </div>
            ) : diagnostic && (
              <>
                {/* Score + resumo */}
                <div className="bg-[#111] border border-[#1A1A1A] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-white/30">NOTA GERAL</span>
                      <div className="font-[family-name:var(--font-orbitron)] text-4xl text-orbital-purple mt-1">
                        {diagnostic.nota}<span className="text-sm text-white/20">/10</span>
                      </div>
                    </div>
                    <div className="flex-1 ml-6">
                      <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-white/30">POSICIONAMENTO</span>
                      <p className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-white/60 mt-1">{diagnostic.posicionamento}</p>
                    </div>
                  </div>
                  <p className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-white/40 border-t border-[#1A1A1A] pt-3">{diagnostic.resumo}</p>
                </div>

                {/* SWOT */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "FORÇAS", items: diagnostic.forcas, icon: TrendingUp, color: "green" },
                    { label: "FRAQUEZAS", items: diagnostic.fraquezas, icon: TrendingDown, color: "red" },
                    { label: "OPORTUNIDADES", items: diagnostic.oportunidades, icon: Zap, color: "amber" },
                    { label: "AMEAÇAS", items: diagnostic.ameacas, icon: AlertCircle, color: "red" },
                  ].map(section => (
                    <div key={section.label} className="bg-[#111] border border-[#1A1A1A] p-4">
                      <div className={`flex items-center gap-1.5 mb-3 font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-[0.15em] text-${section.color}-400`}>
                        <section.icon size={12} /> {section.label}
                      </div>
                      <div className="space-y-1.5">
                        {section.items?.map((item, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <span className={`text-${section.color}-400 text-[0.5rem] mt-0.5`}>▸</span>
                            <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-white/50">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Concorrentes */}
                {diagnostic.concorrentes && diagnostic.concorrentes.length > 0 && (
                  <div className="bg-[#111] border border-[#1A1A1A] p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Users size={14} className="text-orbital-purple" />
                      <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-purple">CONCORRENTES IDENTIFICADOS</span>
                    </div>
                    <div className="space-y-2">
                      {diagnostic.concorrentes.map((c, i) => (
                        <div key={i} className="flex items-start gap-3 bg-[#0A0A0A] border border-[#1A1A1A] p-3">
                          <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] text-white/20 mt-0.5">{i + 1}</span>
                          <div className="flex-1">
                            <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-white">{c.nome}</span>
                            <p className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-white/30 mt-0.5">Ponto forte: {c.pontoForte}</p>
                            <p className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-green-400/60 mt-0.5">Oportunidade: {c.oportunidade}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between">
                  <button onClick={generateDiagnostic}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-white/30 hover:text-orbital-purple font-[family-name:var(--font-jetbrains)] text-[0.55rem] transition-all">
                    <RefreshCw size={10} /> Regerar
                  </button>
                  <button onClick={() => { if (!plan) generatePlan(); setCurrentStep("plano"); }}
                    className="flex items-center gap-2 px-5 py-2 bg-orbital-purple border border-orbital-purple text-white font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider hover:bg-orbital-purple/80 transition-all">
                    CRIAR PLANO <ChevronRight size={12} />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ═══════ STEP 4: PLANO ═══════ */}
        {currentStep === "plano" && (
          <motion.div key="plano" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
            {!plan && !generating ? (
              <div className="bg-[#111] border border-[#1A1A1A] p-6 text-center">
                <Map size={32} className="text-orbital-purple/30 mx-auto mb-3" />
                <p className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-white/30 mb-4">Gere o diagnóstico primeiro para criar o plano</p>
                <button onClick={generatePlan} disabled={generating}
                  className="flex items-center gap-2 mx-auto px-4 py-2 bg-orbital-purple/15 border border-orbital-purple/30 text-orbital-purple font-[family-name:var(--font-jetbrains)] text-[0.6rem] disabled:opacity-40">
                  <Brain size={12} /> GERAR PLANO
                </button>
              </div>
            ) : generating ? (
              <div className="bg-[#111] border border-[#1A1A1A] p-12 text-center">
                <Loader2 size={24} className="text-orbital-purple animate-spin mx-auto mb-3" />
                <p className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-white/40">Criando plano estratégico...</p>
              </div>
            ) : plan && (
              <>
                {/* Posicionamento */}
                <div className="bg-[#111] border border-[#1A1A1A] p-5">
                  <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-purple">POSICIONAMENTO</span>
                  <p className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-white/60 mt-2">{plan.posicionamento}</p>
                  <div className="mt-3">
                    <span className="font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-[0.1em] text-white/30">TOM DE VOZ</span>
                    <p className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-white/50 mt-1">{plan.tomDeVoz}</p>
                  </div>
                </div>

                {/* Pilares */}
                {plan.pilares && (
                  <div className="bg-[#111] border border-[#1A1A1A] p-5">
                    <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-purple mb-3 block">PILARES DA MARCA</span>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {plan.pilares.map((p, i) => (
                        <div key={i} className="bg-[#0A0A0A] border border-orbital-purple/10 p-3 flex items-center gap-2">
                          <Target size={12} className="text-orbital-purple shrink-0" />
                          <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-white/60">{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cronograma */}
                {plan.cronograma && (
                  <div className="bg-[#111] border border-[#1A1A1A] p-5">
                    <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-purple mb-3 block">CRONOGRAMA</span>
                    <div className="space-y-3">
                      {plan.cronograma.map((sem, i) => (
                        <div key={i} className="border-l-2 border-orbital-purple/30 pl-4">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-[family-name:var(--font-orbitron)] text-[0.45rem] text-orbital-purple">SEMANA {sem.semana}</span>
                            <span className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-white/40">— {sem.titulo}</span>
                          </div>
                          <div className="space-y-1">
                            {sem.tarefas?.map((t, j) => (
                              <div key={j} className="flex items-start gap-1.5">
                                <CalendarDays size={8} className="text-white/20 mt-0.5 shrink-0" />
                                <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-white/50">{t}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between">
                  <button onClick={generatePlan}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-white/30 hover:text-orbital-purple font-[family-name:var(--font-jetbrains)] text-[0.55rem] transition-all">
                    <RefreshCw size={10} /> Regerar
                  </button>
                  <button onClick={() => { if (posts.length === 0) generatePosts(); setCurrentStep("execucao"); }}
                    className="flex items-center gap-2 px-5 py-2 bg-orbital-purple border border-orbital-purple text-white font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider hover:bg-orbital-purple/80 transition-all">
                    GERAR CONTEÚDO <ChevronRight size={12} />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ═══════ STEP 5: EXECUÇÃO ═══════ */}
        {currentStep === "execucao" && (
          <motion.div key="exec" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
            {posts.length === 0 && !generating ? (
              <div className="bg-[#111] border border-[#1A1A1A] p-6 text-center">
                <PenTool size={32} className="text-orbital-purple/30 mx-auto mb-3" />
                <p className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-white/30 mb-4">Gere o plano primeiro para criar o conteúdo</p>
                <button onClick={generatePosts} disabled={generating}
                  className="flex items-center gap-2 mx-auto px-4 py-2 bg-orbital-purple/15 border border-orbital-purple/30 text-orbital-purple font-[family-name:var(--font-jetbrains)] text-[0.6rem] disabled:opacity-40">
                  <Brain size={12} /> GERAR CONTEÚDO
                </button>
              </div>
            ) : generating ? (
              <div className="bg-[#111] border border-[#1A1A1A] p-12 text-center">
                <Loader2 size={24} className="text-orbital-purple animate-spin mx-auto mb-3" />
                <p className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-white/40">Criando postagens...</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-[0.15em] text-white">{posts.length} POSTS GERADOS</span>
                  <button onClick={generatePosts}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-white/30 hover:text-orbital-purple font-[family-name:var(--font-jetbrains)] text-[0.55rem] transition-all">
                    <RefreshCw size={10} /> Regerar
                  </button>
                </div>

                <div className="space-y-3">
                  {posts.map((post, i) => {
                    const typeColor = post.type === "feed" ? "purple" : post.type === "reel" ? "red" : "blue";
                    return (
                      <div key={i} className="bg-[#111] border border-[#1A1A1A] p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`font-[family-name:var(--font-jetbrains)] text-[0.5rem] px-2 py-0.5 bg-${typeColor}-500/15 text-${typeColor}-400 border border-${typeColor}-500/30`}>
                              {post.type?.toUpperCase()}
                            </span>
                            <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-white">{post.title}</span>
                          </div>
                          <div className="flex items-center gap-2 text-white/20">
                            <span className="font-[family-name:var(--font-jetbrains)] text-[0.5rem]">{post.day} · {post.time}</span>
                          </div>
                        </div>

                        {post.caption && (
                          <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-3 mb-2">
                            <p className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-white/50 whitespace-pre-wrap leading-relaxed">{post.caption}</p>
                          </div>
                        )}

                        {post.hashtags && (
                          <p className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-purple/60 mb-2">{post.hashtags}</p>
                        )}

                        <div className="flex items-center gap-2">
                          <button onClick={() => copyText(post.caption + "\n\n" + post.hashtags, `post-${i}`)}
                            className="flex items-center gap-1 font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-white/20 hover:text-orbital-purple transition-all">
                            {copied === `post-${i}` ? <><Check size={8} className="text-green-400" /> Copiado</> : <><Copy size={8} /> Copiar</>}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
