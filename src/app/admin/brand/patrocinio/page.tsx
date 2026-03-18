"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import {
  Handshake, Plus, Loader2, Trash2, X, ArrowRight, Save,
  DollarSign, Users, Phone, Mail, ChevronDown
} from "lucide-react";
import { BrandAIButton } from "@/components/brand-ai-button";

interface Sponsor {
  id: number;
  name: string;
  type: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  estimated_value: string | null;
  actual_value: number | null;
  status: "prospect" | "contact" | "nego" | "closed" | "lost";
  notes: string | null;
  package_tier: string | null;
}

const STATUS_INFO: Record<string, { label: string; cls: string; bg: string }> = {
  prospect: { label: "Prospect", cls: "text-gray-400", bg: "bg-gray-500/15 border-gray-500/30" },
  contact: { label: "Em Contato", cls: "text-blue-400", bg: "bg-blue-500/15 border-blue-500/30" },
  nego: { label: "Negociando", cls: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/30" },
  closed: { label: "Fechado", cls: "text-green-400", bg: "bg-green-500/15 border-green-500/30" },
  lost: { label: "Perdido", cls: "text-red-400", bg: "bg-red-500/15 border-red-500/30" },
};

const NEXT_STATUS: Record<string, string> = {
  prospect: "contact",
  contact: "nego",
  nego: "closed",
};

const TYPE_OPTIONS = [
  { value: "periferico", label: "Periferico" },
  { value: "energetico", label: "Energetico" },
  { value: "hardware", label: "Hardware" },
  { value: "vestuario", label: "Vestuario" },
  { value: "outro", label: "Outro" },
];

export default function PatrocinioPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [patrocinioNote, setPatrocinioNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("periferico");
  const [formContactName, setFormContactName] = useState("");
  const [formContactPhone, setFormContactPhone] = useState("");
  const [formContactEmail, setFormContactEmail] = useState("");
  const [formEstimatedValue, setFormEstimatedValue] = useState("");
  const [formStatus, setFormStatus] = useState("prospect");
  const [formNotes, setFormNotes] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [sponsorRes, noteRes] = await Promise.all([
        fetch("/api/brand/sponsors"),
        fetch("/api/brand/notes?section_key=patrocinio"),
      ]);
      if (sponsorRes.ok) {
        const data = await sponsorRes.json();
        setSponsors(data.sponsors || []);
      }
      if (noteRes.ok) {
        const data = await noteRes.json();
        if (data.note?.content) setPatrocinioNote(data.note.content);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Metrics
  const countByStatus = (s: string) => sponsors.filter(sp => sp.status === s).length;
  const totalCaptado = sponsors
    .filter(sp => sp.status === "closed" && sp.actual_value)
    .reduce((sum, sp) => sum + (sp.actual_value || 0), 0);

  async function addSponsor() {
    if (!formName.trim()) return;
    try {
      const res = await fetch("/api/brand/sponsors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          type: formType,
          contact_name: formContactName || null,
          contact_email: formContactEmail || null,
          contact_phone: formContactPhone || null,
          estimated_value: formEstimatedValue || null,
          status: formStatus,
          notes: formNotes || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSponsors(prev => [{
          id: data.id,
          name: formName.trim(),
          type: formType,
          contact_name: formContactName || null,
          contact_email: formContactEmail || null,
          contact_phone: formContactPhone || null,
          estimated_value: formEstimatedValue || null,
          actual_value: null,
          status: formStatus as Sponsor["status"],
          notes: formNotes || null,
          package_tier: null,
        }, ...prev]);
        resetForm();
      }
    } catch { /* ignore */ }
  }

  function resetForm() {
    setFormName(""); setFormType("periferico"); setFormContactName("");
    setFormContactPhone(""); setFormContactEmail(""); setFormEstimatedValue("");
    setFormStatus("prospect"); setFormNotes(""); setShowForm(false);
  }

  async function advanceStatus(sp: Sponsor) {
    const next = NEXT_STATUS[sp.status];
    if (!next) return;
    setSponsors(prev => prev.map(s => s.id === sp.id ? { ...s, status: next as Sponsor["status"] } : s));
    try {
      await fetch("/api/brand/sponsors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sp.id, status: next }),
      });
    } catch { /* ignore */ }
  }

  async function deleteSponsor(id: number) {
    setSponsors(prev => prev.filter(s => s.id !== id));
    try {
      await fetch("/api/brand/sponsors", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch { /* ignore */ }
  }

  async function saveNote() {
    setSavingNote(true);
    try {
      await fetch("/api/brand/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section_key: "patrocinio", content: patrocinioNote }),
      });
    } catch { /* ignore */ } finally {
      setSavingNote(false);
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-orbitron)] text-lg tracking-wider text-orbital-text">
            PATROCINIOS
          </h1>
          <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim mt-1">
            Pipeline de captacao de patrocinio
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BrandAIButton
            action="prospectar-sponsors"
            label="PROSPECTAR COM IA"
            variant="compact"
            onComplete={() => fetchData()}
          />
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-4 py-2 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-purple transition-colors"
          >
            <Plus size={12} /> Novo Prospect
          </button>
        </div>
      </div>

      {/* Pipeline Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Prospects", count: countByStatus("prospect"), cls: "text-gray-400 border-gray-500/30" },
          { label: "Em Contato", count: countByStatus("contact"), cls: "text-blue-400 border-blue-500/30" },
          { label: "Negociando", count: countByStatus("nego"), cls: "text-amber-400 border-amber-500/30" },
          { label: "Fechados", count: countByStatus("closed"), cls: "text-green-400 border-green-500/30" },
          { label: "Total Captado", count: null, value: `R$ ${(totalCaptado / 100).toLocaleString("pt-BR")}`, cls: "text-orbital-purple border-orbital-purple/30" },
        ].map((m) => (
          <div key={m.label} className={`bg-[#111] border ${m.cls} p-4 text-center`}>
            <div className={`font-[family-name:var(--font-orbitron)] text-lg ${m.cls.split(" ")[0]}`}>
              {m.value ?? m.count}
            </div>
            <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim mt-1">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-[#111] border border-orbital-purple/30 p-5 space-y-3">
              <h3 className="font-[family-name:var(--font-orbitron)] text-xs text-orbital-text mb-2">NOVO PROSPECT</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nome da empresa"
                  className="bg-[#0A0A0A] border border-[#1A1A1A] px-3 py-2 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text placeholder-orbital-text-dim/40 focus:outline-none focus:border-orbital-purple/40" />
                <select value={formType} onChange={(e) => setFormType(e.target.value)}
                  className="bg-[#0A0A0A] border border-[#1A1A1A] px-3 py-2 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text focus:outline-none">
                  {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <input value={formContactName} onChange={(e) => setFormContactName(e.target.value)} placeholder="Nome do contato"
                  className="bg-[#0A0A0A] border border-[#1A1A1A] px-3 py-2 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text placeholder-orbital-text-dim/40 focus:outline-none focus:border-orbital-purple/40" />
                <input value={formContactPhone} onChange={(e) => setFormContactPhone(e.target.value)} placeholder="Telefone"
                  className="bg-[#0A0A0A] border border-[#1A1A1A] px-3 py-2 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text placeholder-orbital-text-dim/40 focus:outline-none focus:border-orbital-purple/40" />
                <input value={formContactEmail} onChange={(e) => setFormContactEmail(e.target.value)} placeholder="Email"
                  className="bg-[#0A0A0A] border border-[#1A1A1A] px-3 py-2 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text placeholder-orbital-text-dim/40 focus:outline-none focus:border-orbital-purple/40" />
                <input value={formEstimatedValue} onChange={(e) => setFormEstimatedValue(e.target.value)} placeholder="Valor estimado (ex: R$500-1k)"
                  className="bg-[#0A0A0A] border border-[#1A1A1A] px-3 py-2 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text placeholder-orbital-text-dim/40 focus:outline-none focus:border-orbital-purple/40" />
                <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)}
                  className="bg-[#0A0A0A] border border-[#1A1A1A] px-3 py-2 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text focus:outline-none">
                  <option value="prospect">Prospect</option>
                  <option value="contact">Em Contato</option>
                  <option value="nego">Negociando</option>
                  <option value="closed">Fechado</option>
                </select>
              </div>
              <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Notas..."
                rows={2} className="w-full bg-[#0A0A0A] border border-[#1A1A1A] px-3 py-2 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text placeholder-orbital-text-dim/40 resize-none focus:outline-none focus:border-orbital-purple/40" />
              <div className="flex gap-2">
                <button onClick={addSponsor}
                  className="px-4 py-2 bg-orbital-purple/20 border border-orbital-purple/40 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-purple hover:bg-orbital-purple/30 transition-colors">
                  Adicionar
                </button>
                <button onClick={resetForm}
                  className="px-4 py-2 border border-[#1A1A1A] font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim hover:text-orbital-text transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sponsor List */}
      <div className="space-y-3">
        {sponsors.map((sp) => {
          const statusInfo = STATUS_INFO[sp.status] || STATUS_INFO.prospect;
          const canAdvance = sp.status in NEXT_STATUS;
          return (
            <motion.div key={sp.id} layout className="bg-[#111] border border-[#1A1A1A] p-4 group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-[family-name:var(--font-orbitron)] text-xs text-orbital-text">{sp.name}</span>
                    {sp.type && (
                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim">
                        {TYPE_OPTIONS.find(o => o.value === sp.type)?.label || sp.type}
                      </span>
                    )}
                  </div>
                  {sp.estimated_value && (
                    <div className="flex items-center gap-1 mt-1">
                      <DollarSign size={10} className="text-orbital-text-dim" />
                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">
                        {sp.estimated_value}
                      </span>
                    </div>
                  )}
                  {(sp.contact_name || sp.contact_phone || sp.contact_email) && (
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {sp.contact_name && (
                        <span className="flex items-center gap-1 font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                          <Users size={9} /> {sp.contact_name}
                        </span>
                      )}
                      {sp.contact_phone && (
                        <span className="flex items-center gap-1 font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                          <Phone size={9} /> {sp.contact_phone}
                        </span>
                      )}
                      {sp.contact_email && (
                        <span className="flex items-center gap-1 font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                          <Mail size={9} /> {sp.contact_email}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2 py-0.5 border ${statusInfo.bg} ${statusInfo.cls} font-[family-name:var(--font-jetbrains)] text-[0.6rem] rounded-sm`}>
                    {statusInfo.label}
                  </span>
                  {canAdvance && (
                    <button
                      onClick={() => advanceStatus(sp)}
                      className="flex items-center gap-1 px-2 py-1 bg-orbital-purple/10 border border-orbital-purple/30 font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-purple hover:bg-orbital-purple/20 transition-colors"
                    >
                      Avancar <ArrowRight size={10} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteSponsor(sp.id)}
                    className="opacity-0 group-hover:opacity-100 text-orbital-text-dim hover:text-red-400 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* O Que Voce Pode Oferecer */}
      <div className="bg-[#111] border border-[#1A1A1A] p-5">
        <h2 className="font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-orbital-text mb-4">
          O QUE VOCE PODE OFERECER
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-purple mb-2">Pacote Digital</h3>
            <ul className="space-y-1.5">
              {[
                "Logo no site orbitalroxa.com.br (permanente)",
                "Mencao em todos os posts do Instagram",
                "Story dedicado ao patrocinador",
                "Mencao durante transmissao ao vivo",
                "Banner nos mapas do servidor CS2",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">&#10003;</span>
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-purple mb-2">Pacote Presencial</h3>
            <ul className="space-y-1.5">
              {[
                "Banner fisico no local do evento",
                "Logo no cracha dos participantes",
                "Espaco para distribuicao de produto",
                "Mencao na cerimonia de premiacao",
                "Fotos com o produto no podio",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">&#10003;</span>
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-[#111] border border-[#1A1A1A] p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-orbital-text-dim">
            NOTAS DE PROSPECCAO
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
          value={patrocinioNote}
          onChange={(e) => setPatrocinioNote(e.target.value)}
          rows={3}
          className="w-full bg-[#0A0A0A] border border-[#1A1A1A] p-3 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text placeholder-orbital-text-dim/40 resize-none focus:outline-none focus:border-orbital-purple/40"
          placeholder="Anotacoes sobre prospeccao de patrocinadores..."
        />
      </div>
    </motion.div>
  );
}
