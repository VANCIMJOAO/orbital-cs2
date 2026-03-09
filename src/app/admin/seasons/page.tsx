"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, Loader2, Check, AlertCircle, Calendar } from "lucide-react";
import { HudCard } from "@/components/hud-card";
import { useEffect, useState } from "react";
import { Season, createSeason, updateSeason, deleteSeason } from "@/lib/api";

export default function AdminSeasons() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Season | null>(null);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchSeasons = async () => {
    try {
      const res = await fetch("/api/seasons", { credentials: "include" });
      const data = await res.json();
      setSeasons(data.seasons || []);
    } catch { /* */ }
    setLoading(false);
  };

  useEffect(() => { fetchSeasons(); }, []);

  const resetForm = () => {
    setName("");
    setStartDate("");
    setEndDate("");
    setEditing(null);
    setShowForm(false);
    setFeedback(null);
  };

  const openEdit = (season: Season) => {
    setEditing(season);
    setName(season.name);
    setStartDate(season.start_date?.split("T")[0] || "");
    setEndDate(season.end_date?.split("T")[0] || "");
    setShowForm(true);
    setFeedback(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!name || !startDate) {
      setFeedback({ type: "error", msg: "Nome e data de início são obrigatórios." });
      return;
    }

    setSubmitting(true);
    try {
      if (editing) {
        await updateSeason({
          season_id: editing.id,
          name,
          start_date: startDate,
          end_date: endDate || undefined,
        });
        setFeedback({ type: "success", msg: `Season "${name}" atualizada!` });
      } else {
        await createSeason({
          name,
          start_date: startDate,
          end_date: endDate || undefined,
        });
        setFeedback({ type: "success", msg: `Season "${name}" criada!` });
      }
      await fetchSeasons();
      setTimeout(resetForm, 1500);
    } catch (err) {
      setFeedback({ type: "error", msg: err instanceof Error ? err.message : "Erro ao salvar season" });
    }
    setSubmitting(false);
  };

  const handleDelete = async (season: Season) => {
    if (!confirm(`Deletar season "${season.name}"?`)) return;
    setDeleting(season.id);
    try {
      await deleteSeason(season.id);
      await fetchSeasons();
    } catch {
      alert("Erro ao deletar season");
    }
    setDeleting(null);
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR");
  };

  const isActive = (season: Season) => {
    const now = new Date();
    const start = new Date(season.start_date);
    if (!season.end_date) return now >= start;
    const end = new Date(season.end_date);
    return now >= start && now <= end;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-orbital-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-[family-name:var(--font-orbitron)] text-sm font-bold text-orbital-text tracking-wider">
          SEASONS ({seasons.length})
        </h2>
        {!showForm && (
          <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-purple">
            <Plus size={14} />
            NOVA SEASON
          </button>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <HudCard label={editing ? "EDITAR SEASON" : "NOVA SEASON"} className="mb-6">
              <form onSubmit={handleSubmit} className="space-y-4 py-2">
                <div>
                  <label className="block font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] text-orbital-text-dim mb-2">NOME</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Season 1" className="w-full bg-[#0A0A0A] border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-sm px-3 py-2.5 focus:border-orbital-purple/50 focus:outline-none transition-colors placeholder:text-orbital-text-dim/30" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] text-orbital-text-dim mb-2">INÍCIO</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-[#0A0A0A] border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-sm px-3 py-2.5 focus:border-orbital-purple/50 focus:outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="block font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] text-orbital-text-dim mb-2">FIM (opcional)</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-[#0A0A0A] border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-sm px-3 py-2.5 focus:border-orbital-purple/50 focus:outline-none transition-colors" />
                  </div>
                </div>

                {feedback && (
                  <div className={`flex items-center gap-2 px-4 py-3 border font-[family-name:var(--font-jetbrains)] text-xs ${feedback.type === "success" ? "bg-orbital-success/10 border-orbital-success/30 text-orbital-success" : "bg-orbital-danger/10 border-orbital-danger/30 text-orbital-danger"}`}>
                    {feedback.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
                    {feedback.msg}
                  </div>
                )}

                <div className="flex gap-3">
                  <button type="submit" disabled={submitting} className="flex items-center gap-2 px-6 py-2.5 bg-orbital-purple/20 border border-orbital-purple/50 hover:bg-orbital-purple/30 transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-purple disabled:opacity-50">
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    {editing ? "SALVAR" : "CRIAR"}
                  </button>
                  <button type="button" onClick={resetForm} className="px-6 py-2.5 border border-orbital-border hover:border-orbital-text-dim transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-text-dim">
                    CANCELAR
                  </button>
                </div>
              </form>
            </HudCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Season List */}
      <div className="space-y-2">
        {seasons.map((season, i) => (
          <motion.div
            key={season.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`bg-orbital-card border p-4 flex items-center justify-between transition-colors ${
              isActive(season) ? "border-orbital-success/30 hover:border-orbital-success/50" : "border-orbital-border hover:border-orbital-purple/20"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 border flex items-center justify-center ${
                isActive(season) ? "bg-orbital-success/10 border-orbital-success/20" : "bg-orbital-purple/10 border-orbital-purple/20"
              }`}>
                <Calendar size={16} className={isActive(season) ? "text-orbital-success" : "text-orbital-purple"} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-[family-name:var(--font-orbitron)] text-xs font-bold text-orbital-text tracking-wider">
                    {season.name}
                  </h3>
                  {isActive(season) && (
                    <span className="px-2 py-0.5 bg-orbital-success/10 border border-orbital-success/30 font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-orbital-success">
                      ATIVA
                    </span>
                  )}
                </div>
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">
                  {formatDate(season.start_date)} → {formatDate(season.end_date)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => openEdit(season)} className="p-2 text-orbital-text-dim hover:text-orbital-purple transition-colors" title="Editar">
                <Pencil size={14} />
              </button>
              <button onClick={() => handleDelete(season)} disabled={deleting === season.id} className="p-2 text-orbital-text-dim hover:text-orbital-danger transition-colors" title="Deletar">
                {deleting === season.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          </motion.div>
        ))}

        {seasons.length === 0 && (
          <HudCard className="text-center py-8">
            <Calendar size={24} className="text-orbital-border mx-auto mb-3" />
            <p className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text-dim">Nenhuma season cadastrada</p>
          </HudCard>
        )}
      </div>
    </div>
  );
}
