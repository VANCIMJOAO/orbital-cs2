"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, Sparkles, Search, Plus, Copy, ChevronDown, Loader2, Mail, Phone, X, Check, Building2 } from "lucide-react";

interface Sponsor { id: number; name: string; type: string; contact_name: string; contact_email: string; contact_phone: string; estimated_value: string; status: string; notes: string; package_tier: string }

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  prospect: { label: "PROSPECT", color: "text-gray-400", bg: "bg-gray-400/10" },
  contact: { label: "CONTATO", color: "text-blue-400", bg: "bg-blue-400/10" },
  nego: { label: "NEGOCIAÇÃO", color: "text-yellow-400", bg: "bg-yellow-400/10" },
  closed: { label: "FECHADO", color: "text-green-400", bg: "bg-green-400/10" },
  lost: { label: "PERDIDO", color: "text-red-400", bg: "bg-red-400/10" },
};
const stages = ["prospect", "contact", "nego", "closed"];

export default function PatrocinioPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [newSponsor, setNewSponsor] = useState({ name: "", type: "local", estimated_value: "", contact_name: "", contact_email: "" });
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [aiResults, setAiResults] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/brand/sponsors", { credentials: "include" }).then(r => r.ok ? r.json() : { sponsors: [] }).then(d => { setSponsors(d.sponsors || []); setLoading(false); });
  }, []);

  const callAI = async (action: string, context: Record<string, string>, key: string) => {
    setAiLoading(p => ({ ...p, [key]: true }));
    try {
      const res = await fetch("/api/brand/ai/execute", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, context }) });
      const d = await res.json();
      setAiResults(p => ({ ...p, [key]: d.result || d.error }));
    } catch { setAiResults(p => ({ ...p, [key]: "Erro" })); }
    setAiLoading(p => ({ ...p, [key]: false }));
  };

  const searchSponsors = async () => {
    setSearchLoading(true);
    try {
      const res = await fetch("/api/brand/ai/execute", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "buscar-patrocinadores" }) });
      const d = await res.json();
      setSearchResult(d.result || d.error);
    } catch { setSearchResult("Erro ao buscar"); }
    setSearchLoading(false);
  };

  const updateStatus = async (id: number, status: string) => {
    await fetch("/api/brand/sponsors", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    setSponsors(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const addSponsor = async () => {
    if (!newSponsor.name.trim()) return;
    const res = await fetch("/api/brand/sponsors", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newSponsor) });
    if (res.ok) {
      const d = await res.json();
      setSponsors(prev => [...prev, { ...newSponsor, id: d.id, contact_phone: "", status: "prospect", notes: "", package_tier: "" }]);
      setNewSponsor({ name: "", type: "local", estimated_value: "", contact_name: "", contact_email: "" });
      setAdding(false);
    }
  };

  const copyText = (text: string, key: string) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 2000); };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-orbital-purple border-t-transparent rounded-full animate-spin" /></div>;

  const closed = sponsors.filter(s => s.status === "closed").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-[family-name:var(--font-orbitron)] text-lg tracking-wider text-orbital-text">PATROCÍNIOS</h1>
          <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim mt-1">{closed} fechados — {sponsors.length} total</p>
        </div>
        <div className="flex gap-2">
          <button onClick={searchSponsors} disabled={searchLoading} className="flex items-center gap-1 px-3 py-1.5 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 transition-all font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-wider text-orbital-purple disabled:opacity-40">
            {searchLoading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />} BUSCAR COM IA
          </button>
          <button onClick={() => setAdding(!adding)} className="flex items-center gap-1 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 hover:border-yellow-500/60 transition-all font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-wider text-yellow-400">
            <Plus size={12} /> ADICIONAR
          </button>
        </div>
      </div>

      {/* Packages reference */}
      <div className="bg-[#0A0A0A] border border-orbital-border p-3">
        <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-orbital-text-dim mb-2">PACOTES DISPONÍVEIS</div>
        <div className="grid grid-cols-3 gap-2 font-[family-name:var(--font-jetbrains)] text-[0.55rem]">
          <div className="text-orbital-text"><span className="text-yellow-400">BRONZE R$600</span> — Logo site + 2 menções + 1 post</div>
          <div className="text-orbital-text"><span className="text-gray-300">PRATA R$1.500</span> — + banner mapa + presencial + 3 posts</div>
          <div className="text-orbital-text"><span className="text-yellow-300">OURO R$3.000</span> — Naming rights + exclusividade</div>
        </div>
      </div>

      {/* AI Search results */}
      {searchResult && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#111] border border-orbital-purple/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-wider text-orbital-purple flex items-center gap-1"><Sparkles size={12} /> SUGESTÕES DA IA</span>
            <button onClick={() => setSearchResult(null)} className="text-orbital-text-dim hover:text-orbital-text"><X size={12} /></button>
          </div>
          <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text whitespace-pre-wrap max-h-96 overflow-y-auto">{searchResult}</div>
        </motion.div>
      )}

      {/* Add form */}
      {adding && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#0A0A0A] border border-yellow-500/30 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input value={newSponsor.name} onChange={e => setNewSponsor(p => ({ ...p, name: e.target.value }))} placeholder="Nome da empresa..." className="bg-transparent border border-orbital-border p-2 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text placeholder:text-orbital-text-dim/30 outline-none" />
            <select value={newSponsor.type} onChange={e => setNewSponsor(p => ({ ...p, type: e.target.value }))} className="bg-[#111] border border-orbital-border p-2 font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text outline-none">
              <option value="local">Local</option><option value="energetico">Energético</option><option value="periferico">Periférico</option><option value="hardware">Hardware</option><option value="outro">Outro</option>
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input value={newSponsor.estimated_value} onChange={e => setNewSponsor(p => ({ ...p, estimated_value: e.target.value }))} placeholder="Valor estimado" className="bg-transparent border border-orbital-border p-2 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text placeholder:text-orbital-text-dim/30 outline-none" />
            <input value={newSponsor.contact_name} onChange={e => setNewSponsor(p => ({ ...p, contact_name: e.target.value }))} placeholder="Contato (nome)" className="bg-transparent border border-orbital-border p-2 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text placeholder:text-orbital-text-dim/30 outline-none" />
            <input value={newSponsor.contact_email} onChange={e => setNewSponsor(p => ({ ...p, contact_email: e.target.value }))} placeholder="Email" className="bg-transparent border border-orbital-border p-2 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text placeholder:text-orbital-text-dim/30 outline-none" />
          </div>
          <button onClick={addSponsor} className="px-4 py-1.5 bg-yellow-500 text-black font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-wider hover:bg-yellow-500/80 transition-colors">ADICIONAR</button>
        </motion.div>
      )}

      {/* Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {stages.map(stage => {
          const cfg = statusConfig[stage];
          const stageSp = sponsors.filter(s => s.status === stage);
          return (
            <div key={stage} className="space-y-2">
              <div className={`flex items-center gap-2 px-2 py-1 ${cfg.bg}`}>
                <span className={`font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider ${cfg.color}`}>{cfg.label}</span>
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-text-dim">({stageSp.length})</span>
              </div>
              {stageSp.map(sp => (
                <div key={sp.id} className="bg-[#0A0A0A] border border-orbital-border overflow-hidden">
                  <button onClick={() => setExpanded(expanded === sp.id ? null : sp.id)} className="w-full p-2.5 text-left hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-2">
                      <Building2 size={12} className="text-orbital-text-dim shrink-0" />
                      <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text truncate flex-1">{sp.name}</span>
                      <ChevronDown size={10} className={`text-orbital-text-dim transition-transform ${expanded === sp.id ? "rotate-180" : ""}`} />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-text-dim">{sp.type}</span>
                      {sp.estimated_value && <span className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-green-400">{sp.estimated_value}</span>}
                    </div>
                  </button>

                  <AnimatePresence>
                    {expanded === sp.id && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="border-t border-orbital-border overflow-hidden">
                        <div className="p-2.5 space-y-2">
                          {sp.contact_name && <div className="flex items-center gap-1 font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim"><Mail size={8} /> {sp.contact_name} {sp.contact_email && `— ${sp.contact_email}`}</div>}
                          {sp.contact_phone && <div className="flex items-center gap-1 font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim"><Phone size={8} /> {sp.contact_phone}</div>}

                          {/* Move stage */}
                          <div className="flex gap-1">
                            {stages.filter(s => s !== stage).map(s => (
                              <button key={s} onClick={() => updateStatus(sp.id, s)} className={`px-1.5 py-0.5 text-[0.5rem] font-[family-name:var(--font-jetbrains)] ${statusConfig[s].bg} ${statusConfig[s].color}`}>
                                → {statusConfig[s].label}
                              </button>
                            ))}
                          </div>

                          {/* AI buttons */}
                          <div className="flex flex-wrap gap-1">
                            <button disabled={aiLoading[`abord-${sp.id}`]} onClick={() => callAI("gerar-abordagem", { name: sp.name, type: sp.type, estimated_value: sp.estimated_value }, `abord-${sp.id}`)} className="flex items-center gap-1 px-1.5 py-0.5 bg-orbital-purple/10 border border-orbital-purple/30 font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-purple disabled:opacity-40">
                              {aiLoading[`abord-${sp.id}`] ? <Loader2 size={8} className="animate-spin" /> : <Sparkles size={8} />} ABORDAGEM
                            </button>
                            <button disabled={aiLoading[`prop-${sp.id}`]} onClick={() => callAI("gerar-proposta", { name: sp.name, type: sp.type, package_tier: sp.package_tier || "bronze" }, `prop-${sp.id}`)} className="flex items-center gap-1 px-1.5 py-0.5 bg-orbital-purple/10 border border-orbital-purple/30 font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-purple disabled:opacity-40">
                              {aiLoading[`prop-${sp.id}`] ? <Loader2 size={8} className="animate-spin" /> : <DollarSign size={8} />} PROPOSTA
                            </button>
                          </div>

                          {/* AI Results */}
                          {["abord", "prop"].map(type => {
                            const key = `${type}-${sp.id}`;
                            const result = aiResults[key];
                            if (!result) return null;
                            return (
                              <motion.div key={key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#111] border border-orbital-purple/30 p-2">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] text-orbital-purple">{type === "abord" ? "MENSAGEM" : "PROPOSTA"}</span>
                                  <div className="flex gap-1">
                                    <button onClick={() => copyText(result, key)} className="text-[0.5rem] font-[family-name:var(--font-jetbrains)] text-orbital-text-dim hover:text-orbital-text flex items-center gap-0.5">
                                      {copied === key ? <Check size={7} className="text-green-400" /> : <Copy size={7} />} {copied === key ? "OK" : "COPIAR"}
                                    </button>
                                    <button onClick={() => setAiResults(p => { const n = { ...p }; delete n[key]; return n; })} className="text-orbital-text-dim hover:text-orbital-text"><X size={8} /></button>
                                  </div>
                                </div>
                                <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text whitespace-pre-wrap max-h-48 overflow-y-auto">{result}</div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
              {stageSp.length === 0 && <div className="text-center py-4 font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim/30">Vazio</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
