"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, X, Loader2, Check, AlertCircle, Users, Upload, ImagePlus } from "lucide-react";
import { HudCard } from "@/components/hud-card";
import { useEffect, useRef, useState } from "react";
import { Team, createTeam, updateTeam, deleteTeam } from "@/lib/api";

export default function AdminTimes() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [flag, setFlag] = useState("BR");
  const [logo, setLogo] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [players, setPlayers] = useState<{ steamId: string; name: string }[]>([{ steamId: "", name: "" }]);

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const teamsToImport = Array.isArray(data) ? data : [data];
      let imported = 0;
      for (const t of teamsToImport) {
        const auth_name: Record<string, string> = {};
        if (t.auth_name) {
          Object.entries(t.auth_name).forEach(([k, v]) => { auth_name[k] = typeof v === "string" ? v : (v as { name: string }).name; });
        } else if (t.players) {
          Object.entries(t.players).forEach(([k, v]) => { auth_name[k] = typeof v === "string" ? v : (v as { name: string }).name; });
        }
        await createTeam({
          name: t.name || t.team_name || "Imported Team",
          tag: t.tag || t.name?.substring(0, 4) || "IMP",
          flag: t.flag || "BR",
          logo: t.logo || undefined,
          public_team: t.public_team ?? true,
          auth_name,
        });
        imported++;
      }
      setFeedback({ type: "success", msg: `${imported} time(s) importado(s)!` });
      await fetchTeams();
    } catch (err) {
      setFeedback({ type: "error", msg: err instanceof Error ? err.message : "Erro ao importar" });
    }
    setImporting(false);
    e.target.value = "";
  };

  const fetchTeams = async () => {
    try {
      const res = await fetch("/api/teams", { credentials: "include" });
      const data = await res.json();
      setTeams(data.teams || []);
    } catch { /* */ }
    setLoading(false);
  };

  useEffect(() => { fetchTeams(); }, []);

  const resetForm = () => {
    setName("");
    setTag("");
    setFlag("BR");
    setLogo("");
    setIsPublic(true);
    setPlayers([{ steamId: "", name: "" }]);
    setEditing(null);
    setShowForm(false);
    setFeedback(null);
  };

  const openEdit = (team: Team) => {
    setEditing(team);
    setName(team.name);
    setTag(team.tag);
    setFlag(team.flag || "BR");
    setLogo(team.logo || "");
    setIsPublic(team.public_team);
    const entries = Object.entries(team.auth_name || {});
    setPlayers(entries.length > 0 ? entries.map(([steamId, val]) => ({ steamId, name: typeof val === "string" ? val : val.name })) : [{ steamId: "", name: "" }]);
    setShowForm(true);
    setFeedback(null);
  };

  const addPlayer = () => setPlayers([...players, { steamId: "", name: "" }]);
  const removePlayer = (i: number) => setPlayers(players.filter((_, idx) => idx !== i));
  const updatePlayer = (i: number, field: "steamId" | "name", val: string) => {
    const updated = [...players];
    updated[i][field] = val;
    setPlayers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!name || !tag) {
      setFeedback({ type: "error", msg: "Nome e tag são obrigatórios." });
      return;
    }

    const auth_name: Record<string, string> = {};
    players.forEach(p => {
      if (p.steamId.trim()) auth_name[p.steamId.trim()] = p.name.trim() || p.steamId.trim();
    });

    setSubmitting(true);
    try {
      if (editing) {
        await updateTeam({ team_id: editing.id, name, tag, flag, logo: logo || undefined, public_team: isPublic, auth_name });
        setFeedback({ type: "success", msg: `Time "${name}" atualizado!` });
      } else {
        await createTeam({ name, tag, flag, logo: logo || undefined, public_team: isPublic, auth_name });
        setFeedback({ type: "success", msg: `Time "${name}" criado!` });
      }
      await fetchTeams();
      setTimeout(resetForm, 1500);
    } catch (err) {
      setFeedback({ type: "error", msg: err instanceof Error ? err.message : "Erro ao salvar time" });
    }
    setSubmitting(false);
  };

  const handleDelete = async (team: Team) => {
    if (!confirm(`Deletar time "${team.name}"?`)) return;
    setDeleting(team.id);
    try {
      await deleteTeam(team.id);
      await fetchTeams();
    } catch {
      alert("Erro ao deletar time");
    }
    setDeleting(null);
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-[family-name:var(--font-orbitron)] text-sm font-bold text-orbital-text tracking-wider">
          TIMES ({teams.length})
        </h2>
        {!showForm && (
          <div className="flex items-center gap-2">
            <label className={`flex items-center gap-2 px-4 py-2 border transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider cursor-pointer ${
              importing ? "bg-orbital-purple/5 border-orbital-border text-orbital-text-dim" : "bg-orbital-card border-orbital-border hover:border-orbital-purple/40 text-orbital-text-dim hover:text-orbital-purple"
            }`}>
              <Upload size={14} />
              {importing ? "IMPORTANDO..." : "IMPORTAR"}
              <input type="file" accept=".json" onChange={handleImport} className="hidden" disabled={importing} />
            </label>
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-purple"
            >
              <Plus size={14} />
              NOVO TIME
            </button>
          </div>
        )}
      </div>

      {/* Hidden file input - outside AnimatePresence to avoid overflow-hidden issues */}
      <input
        ref={logoInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        className="hidden"
        disabled={uploadingLogo}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setUploadingLogo(true);
          try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Erro no upload");
            setLogo(data.url);
          } catch (err) {
            setFeedback({ type: "error", msg: err instanceof Error ? err.message : "Erro ao enviar logo" });
          }
          setUploadingLogo(false);
          e.target.value = "";
        }}
      />

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <HudCard label={editing ? "EDITAR TIME" : "NOVO TIME"} className="mb-6">
              <form onSubmit={handleSubmit} className="space-y-4 py-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] text-orbital-text-dim mb-2">NOME</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nome do time" className="w-full bg-[#0A0A0A] border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-sm px-3 py-2.5 focus:border-orbital-purple/50 focus:outline-none transition-colors placeholder:text-orbital-text-dim/30" />
                  </div>
                  <div>
                    <label className="block font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] text-orbital-text-dim mb-2">TAG</label>
                    <input type="text" value={tag} onChange={e => setTag(e.target.value)} placeholder="TAG" maxLength={5} className="w-full bg-[#0A0A0A] border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-sm px-3 py-2.5 focus:border-orbital-purple/50 focus:outline-none transition-colors placeholder:text-orbital-text-dim/30" />
                  </div>
                  <div>
                    <label className="block font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] text-orbital-text-dim mb-2">PAÍS</label>
                    <input type="text" value={flag} onChange={e => setFlag(e.target.value)} placeholder="BR" maxLength={2} className="w-full bg-[#0A0A0A] border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-sm px-3 py-2.5 focus:border-orbital-purple/50 focus:outline-none transition-colors placeholder:text-orbital-text-dim/30" />
                  </div>
                </div>

                <div>
                  <label className="block font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] text-orbital-text-dim mb-2">LOGO</label>
                  <div className="flex items-center gap-3">
                    {logo ? (
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 bg-[#0A0A0A] border border-orbital-border flex items-center justify-center shrink-0">
                          <img src={logo} alt="Logo" className="w-10 h-10 object-contain" />
                        </div>
                        <button
                          type="button"
                          onClick={() => setLogo("")}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-orbital-danger/30 text-orbital-danger hover:bg-orbital-danger/10 transition-all font-[family-name:var(--font-jetbrains)] text-[0.6rem]"
                        >
                          <Trash2 size={12} /> Remover
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className={`flex items-center gap-2 px-4 py-3 border border-dashed transition-all w-full justify-center ${
                          uploadingLogo ? "border-orbital-purple/50 bg-orbital-purple/5" : "border-orbital-border hover:border-orbital-purple/40 hover:bg-orbital-purple/5 cursor-pointer"
                        }`}
                      >
                        {uploadingLogo ? (
                          <Loader2 size={16} className="text-orbital-purple animate-spin" />
                        ) : (
                          <ImagePlus size={16} className="text-orbital-text-dim" />
                        )}
                        <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
                          {uploadingLogo ? "Enviando..." : "Clique para enviar logo"}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="w-4 h-4 accent-orbital-purple" />
                  <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text">Time público</span>
                </label>

                {/* Players */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] text-orbital-text-dim">JOGADORES</label>
                    <button type="button" onClick={addPlayer} className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-purple hover:text-orbital-purple/80">
                      + Adicionar
                    </button>
                  </div>
                  <div className="space-y-2">
                    {players.map((p, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="text" value={p.steamId} onChange={e => updatePlayer(i, "steamId", e.target.value)}
                          placeholder="Steam64 ID" className="flex-1 bg-[#0A0A0A] border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-xs px-3 py-2 focus:border-orbital-purple/50 focus:outline-none transition-colors placeholder:text-orbital-text-dim/30"
                        />
                        <input
                          type="text" value={p.name} onChange={e => updatePlayer(i, "name", e.target.value)}
                          placeholder="Nick" className="flex-1 bg-[#0A0A0A] border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-xs px-3 py-2 focus:border-orbital-purple/50 focus:outline-none transition-colors placeholder:text-orbital-text-dim/30"
                        />
                        {players.length > 1 && (
                          <button type="button" onClick={() => removePlayer(i)} className="px-2 text-orbital-danger/50 hover:text-orbital-danger transition-colors">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {feedback && (
                  <div className={`flex items-center gap-2 px-4 py-3 border font-[family-name:var(--font-jetbrains)] text-xs ${
                    feedback.type === "success" ? "bg-orbital-success/10 border-orbital-success/30 text-orbital-success" : "bg-orbital-danger/10 border-orbital-danger/30 text-orbital-danger"
                  }`}>
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

      {/* Team List */}
      <div className="space-y-2">
        {teams.map((team, i) => (
          <motion.div
            key={team.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-orbital-card border border-orbital-border p-4 flex items-center justify-between hover:border-orbital-purple/20 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-orbital-purple/10 border border-orbital-purple/20 flex items-center justify-center">
                {team.logo ? (
                  <img src={team.logo} alt={team.name} className="w-7 h-7 object-contain" />
                ) : (
                  <Users size={16} className="text-orbital-purple" />
                )}
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-orbitron)] text-xs font-bold text-orbital-text tracking-wider">
                  {team.name}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">[{team.tag}]</span>
                  {team.flag && <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">{team.flag}</span>}
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim/50">
                    {Object.keys(team.auth_name || {}).length} jogadores
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => openEdit(team)} className="p-2 text-orbital-text-dim hover:text-orbital-purple transition-colors" title="Editar">
                <Pencil size={14} />
              </button>
              <button onClick={() => handleDelete(team)} disabled={deleting === team.id} className="p-2 text-orbital-text-dim hover:text-orbital-danger transition-colors" title="Deletar">
                {deleting === team.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          </motion.div>
        ))}

        {teams.length === 0 && (
          <HudCard className="text-center py-8">
            <Users size={24} className="text-orbital-border mx-auto mb-3" />
            <p className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text-dim">Nenhum time cadastrado</p>
          </HudCard>
        )}
      </div>
    </div>
  );
}
