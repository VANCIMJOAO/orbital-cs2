"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Handshake, Plus, X, Loader2, CheckCircle2, AlertCircle, Trash2, ChevronRight, Copy, ArrowRight, Sparkles } from "lucide-react";
import { dbPool } from "@/lib/tournaments-db";

interface Sponsor {
  id: number;
  name: string;
  type: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  estimated_value: string | null;
  status: "prospect" | "contact" | "nego" | "closed" | "lost";
  notes: string | null;
  package_tier: string | null;
  created_at: string;
}

const STAGES = [
  { id: "prospect", label: "PROSPECT", color: "text-gray-400", bg: "bg-gray-500/10 border-gray-500/30" },
  { id: "contact", label: "CONTATO", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
  { id: "nego", label: "NEGOCIAÇÃO", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" },
  { id: "closed", label: "FECHADO", color: "text-green-400", bg: "bg-green-500/10 border-green-500/30" },
];

const PACKAGES = [
  { tier: "bronze", label: "BRONZE", price: "R$ 600", items: ["Logo no site", "2 menções na live", "1 post no Instagram"] },
  { tier: "prata", label: "PRATA", price: "R$ 1.500", items: ["Tudo do Bronze", "Banner nos mapas CS2", "Banner presencial", "3 posts no Instagram", "Produto à venda no evento"] },
  { tier: "ouro", label: "OURO", price: "R$ 3.000", items: ["Naming rights", "Exclusividade de segmento", "Tudo do Prata", "Logo no overlay da live", "Stand no evento"] },
];

export default function PatrocinioPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [aiResult, setAiResult] = useState<{ id: number; content: string } | null>(null);
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  // Form
  const [name, setName] = useState("");
  const [type, setType] = useState("local");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");

  const showFeedback = (t: "success" | "error", msg: string) => { setFeedback({ type: t, msg }); setTimeout(() => setFeedback(null), 4000); };

  const fetchSponsors = useCallback(async () => {
    try {
      const res = await fetch("/api/brand/sponsors", { credentials: "include" });
      if (res.ok) { const d = await res.json(); setSponsors(d.sponsors || []); }
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSponsors(); }, [fetchSponsors]);

  const createSponsor = async () => {
    if (!name.trim()) return;
    const res = await fetch("/api/brand/sponsors", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type, contact_name: contactName || null, contact_email: contactEmail || null, contact_phone: contactPhone || null, estimated_value: estimatedValue || null }),
    });
    if (res.ok) {
      showFeedback("success", "Sponsor adicionado");
      setName(""); setType("local"); setContactName(""); setContactEmail(""); setContactPhone(""); setEstimatedValue("");
      setShowForm(false);
      await fetchSponsors();
    } else showFeedback("error", "Erro ao adicionar");
  };

  const updateStatus = async (id: number, status: string) => {
    await fetch("/api/brand/sponsors", {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setSponsors(prev => prev.map(s => s.id === id ? { ...s, status: status as Sponsor["status"] } : s));
  };

  const deleteSponsor = async (id: number) => {
    if (!confirm("Remover este sponsor?")) return;
    await fetch(`/api/brand/sponsors?id=${id}`, { method: "DELETE", credentials: "include" });
    setSponsors(prev => prev.filter(s => s.id !== id));
  };

  const callAI = async (action: string, sponsor: Sponsor) => {
    setAiLoading(action);
    try {
      const res = await fetch("/api/brand/ai/execute", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, context: { name: sponsor.name, type: sponsor.type, estimated_value: sponsor.estimated_value, package_tier: sponsor.package_tier } }),
      });
      if (res.ok) {
        const d = await res.json();
        setAiResult({ id: sponsor.id, content: d.result });
      }
    } catch { showFeedback("error", "Erro na IA"); }
    setAiLoading(null);
  };

  const inputClass = "w-full bg-[#111] border border-orbital-border px-3 py-2 text-orbital-text font-[family-name:var(--font-jetbrains)] text-xs placeholder:text-orbital-text-dim/50 focus:outline-none focus:border-orbital-purple/50";

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={24} className="text-orbital-purple animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-russo)] text-lg tracking-wider text-orbital-text">PATROCÍNIO</h1>
          <p className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] text-orbital-text-dim">Pipeline de sponsors — {sponsors.length} total, {sponsors.filter(s => s.status === "closed").length} fechados</p>
        </div>
        <div className="flex gap-2">
          <button onClick={async () => {
            setAiLoading("buscar");
            const res = await fetch("/api/brand/ai/execute", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "buscar-patrocinadores" }) });
            if (res.ok) { const d = await res.json(); setAiResult({ id: 0, content: d.result }); }
            setAiLoading(null);
          }} disabled={!!aiLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 hover:border-cyan-500/60 text-cyan-400 font-[family-name:var(--font-russo)] text-[0.65rem] tracking-wider transition-colors disabled:opacity-40"
          >
            {aiLoading === "buscar" ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            BUSCAR COM IA
          </button>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-2 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 text-orbital-purple font-[family-name:var(--font-russo)] text-[0.65rem] tracking-wider transition-colors"
          >
            {showForm ? <X size={12} /> : <Plus size={12} />}
            {showForm ? "CANCELAR" : "ADICIONAR"}
          </button>
        </div>
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`flex items-center gap-2 p-3 text-xs font-[family-name:var(--font-jetbrains)] ${feedback.type === "success" ? "bg-green-500/10 border border-green-500/30 text-green-400" : "bg-red-500/10 border border-red-500/30 text-red-400"}`}
          >
            {feedback.type === "success" ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
            {feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Result (global) */}
      {aiResult && aiResult.id === 0 && (
        <div className="bg-[#0A0A0A] border border-cyan-500/30 p-4 relative">
          <button onClick={() => setAiResult(null)} className="absolute top-2 right-2 text-orbital-text-dim hover:text-orbital-text"><X size={14} /></button>
          <div className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-wider text-cyan-400 mb-2">SUGESTÕES DA IA</div>
          <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto">{aiResult.content}</div>
          <button onClick={() => { navigator.clipboard.writeText(aiResult.content); showFeedback("success", "Copiado!"); }}
            className="mt-2 flex items-center gap-1 px-2 py-1 text-orbital-text-dim hover:text-cyan-400 font-[family-name:var(--font-jetbrains)] text-[0.6rem] transition-colors"
          ><Copy size={10} /> COPIAR</button>
        </div>
      )}

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="bg-[#0A0A0A] border border-orbital-purple/30 p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-wider text-orbital-purple mb-1 block">EMPRESA *</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nome da empresa" className={inputClass} />
                </div>
                <div>
                  <label className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-wider text-orbital-purple mb-1 block">TIPO</label>
                  <select value={type} onChange={e => setType(e.target.value)} className={inputClass}>
                    <option value="local">Comércio local</option>
                    <option value="energetico">Energético</option>
                    <option value="periferico">Periférico</option>
                    <option value="hardware">Hardware</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input type="text" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Contato (nome)" className={inputClass} />
                <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="Email" className={inputClass} />
                <input type="text" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="WhatsApp" className={inputClass} />
              </div>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-wider text-orbital-purple mb-1 block">VALOR ESTIMADO</label>
                  <input type="text" value={estimatedValue} onChange={e => setEstimatedValue(e.target.value)} placeholder="R$ 600-1.500" className={inputClass} />
                </div>
                <button onClick={createSponsor} disabled={!name.trim()}
                  className="px-4 py-2 bg-orbital-purple text-white font-[family-name:var(--font-russo)] text-[0.65rem] tracking-wider hover:bg-orbital-purple/80 disabled:opacity-30 transition-colors"
                >ADICIONAR</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Packages reference */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PACKAGES.map(pkg => (
          <div key={pkg.tier} className={`p-4 border ${pkg.tier === "ouro" ? "border-yellow-500/30 bg-yellow-500/5" : pkg.tier === "prata" ? "border-gray-400/30 bg-gray-400/5" : "border-orange-700/30 bg-orange-700/5"}`}>
            <div className={`font-[family-name:var(--font-russo)] text-sm tracking-wider mb-1 ${pkg.tier === "ouro" ? "text-yellow-400" : pkg.tier === "prata" ? "text-gray-300" : "text-orange-400"}`}>{pkg.label}</div>
            <div className="font-[family-name:var(--font-russo)] text-lg text-orbital-text">{pkg.price}</div>
            <ul className="mt-2 space-y-1">
              {pkg.items.map(item => (
                <li key={item} className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim flex items-start gap-1">
                  <span className="text-green-400 mt-0.5">•</span> {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {STAGES.map(stage => {
          const stageSponsors = sponsors.filter(s => s.status === stage.id);
          return (
            <div key={stage.id} className="space-y-2">
              <div className={`font-[family-name:var(--font-russo)] text-[0.65rem] tracking-wider ${stage.color} flex items-center gap-2`}>
                {stage.label} <span className="opacity-50">({stageSponsors.length})</span>
              </div>
              {stageSponsors.map(s => (
                <motion.div key={s.id} layout className={`p-3 border ${stage.bg}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text font-bold">{s.name}</span>
                    <button onClick={() => setExpandedId(expandedId === s.id ? null : s.id)} className="text-orbital-text-dim hover:text-orbital-text">
                      <ChevronRight size={12} className={`transition-transform ${expandedId === s.id ? "rotate-90" : ""}`} />
                    </button>
                  </div>
                  <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">{s.type} {s.estimated_value && `• ${s.estimated_value}`}</div>

                  <AnimatePresence>
                    {expandedId === s.id && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="mt-2 pt-2 border-t border-orbital-border/30 space-y-2">
                          {s.contact_name && <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">{s.contact_name} {s.contact_phone && `• ${s.contact_phone}`}</div>}
                          {s.contact_email && <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">{s.contact_email}</div>}

                          {/* Move stage */}
                          <div className="flex gap-1 flex-wrap">
                            {STAGES.filter(st => st.id !== s.status).map(st => (
                              <button key={st.id} onClick={() => updateStatus(s.id, st.id)}
                                className={`px-2 py-0.5 font-[family-name:var(--font-jetbrains)] text-[0.6rem] border transition-colors ${st.bg} ${st.color} hover:opacity-80`}
                              >{st.label}</button>
                            ))}
                            <button onClick={() => updateStatus(s.id, "lost")} className="px-2 py-0.5 font-[family-name:var(--font-jetbrains)] text-[0.6rem] border border-red-500/30 text-red-400 bg-red-500/10 hover:opacity-80">PERDIDO</button>
                          </div>

                          {/* AI actions */}
                          <div className="flex gap-1 flex-wrap">
                            <button onClick={() => callAI("gerar-abordagem", s)} disabled={!!aiLoading}
                              className="px-2 py-1 bg-orbital-purple/10 border border-orbital-purple/30 text-orbital-purple font-[family-name:var(--font-jetbrains)] text-[0.6rem] hover:border-orbital-purple/60 transition-colors disabled:opacity-40"
                            >{aiLoading === "gerar-abordagem" ? "..." : "GERAR ABORDAGEM"}</button>
                            <button onClick={() => callAI("gerar-proposta", s)} disabled={!!aiLoading}
                              className="px-2 py-1 bg-orbital-purple/10 border border-orbital-purple/30 text-orbital-purple font-[family-name:var(--font-jetbrains)] text-[0.6rem] hover:border-orbital-purple/60 transition-colors disabled:opacity-40"
                            >{aiLoading === "gerar-proposta" ? "..." : "GERAR PROPOSTA"}</button>
                          </div>

                          {/* AI result for this sponsor */}
                          {aiResult && aiResult.id === s.id && (
                            <div className="bg-[#080808] border border-orbital-purple/20 p-3">
                              <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto">{aiResult.content}</div>
                              <button onClick={() => { navigator.clipboard.writeText(aiResult.content); showFeedback("success", "Copiado!"); }}
                                className="mt-1 flex items-center gap-1 text-orbital-text-dim hover:text-orbital-purple font-[family-name:var(--font-jetbrains)] text-[0.6rem]"
                              ><Copy size={10} /> COPIAR</button>
                            </div>
                          )}

                          <button onClick={() => deleteSponsor(s.id)} className="flex items-center gap-1 text-orbital-text-dim hover:text-red-400 font-[family-name:var(--font-jetbrains)] text-[0.6rem] transition-colors">
                            <Trash2 size={10} /> REMOVER
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
              {stageSponsors.length === 0 && (
                <div className="p-3 border border-orbital-border/20 text-center">
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim/50">Nenhum</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
