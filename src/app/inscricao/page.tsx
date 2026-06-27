"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, CheckCircle2, AlertCircle, Loader2, Upload, X, Check, ArrowRight, ArrowLeft } from "lucide-react";
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

const INSC_CSS = `
.insc-scene{position:relative;min-height:100vh;display:flex;flex-direction:column;background:#050407;overflow:hidden}
.insc-bg{position:absolute;inset:0;z-index:0}
.insc-bg img{width:100%;height:100%;object-fit:cover;opacity:.26;animation:insc-kb 28s ease-in-out infinite alternate}
@keyframes insc-kb{from{transform:scale(1.06)}to{transform:scale(1.16) translateY(-2%)}}
.insc-bg::after{content:'';position:absolute;inset:0;background:radial-gradient(80% 60% at 50% 28%,rgba(124,92,255,.16),transparent 60%),linear-gradient(180deg,rgba(5,4,7,.74),rgba(5,4,7,.94))}
.insc-grain{position:absolute;inset:0;z-index:1;opacity:.05;pointer-events:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.insc-enter{animation:insc-en .45s cubic-bezier(.7,0,.2,1)}
@keyframes insc-en{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
`;

const STEPS = ["Time", "Capitão", "Jogadores", "Confirmar"];

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
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [sent, setSent] = useState(false);
  const [wstep, setWstep] = useState(0);
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

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setResult({ type: "error", msg: "Use PNG, JPG ou WebP para a logo" });
      return;
    }
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

    if (captainSteamId.trim() && !isValidSteamId(captainSteamId)) {
      errors.push("Steam ID do capitão inválido");
    }

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
    if (players.length >= 6) return;
    setPlayers(prev => [...prev, { name: "", steam_id: "" }]);
  };

  const removePlayer = (idx: number) => {
    if (players.length <= 4) return;
    setPlayers(prev => prev.filter((_, i) => i !== idx));
  };

  const slotsAvailable = maxSlots - slotsUsed;

  const canSubmit =
    teamName.trim() &&
    teamTag.trim() &&
    captainName.trim() &&
    captainSteamId.trim() &&
    isValidSteamId(captainSteamId) &&
    captainWhatsapp.trim() &&
    players.filter(p => p.name.trim() && p.steam_id.trim() && isValidSteamId(p.steam_id)).length >= 4 &&
    validationErrors.length === 0 &&
    slotsUsed < maxSlots &&
    (tournaments.length <= 1 || selectedTournament) &&
    !logoUploading;

  // Validação por etapa
  const step0ok = !!teamName.trim() && !!teamTag.trim() && (tournaments.length <= 1 || !!selectedTournament) && !logoUploading;
  const step1ok = !!captainName.trim() && isValidSteamId(captainSteamId) && !!captainWhatsapp.trim();
  const validPlayers = players.filter(p => p.name.trim() && p.steam_id.trim() && isValidSteamId(p.steam_id)).length;
  const step2ok = validPlayers >= 4 && validationErrors.length === 0;
  const stepOk = [step0ok, step1ok, step2ok, !!canSubmit][wstep];

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setResult(null);

    try {
      const valid = players.filter(p => p.name.trim() && p.steam_id.trim());
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
          players: valid,
          logo_url: logoUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setResult({ type: "error", msg: data.error || "Erro ao inscrever" });
      } else {
        setSent(true);
      }
    } catch {
      setResult({ type: "error", msg: "Erro de conexão" });
    }
    setSubmitting(false);
  };

  const goNext = () => {
    if (!stepOk) return;
    if (wstep < 3) setWstep(wstep + 1);
    else handleSubmit();
  };

  const tourName = tournaments.find(t => t.id === selectedTournament)?.name || "ORBITAL ROXA";
  const inp = "w-full h-[50px] bg-white/[0.03] border border-orbital-border px-4 text-orbital-text font-[family-name:var(--font-jetbrains)] text-sm outline-none focus:border-orbital-purple focus:bg-orbital-purple/[0.06] transition-colors placeholder:text-orbital-text-dim/45";
  const lbl = "block font-[family-name:var(--font-jetbrains)] text-[0.56rem] tracking-[0.14em] uppercase text-orbital-purple-bright mb-2";

  // ===== Tela de sucesso =====
  if (sent) {
    return (
      <div className="insc-scene items-center justify-center text-center px-6">
        <style>{INSC_CSS}</style>
        <div className="insc-bg"><img src="https://raw.githubusercontent.com/ghostcap-gaming/cs2-map-images/main/cs2/de_mirage.png" alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} /></div>
        <div className="insc-grain" />
        <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 max-w-md">
          <div className="w-24 h-24 mx-auto rounded-full border-2 border-orbital-success flex items-center justify-center text-orbital-success mb-7" style={{ boxShadow: "0 0 50px -10px #3DD68C" }}>
            <Check size={44} />
          </div>
          <h1 className="font-[family-name:var(--font-russo)] uppercase text-[clamp(2rem,6vw,3.4rem)] leading-none">Inscrição enviada</h1>
          <p className="font-[family-name:var(--font-chakra)] text-orbital-text-dim mt-4">
            <b className="text-orbital-text">{teamName} [{teamTag}]</b> entrou na fila de aprovação. Confirmamos o pagamento e a vaga pelo WhatsApp do capitão.
          </p>
          <div className="mt-6 border border-orbital-border bg-white/[0.02] p-4 text-left font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim space-y-1.5">
            <div><span className="text-orbital-purple-bright">Capitão:</span> {captainName}</div>
            <div><span className="text-orbital-purple-bright">Line:</span> {players.filter(p => p.name).map(p => p.name).join(", ")}</div>
          </div>
          <Link href="/" className="inline-flex items-center gap-2 mt-7 px-7 py-3 bg-orbital-purple text-orbital-bg hover:bg-orbital-purple-bright transition-colors font-[family-name:var(--font-chakra)] font-bold text-xs tracking-[0.12em] uppercase">
            Voltar ao site
          </Link>
        </motion.div>
      </div>
    );
  }

  // ===== Inscrições encerradas =====
  const closed = slotsAvailable <= 0 && !!selectedTournament;

  return (
    <div className="insc-scene">
      <style>{INSC_CSS}</style>
      <div className="insc-bg"><img src="https://raw.githubusercontent.com/ghostcap-gaming/cs2-map-images/main/cs2/de_mirage.png" alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} /></div>
      <div className="insc-grain" />

      <div className="relative z-10 flex-1 flex flex-col w-full max-w-[940px] mx-auto px-6 sm:px-7 py-6 sm:py-7">
        {/* Topo */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-[family-name:var(--font-russo)] uppercase text-base tracking-wide">ORBITAL <span className="text-orbital-purple-bright">ROXA</span></div>
            <div className="font-[family-name:var(--font-chakra)] font-semibold text-[0.62rem] tracking-[0.26em] uppercase text-orbital-purple-bright mt-1">Inscrição · {tourName}</div>
          </div>
          <Link href="/" className="flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[0.6rem] tracking-[0.16em] uppercase text-orbital-text-dim hover:text-orbital-text transition-colors">
            <X size={13} /> Fechar
          </Link>
        </div>

        {closed ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <AlertCircle size={34} className="text-orbital-danger mb-4" />
            <h2 className="font-[family-name:var(--font-russo)] uppercase text-2xl">Inscrições encerradas</h2>
            <p className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text-dim mt-3">Todas as {maxSlots} vagas deste campeonato foram preenchidas.</p>
          </div>
        ) : (
          <>
            {/* Stepper */}
            <div className="flex items-center mt-6 mb-1">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center" style={{ flex: i < STEPS.length - 1 ? "1" : "0 0 auto" }}>
                  <button
                    onClick={() => { if (i <= wstep || (i === wstep + 1 && stepOk)) setWstep(i); }}
                    className="flex items-center gap-2.5 shrink-0"
                  >
                    <span className={`w-8 h-8 rounded-full border flex items-center justify-center font-[family-name:var(--font-russo)] text-[0.72rem] transition-all ${
                      i === wstep ? "border-orbital-purple text-orbital-purple" :
                      i < wstep ? "border-orbital-success text-orbital-success bg-orbital-success/10" :
                      "border-orbital-border-light text-orbital-text-dim bg-orbital-bg/50"
                    }`} style={i === wstep ? { boxShadow: "0 0 16px -4px #7C5CFF" } : undefined}>
                      {i < wstep ? <Check size={13} /> : i + 1}
                    </span>
                    <span className={`hidden sm:block font-[family-name:var(--font-chakra)] font-semibold text-[0.6rem] tracking-[0.16em] uppercase transition-colors ${
                      i === wstep ? "text-orbital-text" : i < wstep ? "text-orbital-purple-bright" : "text-orbital-text-dim"
                    }`}>{s}</span>
                  </button>
                  {i < STEPS.length - 1 && <span className="flex-1 h-px bg-orbital-border-light mx-3 min-w-[16px]" />}
                </div>
              ))}
            </div>
            <div className="h-[3px] bg-white/[0.07] overflow-hidden mt-3.5">
              <div className="h-full bg-gradient-to-r from-orbital-purple via-orbital-purple-bright to-orbital-warning transition-[width] duration-500" style={{ width: `${((wstep + 1) / 4) * 100}%` }} />
            </div>

            {/* Palco */}
            <div className="flex-1 flex items-center py-10">
              <div className="w-full">
                {/* STEP 0 — Time */}
                {wstep === 0 && (
                  <div className="insc-enter">
                    <div className="font-[family-name:var(--font-russo)] text-[0.8rem] text-orbital-purple-bright tracking-[0.1em]">01 / 04</div>
                    <h2 className="font-[family-name:var(--font-russo)] uppercase text-[clamp(1.8rem,5vw,3.2rem)] leading-none mt-1.5">Dados do <span className="text-orbital-purple-bright">Time</span></h2>
                    <p className="font-[family-name:var(--font-chakra)] text-orbital-text-dim mt-2 mb-7 max-w-lg">Como seu time vai aparecer nos brackets e transmissões.</p>

                    {tournaments.length > 1 && (
                      <div className="mb-5">
                        <label className={lbl}>Campeonato *</label>
                        <select value={selectedTournament} onChange={e => setSelectedTournament(e.target.value)} className={`${inp} cursor-pointer`}>
                          <option value="">Selecione...</option>
                          {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className={lbl}>Nome do time *</label><input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Ex: CHOPPADAS" className={inp} /></div>
                      <div><label className={lbl}>Tag *</label><input value={teamTag} onChange={e => setTeamTag(e.target.value.toUpperCase().slice(0, 10))} placeholder="Ex: CHOPP" maxLength={10} className={inp} /></div>
                    </div>

                    <div className="mt-4">
                      <label className={lbl}>Logo do time <span className="text-orbital-text-dim normal-case tracking-normal">(opcional)</span></label>
                      <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoUpload} className="hidden" />
                      {logoUrl ? (
                        <div className="flex items-center gap-3">
                          <div className="relative w-14 h-14 bg-white/[0.04] border border-orbital-border overflow-hidden"><Image src={logoUrl} alt="Logo" fill className="object-contain" /></div>
                          <button type="button" onClick={() => setLogoUrl("")} className="flex items-center gap-1.5 text-orbital-danger hover:opacity-80 font-[family-name:var(--font-jetbrains)] text-xs"><X size={12} /> Remover</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => logoInputRef.current?.click()} disabled={logoUploading}
                          className="w-full h-[54px] border border-dashed border-orbital-border-light hover:border-orbital-purple flex items-center justify-center gap-2.5 text-orbital-text-dim hover:text-orbital-purple-bright font-[family-name:var(--font-jetbrains)] text-xs transition-colors disabled:opacity-50">
                          {logoUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                          {logoUploading ? "Enviando..." : "Enviar logo (PNG, JPG, WebP · máx 2MB)"}
                        </button>
                      )}
                    </div>

                    {selectedTournament && (
                      <div className="mt-6 flex items-center gap-3">
                        <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] tracking-wide uppercase text-orbital-text-dim">Vagas</span>
                        <span className="flex-1 max-w-[200px] h-1.5 bg-white/[0.08] overflow-hidden">
                          <span className={`block h-full ${slotsAvailable <= 2 ? "bg-orbital-danger" : "bg-orbital-purple"}`} style={{ width: `${(slotsUsed / maxSlots) * 100}%` }} />
                        </span>
                        <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-purple-bright">{slotsUsed}/{maxSlots}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 1 — Capitão */}
                {wstep === 1 && (
                  <div className="insc-enter">
                    <div className="font-[family-name:var(--font-russo)] text-[0.8rem] text-orbital-purple-bright tracking-[0.1em]">02 / 04</div>
                    <h2 className="font-[family-name:var(--font-russo)] uppercase text-[clamp(1.8rem,5vw,3.2rem)] leading-none mt-1.5">O <span className="text-orbital-purple-bright">Capitão</span></h2>
                    <p className="font-[family-name:var(--font-chakra)] text-orbital-text-dim mt-2 mb-7 max-w-lg">Contato responsável pelo time durante o campeonato.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div><label className={lbl}>Nome / Nick *</label><input value={captainName} onChange={e => setCaptainName(e.target.value)} placeholder="nastyy" className={inp} /></div>
                      <div>
                        <label className={lbl}>Steam ID *</label>
                        <input value={captainSteamId} onChange={e => setCaptainSteamId(e.target.value)} placeholder="76561198..." className={`${inp} ${captainSteamId.trim() && !isValidSteamId(captainSteamId) ? "!border-orbital-danger" : ""}`} />
                      </div>
                      <div><label className={lbl}>WhatsApp *</label><input value={captainWhatsapp} onChange={e => setCaptainWhatsapp(e.target.value)} placeholder="16 99999-9999" className={inp} /></div>
                    </div>
                    <p className="font-[family-name:var(--font-jetbrains)] text-[0.62rem] text-orbital-text-dim mt-4">Não sabe seu Steam ID? Pegue em <span className="text-orbital-purple-bright">steamid.io</span> (formato 765611…, 17 dígitos)</p>
                  </div>
                )}

                {/* STEP 2 — Jogadores */}
                {wstep === 2 && (
                  <div className="insc-enter">
                    <div className="flex items-end justify-between gap-4 mb-7">
                      <div>
                        <div className="font-[family-name:var(--font-russo)] text-[0.8rem] text-orbital-purple-bright tracking-[0.1em]">03 / 04</div>
                        <h2 className="font-[family-name:var(--font-russo)] uppercase text-[clamp(1.8rem,5vw,3.2rem)] leading-none mt-1.5">A <span className="text-orbital-purple-bright">Line</span></h2>
                        <p className="font-[family-name:var(--font-chakra)] text-orbital-text-dim mt-2">Mínimo 4 jogadores. Até 2 reservas opcionais. <span className="text-orbital-text">{validPlayers}/4 válidos</span></p>
                      </div>
                      {players.length < 6 && (
                        <button onClick={addPlayer} className="flex items-center gap-1.5 px-3 py-2 border border-orbital-border hover:border-orbital-purple font-[family-name:var(--font-jetbrains)] text-[0.6rem] tracking-[0.12em] uppercase text-orbital-purple-bright transition-colors shrink-0">
                          <Plus size={12} /> Reserva
                        </button>
                      )}
                    </div>
                    <div className="space-y-2.5">
                      {players.map((p, idx) => {
                        const bad = p.steam_id.trim() && !isValidSteamId(p.steam_id);
                        return (
                          <div key={idx} className="grid grid-cols-[26px_1fr_1.4fr_auto] items-center gap-2.5">
                            <span className={`font-[family-name:var(--font-russo)] text-center text-sm ${idx >= 4 ? "text-orbital-warning" : "text-orbital-text-dim"}`}>{idx >= 4 ? "R" : idx + 1}</span>
                            <input value={p.name} onChange={e => updatePlayer(idx, "name", e.target.value)} placeholder={idx >= 4 ? "Nick (reserva)" : "Nick"} className={inp} />
                            <input value={p.steam_id} onChange={e => updatePlayer(idx, "steam_id", e.target.value)} placeholder="Steam ID (76561198...)" className={`${inp} ${bad ? "!border-orbital-danger" : ""}`} />
                            {idx >= 4 ? (
                              <button onClick={() => removePlayer(idx)} className="p-2 text-orbital-text-dim hover:text-orbital-danger transition-colors"><Trash2 size={13} /></button>
                            ) : <span className="w-[33px]" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* STEP 3 — Confirmar */}
                {wstep === 3 && (
                  <div className="insc-enter">
                    <div className="font-[family-name:var(--font-russo)] text-[0.8rem] text-orbital-purple-bright tracking-[0.1em]">04 / 04</div>
                    <h2 className="font-[family-name:var(--font-russo)] uppercase text-[clamp(1.8rem,5vw,3.2rem)] leading-none mt-1.5">Revisar & <span className="text-orbital-purple-bright">Enviar</span></h2>
                    <p className="font-[family-name:var(--font-chakra)] text-orbital-text-dim mt-2 mb-7 max-w-lg">Confira os dados. Você recebe a confirmação no WhatsApp do capitão.</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <ReviewBox title="Time" rows={[["Nome", teamName || "—"], ["Tag", teamTag || "—"], ["Logo", logoUrl ? "enviada" : "—"]]} />
                      <ReviewBox title="Capitão" rows={[["Nick", captainName || "—"], ["Steam ID", captainSteamId || "—"], ["WhatsApp", captainWhatsapp || "—"]]} />
                      <div className="sm:col-span-2">
                        <ReviewBox title={`Jogadores · ${validPlayers}`} rows={[
                          ["Titulares", players.slice(0, 4).filter(p => p.name).map(p => p.name).join(" · ") || "—"],
                          ["Reservas", players.slice(4).filter(p => p.name).map(p => p.name).join(" · ") || "—"],
                        ]} />
                      </div>
                    </div>

                    {validationErrors.length > 0 && (
                      <div className="mt-4 bg-orbital-warning/10 border border-orbital-warning/30 p-3 space-y-1">
                        <div className="flex items-center gap-2 font-[family-name:var(--font-russo)] text-[0.62rem] tracking-wider text-orbital-warning"><AlertCircle size={12} /> Corrija os erros</div>
                        {validationErrors.map((err, i) => <div key={i} className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-warning/80">• {err}</div>)}
                      </div>
                    )}

                    <AnimatePresence>
                      {result?.type === "error" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="mt-4 flex items-center gap-2 p-3 text-sm font-[family-name:var(--font-jetbrains)] bg-orbital-danger/10 border border-orbital-danger/30 text-orbital-danger">
                          <AlertCircle size={14} /> {result.msg}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>

            {/* Navegação */}
            <div className="flex items-center justify-between gap-4">
              <button onClick={() => wstep > 0 && setWstep(wstep - 1)} className={`flex items-center gap-2 px-6 py-3.5 border border-orbital-border font-[family-name:var(--font-chakra)] font-bold text-[0.7rem] tracking-[0.12em] uppercase text-orbital-text-dim hover:border-orbital-border-light transition-colors ${wstep === 0 ? "invisible" : ""}`}>
                <ArrowLeft size={14} /> Voltar
              </button>
              <button onClick={goNext} disabled={!stepOk || submitting}
                className="flex items-center gap-2.5 px-7 py-3.5 bg-orbital-purple text-orbital-bg hover:bg-orbital-purple-bright disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-[family-name:var(--font-chakra)] font-bold text-[0.7rem] tracking-[0.12em] uppercase">
                {submitting ? <><Loader2 size={14} className="animate-spin" /> Enviando…</> :
                 wstep === 3 ? <>Enviar inscrição <Check size={14} /></> :
                 <>Próximo <ArrowRight size={14} /></>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ReviewBox({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="border border-orbital-border bg-white/[0.02] p-4">
      <h4 className="font-[family-name:var(--font-jetbrains)] text-[0.56rem] tracking-[0.14em] uppercase text-orbital-purple-bright mb-2.5">{title}</h4>
      <div>
        {rows.map(([k, v], i) => (
          <div key={i} className="flex justify-between gap-3 py-1.5 border-b border-orbital-border/50 last:border-0 font-[family-name:var(--font-jetbrains)] text-xs">
            <span className="text-orbital-text-dim shrink-0">{k}</span>
            <span className="text-orbital-text text-right truncate">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
