"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, Trash2, CheckCircle2, AlertCircle, Loader2, ArrowLeft, Trophy, Shield, Upload, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface Player {
  name: string;
  steam_id: string;
}

// Steam64 ID validation
function isValidSteamId(steamId: string): boolean {
  return /^765611\d{11}$/.test(steamId.trim());
}

export default function InscricaoPage() {
  const [tournaments, setTournaments] = useState<{ id: string; name: string; status: string }[]>([]);
  const [selectedTournament, setSelectedTournament] = useState("");
  const [slotsUsed, setSlotsUsed] = useState(0);
  const [maxSlots, setMaxSlots] = useState(8);

  // Form
  const [teamName, setTeamName] = useState("");
  const [teamTag, setTeamTag] = useState("");
  const [captainName, setCaptainName] = useState("");
  const [captainSteamId, setCaptainSteamId] = useState("");
  const [captainWhatsapp, setCaptainWhatsapp] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [players, setPlayers] = useState<Player[]>([
    { name: "", steam_id: "" },
    { name: "", steam_id: "" },
    { name: "", steam_id: "" },
    { name: "", steam_id: "" },
    { name: "", steam_id: "" },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [step, setStep] = useState(0); // 0 = form, 1 = success
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Load tournaments
  useEffect(() => {
    fetch("/api/tournaments")
      .then(r => r.json())
      .then(d => {
        const active = (d.tournaments || []).filter((t: { status: string }) =>
          t.status === "pending" || t.status === "active"
        );
        setTournaments(active);
        if (active.length === 1) setSelectedTournament(active[0].id);
      })
      .catch(() => {});
  }, []);

  // Check slots
  useEffect(() => {
    if (!selectedTournament) return;
    fetch(`/api/inscricao?check_slots=1&tournament_id=${selectedTournament}`)
      .then(r => r.json())
      .then(d => {
        setSlotsUsed(d.count || 0);
        setMaxSlots(d.maxSlots || 8);
      })
      .catch(() => {});
  }, [selectedTournament]);

  // Upload logo handler
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setResult({ type: "error", msg: "Use PNG, JPG ou WebP para a logo" });
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setResult({ type: "error", msg: "Logo muito grande. Máximo 2MB" });
      return;
    }

    setLogoUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "logo");

      const res = await fetch("/api/inscricao/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (res.ok && data.url) {
        setLogoUrl(data.url);
      } else {
        setResult({ type: "error", msg: data.error || "Erro no upload" });
      }
    } catch {
      setResult({ type: "error", msg: "Erro de conexão no upload" });
    }
    setLogoUploading(false);
  };

  // Real-time validation
  useEffect(() => {
    const errors: string[] = [];

    // Captain Steam ID
    if (captainSteamId.trim() && !isValidSteamId(captainSteamId)) {
      errors.push("Steam ID do capitão inválido");
    }

    // Player Steam IDs
    const allSteamIds: string[] = [];
    if (captainSteamId.trim()) allSteamIds.push(captainSteamId.trim());

    players.forEach((p, idx) => {
      if (p.steam_id.trim()) {
        if (!isValidSteamId(p.steam_id)) {
          errors.push(`Jogador ${idx + 1}: Steam ID inválido`);
        }
        if (allSteamIds.includes(p.steam_id.trim())) {
          errors.push(`Jogador ${idx + 1}: Steam ID duplicado`);
        }
        allSteamIds.push(p.steam_id.trim());
      }
    });

    setValidationErrors(errors);
  }, [captainSteamId, players]);

  const updatePlayer = (idx: number, field: "name" | "steam_id", val: string) => {
    setPlayers(prev => prev.map((p, i) => i === idx ? { ...p, [field]: val } : p));
  };

  const addPlayer = () => {
    if (players.length >= 7) return;
    setPlayers(prev => [...prev, { name: "", steam_id: "" }]);
  };

  const removePlayer = (idx: number) => {
    if (players.length <= 5) return;
    setPlayers(prev => prev.filter((_, i) => i !== idx));
  };

  const canSubmit =
    teamName.trim() &&
    teamTag.trim() &&
    captainName.trim() &&
    captainSteamId.trim() &&
    isValidSteamId(captainSteamId) &&
    captainWhatsapp.trim() &&
    players.filter(p => p.name.trim() && p.steam_id.trim() && isValidSteamId(p.steam_id)).length >= 5 &&
    validationErrors.length === 0 &&
    slotsUsed < maxSlots &&
    (tournaments.length <= 1 || selectedTournament) &&
    !logoUploading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setResult(null);

    try {
      const validPlayers = players.filter(p => p.name.trim() && p.steam_id.trim());
      const res = await fetch("/api/inscricao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournament_id: selectedTournament || undefined,
          team_name: teamName.trim(),
          team_tag: teamTag.trim().toUpperCase(),
          captain_name: captainName.trim(),
          captain_steam_id: captainSteamId.trim(),
          captain_whatsapp: captainWhatsapp.trim(),
          players: validPlayers,
          logo_url: logoUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setResult({ type: "error", msg: data.error || "Erro ao inscrever" });
      } else {
        setStep(1);
      }
    } catch {
      setResult({ type: "error", msg: "Erro de conexão" });
    }
    setSubmitting(false);
  };

  const slotsAvailable = maxSlots - slotsUsed;
  const inputClass = "w-full bg-[#111] border border-orbital-border px-3 py-2.5 text-orbital-text font-[family-name:var(--font-jetbrains)] text-sm placeholder:text-orbital-text-dim/50 focus:outline-none focus:border-orbital-purple/50 transition-colors";
  const labelClass = "font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-[0.15em] text-orbital-purple mb-1 block";

  // Success screen
  if (step === 1) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
            <CheckCircle2 size={40} className="text-green-400" />
          </div>
          <h1 className="font-[family-name:var(--font-orbitron)] text-2xl tracking-wider text-orbital-text">
            INSCRIÇÃO ENVIADA
          </h1>
          <p className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text-dim">
            Sua inscrição foi recebida com sucesso! Aguarde a confirmação do admin.
            Você será notificado via WhatsApp quando for aprovado.
          </p>
          <div className="bg-[#0A0A0A] border border-orbital-border p-4 text-left space-y-2">
            <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
              <span className="text-orbital-purple">Time:</span> {teamName} [{teamTag}]
            </div>
            <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
              <span className="text-orbital-purple">Capitão:</span> {captainName}
            </div>
            <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
              <span className="text-orbital-purple">Jogadores:</span> {players.filter(p => p.name).map(p => p.name).join(", ")}
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <Link href="/" className="px-6 py-2 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-purple transition-colors">
              VOLTAR AO SITE
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <Link href="/" className="flex items-center gap-2 text-orbital-text-dim hover:text-orbital-purple transition-colors mb-4 font-[family-name:var(--font-jetbrains)] text-xs">
          <ArrowLeft size={14} /> VOLTAR
        </Link>
        <div className="flex items-center gap-3">
          <Trophy size={24} className="text-orbital-purple" />
          <div>
            <h1 className="font-[family-name:var(--font-orbitron)] text-xl tracking-wider text-orbital-text">
              INSCRIÇÃO
            </h1>
            <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim mt-0.5">
              Inscreva seu time no próximo campeonato ORBITAL ROXA
            </p>
          </div>
        </div>
      </div>

      {/* Slots indicator */}
      {selectedTournament && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
          <div className="bg-[#0A0A0A] border border-orbital-border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-wider text-orbital-text-dim">VAGAS</span>
              <span className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-purple">
                {slotsUsed}/{maxSlots}
              </span>
            </div>
            <div className="h-2 bg-[#111] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(slotsUsed / maxSlots) * 100}%` }}
                className={`h-full rounded-full ${slotsAvailable <= 2 ? "bg-red-500" : "bg-orbital-purple"}`}
              />
            </div>
            <p className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim mt-1.5">
              {slotsAvailable > 0 ? `${slotsAvailable} vagas restantes` : "INSCRIÇÕES ENCERRADAS"}
            </p>
          </div>
        </motion.div>
      )}

      {slotsAvailable <= 0 && selectedTournament ? (
        <div className="bg-red-500/10 border border-red-500/30 p-6 text-center">
          <AlertCircle size={24} className="text-red-400 mx-auto mb-2" />
          <p className="font-[family-name:var(--font-jetbrains)] text-sm text-red-400">
            Todas as vagas foram preenchidas para este campeonato.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tournament selector */}
          {tournaments.length > 1 && (
            <div>
              <label htmlFor="tournament" className={labelClass}>CAMPEONATO</label>
              <select id="tournament" value={selectedTournament} onChange={e => setSelectedTournament(e.target.value)} className={inputClass}>
                <option value="">Selecione...</option>
                {tournaments.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Team info */}
          <div className="bg-[#0A0A0A] border border-orbital-border p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={14} className="text-orbital-purple" />
              <span className="font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] text-orbital-purple">DADOS DO TIME</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="teamName" className={labelClass}>NOME DO TIME *</label>
                <input id="teamName" type="text" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Ex: CHOPPADAS" className={inputClass} />
              </div>
              <div>
                <label htmlFor="teamTag" className={labelClass}>TAG *</label>
                <input id="teamTag" type="text" value={teamTag} onChange={e => setTeamTag(e.target.value.toUpperCase().slice(0, 10))} placeholder="Ex: CHOPP" className={inputClass} maxLength={10} />
              </div>
            </div>
            <div>
              <label className={labelClass}>LOGO DO TIME (opcional)</label>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleLogoUpload}
                className="hidden"
              />
              {logoUrl ? (
                <div className="flex items-center gap-3">
                  <div className="relative w-16 h-16 bg-[#111] border border-orbital-border rounded overflow-hidden">
                    <Image src={logoUrl} alt="Logo" fill className="object-contain" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setLogoUrl("")}
                    className="flex items-center gap-1 text-red-400 hover:text-red-300 font-[family-name:var(--font-jetbrains)] text-xs"
                  >
                    <X size={12} /> Remover
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={logoUploading}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#111] border border-orbital-border hover:border-orbital-purple/50 text-orbital-text-dim font-[family-name:var(--font-jetbrains)] text-xs transition-colors disabled:opacity-50"
                >
                  {logoUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {logoUploading ? "Enviando..." : "Enviar logo (PNG, JPG, WebP)"}
                </button>
              )}
            </div>
          </div>

          {/* Captain info */}
          <div className="bg-[#0A0A0A] border border-orbital-border p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Users size={14} className="text-orbital-purple" />
              <span className="font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] text-orbital-purple">CAPITÃO (CONTATO)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="captainName" className={labelClass}>NOME/NICK *</label>
                <input id="captainName" type="text" value={captainName} onChange={e => setCaptainName(e.target.value)} placeholder="nastyy" className={inputClass} />
              </div>
              <div>
                <label htmlFor="captainSteamId" className={labelClass}>STEAM ID *</label>
                <input id="captainSteamId" type="text" value={captainSteamId} onChange={e => setCaptainSteamId(e.target.value)} placeholder="76561198..." className={inputClass} />
              </div>
              <div>
                <label htmlFor="captainWhatsapp" className={labelClass}>WHATSAPP *</label>
                <input id="captainWhatsapp" type="text" value={captainWhatsapp} onChange={e => setCaptainWhatsapp(e.target.value)} placeholder="16999999999" className={inputClass} />
              </div>
            </div>
          </div>

          {/* Players */}
          <div className="bg-[#0A0A0A] border border-orbital-border p-5 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-orbital-purple" />
                <span className="font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] text-orbital-purple">
                  JOGADORES ({players.filter(p => p.name && p.steam_id).length}/5+)
                </span>
              </div>
              {players.length < 7 && (
                <button onClick={addPlayer} className="flex items-center gap-1 text-orbital-purple hover:text-orbital-text font-[family-name:var(--font-jetbrains)] text-xs transition-colors">
                  <Plus size={12} /> RESERVA
                </button>
              )}
            </div>

            {players.map((p, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim w-4 text-right shrink-0">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={p.name}
                  onChange={e => updatePlayer(idx, "name", e.target.value)}
                  placeholder="Nick"
                  className="flex-1 bg-[#111] border border-orbital-border px-2 py-2 text-orbital-text font-[family-name:var(--font-jetbrains)] text-xs placeholder:text-orbital-text-dim/50 focus:outline-none focus:border-orbital-purple/50"
                />
                <input
                  type="text"
                  value={p.steam_id}
                  onChange={e => updatePlayer(idx, "steam_id", e.target.value)}
                  placeholder="Steam ID (76561198...)"
                  className="flex-[2] bg-[#111] border border-orbital-border px-2 py-2 text-orbital-text font-[family-name:var(--font-jetbrains)] text-xs placeholder:text-orbital-text-dim/50 focus:outline-none focus:border-orbital-purple/50"
                />
                {idx >= 5 && (
                  <button onClick={() => removePlayer(idx)} className="p-1 text-orbital-text-dim hover:text-red-400 transition-colors">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
            <p className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim/50 mt-1">
              Mínimo 5 jogadores. Até 2 reservas opcionais. Para encontrar seu Steam ID: steamid.io
            </p>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 space-y-1">
              <div className="flex items-center gap-2 font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-wider text-yellow-400">
                <AlertCircle size={12} /> CORRIJA OS ERROS
              </div>
              {validationErrors.map((err, i) => (
                <div key={i} className="font-[family-name:var(--font-jetbrains)] text-xs text-yellow-400/80">
                  • {err}
                </div>
              ))}
            </div>
          )}

          {/* Feedback */}
          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className={`flex items-center gap-2 p-3 text-sm font-[family-name:var(--font-jetbrains)] ${
                  result.type === "error" ? "bg-red-500/10 border border-red-500/30 text-red-400" : "bg-green-500/10 border border-green-500/30 text-green-400"
                }`}
              >
                {result.type === "error" ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                {result.msg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full py-3 bg-orbital-purple hover:bg-orbital-purple/80 disabled:opacity-30 disabled:cursor-not-allowed text-white font-[family-name:var(--font-orbitron)] text-sm tracking-wider transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Trophy size={16} />}
            {submitting ? "ENVIANDO..." : "INSCREVER TIME"}
          </button>

        </div>
      )}
    </div>
  );
}
