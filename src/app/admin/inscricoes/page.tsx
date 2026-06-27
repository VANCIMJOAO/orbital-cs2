"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Users, CheckCircle2, XCircle, Clock, Loader2, Trash2, ExternalLink, UserPlus, Upload, Image as ImageIcon, Trophy } from "lucide-react";
import Image from "next/image";
import { getTargetTournament, type TournamentLite } from "@/lib/confirmados";

interface Inscricao {
  id: number;
  tournament_id: string | null;
  team_name: string;
  team_tag: string;
  captain_name: string;
  captain_steam_id: string;
  captain_whatsapp: string;
  players: { name: string; steam_id: string }[];
  logo_url: string | null;
  pix_comprovante_url: string | null;
  team_id: number | null;
  status: "pendente" | "aprovado" | "rejeitado" | "pago";
  notes: string | null;
  created_at: string;
}

const statusConfig = {
  pendente: { color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30", icon: Clock, label: "PENDENTE" },
  aprovado: { color: "text-green-400", bg: "bg-green-500/10 border-green-500/30", icon: CheckCircle2, label: "APROVADO" },
  pago: { color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30", icon: CheckCircle2, label: "PAGO" },
  rejeitado: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", icon: XCircle, label: "REJEITADO" },
};

export default function InscricoesAdminPage() {
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  const [tournaments, setTournaments] = useState<TournamentLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const pixInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const [inscRes, tourRes] = await Promise.all([
        fetch("/api/inscricao", { credentials: "include" }).then(r => r.json()).catch(() => ({ inscricoes: [] })),
        fetch("/api/tournaments").then(r => r.json()).catch(() => ({ tournaments: [] })),
      ]);
      setInscricoes((inscRes.inscricoes || []).map((i: Inscricao) => ({
        ...i,
        players: typeof i.players === "string" ? JSON.parse(i.players) : i.players,
      })));
      setTournaments(tourRes.tournaments || []);
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateStatus = async (id: number, status: string) => {
    setActionLoading(id);
    await fetch("/api/inscricao", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    await fetchData();
    setActionLoading(null);
  };

  const moveToTournament = async (id: number, tournamentId: string) => {
    setActionLoading(id);
    await fetch("/api/inscricao", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, tournament_id: tournamentId || null }),
    });
    await fetchData();
    setActionLoading(null);
  };

  const deleteInscricao = async (id: number) => {
    if (!confirm("Deletar esta inscrição?")) return;
    setActionLoading(id);
    await fetch(`/api/inscricao?id=${id}`, { method: "DELETE", credentials: "include" });
    await fetchData();
    setActionLoading(null);
  };

  const uploadComprovante = async (id: number, file: File) => {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      alert("Use PNG, JPG ou WebP");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Arquivo muito grande. Máximo 5MB");
      return;
    }

    setUploadingId(id);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "comprovante");

      const uploadRes = await fetch("/api/inscricao/upload", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData.url) {
        alert(uploadData.error || "Erro no upload");
        setUploadingId(null);
        return;
      }

      // Save the URL to the inscription
      await fetch("/api/inscricao", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, pix_comprovante_url: uploadData.url }),
      });

      await fetchData();
    } catch {
      alert("Erro de conexão");
    }
    setUploadingId(null);
  };

  const registerTeam = async (insc: Inscricao) => {
    setActionLoading(insc.id);
    // Aprova a inscrição e grava o team_id do G5API (liga inscrição → time)
    const approve = async (tid: number | null) => {
      await fetch("/api/inscricao", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: insc.id, status: "aprovado", team_id: tid }),
      });
      await fetchData();
    };
    try {
      // Roster completo = capitão + jogadores. O capitão vem SEPARADO na inscrição
      // (não está dentro de insc.players), por isso antes sumia do cadastro do time.
      const seen = new Set<string>();
      const roster: { steam_id: string; name: string }[] = [];
      const pushPlayer = (steam_id: string, name: string) => {
        if (!steam_id || seen.has(steam_id)) return;
        seen.add(steam_id);
        roster.push({ steam_id, name: name || steam_id });
      };
      pushPlayer(insc.captain_steam_id, insc.captain_name);
      for (const p of insc.players) pushPlayer(p.steam_id, p.name);

      // auth_name no formato rico do G5API (preserva a flag de capitão)
      const authName: Record<string, { name: string; captain: number; coach: number }> = {};
      for (const p of roster) {
        authName[p.steam_id] = { name: p.name, captain: p.steam_id === insc.captain_steam_id ? 1 : 0, coach: 0 };
      }

      // Procura time já cadastrado (ex: jogou campeonato anterior) comparando o roster.
      // 3+ Steam IDs em comum = mesmo time.
      let matchedTeam: { id: number; name: string } | null = null;
      try {
        const teamsRes = await fetch("/api/teams", { credentials: "include" });
        const teamsData = await teamsRes.json();
        for (const t of (teamsData.teams || [])) {
          const overlap = Object.keys(t.auth_name || {}).filter(id => seen.has(id)).length;
          if (overlap >= 3) { matchedTeam = t; break; }
        }
      } catch { /* sem lista de times: segue criando um novo */ }

      let teamId: number | null = null;

      if (matchedTeam) {
        // Time já existe → só adiciona/atualiza jogadores (G5API faz upsert, nunca remove).
        const res = await fetch("/write-proxy/teams", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([{ id: matchedTeam.id, auth_name: authName }]),
        });
        if (!res.ok) { alert("Erro ao atualizar o time existente no G5API"); setActionLoading(null); return; }
        await approve(matchedTeam.id);
        alert(`Time já existia — jogadores sincronizados em "${matchedTeam.name}". Nenhum time duplicado foi criado.`);
        setActionLoading(null);
        return;
      }

      // Time novo → cria já com o roster completo (capitão incluído).
      const res = await fetch("/write-proxy/teams", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{
          name: insc.team_name,
          tag: insc.team_tag,
          flag: "BR",
          public_team: true,
          auth_name: authName,
        }]),
      });

      if (!res.ok) { alert("Erro ao cadastrar time no G5API"); setActionLoading(null); return; }

      const data = await res.json().catch(() => ({}));
      teamId = data?.id ?? data?.team?.id ?? null;

      // Logo: G5API não aceita logo via URL — grava direto na coluna team.logo.
      if (teamId && insc.logo_url) {
        await fetch("/api/team-logo", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamId, logoUrl: insc.logo_url }),
        });
      }

      await approve(teamId);
      alert(`Time "${insc.team_name}" cadastrado no G5API com ${roster.length} jogadores${teamId && insc.logo_url ? " e logo" : ""}!`);
    } catch {
      alert("Erro de conexão");
    }
    setActionLoading(null);
  };

  const pendentes = inscricoes.filter(i => i.status === "pendente").length;
  const aprovados = inscricoes.filter(i => i.status === "aprovado" || i.status === "pago").length;

  // Camp alvo (ativo/aberto) — sinaliza quem se inscreveu pra ele
  const tourMap = new Map(tournaments.map(t => [t.id, t]));
  const target = getTargetTournament(tournaments);
  const targetInscricoes = target ? inscricoes.filter(i => i.tournament_id === target.id) : [];
  const targetConfirmed = targetInscricoes.filter(i => i.status === "aprovado" || i.status === "pago").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="text-orbital-purple animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users size={18} className="text-orbital-purple" />
          <div>
            <h1 className="font-[family-name:var(--font-russo)] text-lg tracking-wider text-orbital-text">INSCRIÇÕES</h1>
            <p className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
              {pendentes} pendentes — {aprovados} aprovados — {inscricoes.length} total
            </p>
          </div>
        </div>
      </div>

      {/* Camp alvo — times confirmados pro campeonato ativo */}
      {target && (
        <div className="flex items-center gap-3 bg-orbital-purple/[0.07] border border-orbital-purple/30 p-3">
          <Trophy size={18} className="text-orbital-purple shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-[family-name:var(--font-russo)] text-xs tracking-wider text-orbital-text">
              CAMP ATIVO: {target.name}
              <span className="ml-2 font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-purple">
                {target.status === "active" ? "EM ANDAMENTO" : "INSCRIÇÕES ABERTAS"}
              </span>
            </div>
            <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">
              {targetConfirmed} confirmados — {targetInscricoes.length} inscritos no total
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {(["pendente", "aprovado", "pago", "rejeitado"] as const).map(s => {
          const cfg = statusConfig[s];
          const count = inscricoes.filter(i => i.status === s).length;
          return (
            <div key={s} className={`bg-[#0A0A0A] border p-3 ${cfg.bg}`}>
              <div className={`font-[family-name:var(--font-russo)] text-[0.65rem] tracking-wider ${cfg.color}`}>{cfg.label}</div>
              <div className="font-[family-name:var(--font-jetbrains)] text-xl text-orbital-text mt-1">{count}</div>
            </div>
          );
        })}
      </div>

      {/* List */}
      <div className="space-y-2">
        {inscricoes.length === 0 && (
          <div className="bg-[#0A0A0A] border border-orbital-border p-8 text-center">
            <Users size={24} className="text-orbital-text-dim mx-auto mb-2" />
            <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">Nenhuma inscrição recebida</p>
          </div>
        )}

        {/* Preview Modal */}
        {previewUrl && (
          <div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setPreviewUrl(null)}
          >
            <div className="relative max-w-2xl max-h-[80vh] overflow-auto bg-[#0A0A0A] border border-orbital-border p-2">
              <Image src={previewUrl} alt="Comprovante" width={600} height={800} className="object-contain" />
              <button
                onClick={() => setPreviewUrl(null)}
                className="absolute top-2 right-2 p-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded"
              >
                <XCircle size={20} />
              </button>
            </div>
          </div>
        )}

        {inscricoes.map((insc, idx) => {
          const cfg = statusConfig[insc.status];
          const Icon = cfg.icon;
          const expanded = expandedId === insc.id;
          const isLoading = actionLoading === insc.id;

          return (
            <motion.div
              key={insc.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className={`bg-[#0A0A0A] border ${cfg.bg} overflow-hidden`}
            >
              {/* Row */}
              <button
                onClick={() => setExpandedId(expanded ? null : insc.id)}
                className="w-full flex items-center gap-3 p-3 hover:bg-white/[0.02] transition-colors text-left"
              >
                <Icon size={14} className={cfg.color} />
                <div className="flex-1 min-w-0">
                  <div className="font-[family-name:var(--font-russo)] text-xs tracking-wider text-orbital-text flex items-center gap-2">
                    {insc.team_name} <span className="text-orbital-text-dim">[{insc.team_tag}]</span>
                    {target && insc.tournament_id === target.id && (
                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] px-1.5 py-0.5 bg-orbital-purple/15 text-orbital-purple border border-orbital-purple/30">CAMP ATIVO</span>
                    )}
                  </div>
                  <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim flex items-center gap-1.5">
                    <Trophy size={9} className="text-orbital-text-dim/60" />
                    {insc.tournament_id ? (tourMap.get(insc.tournament_id)?.name ?? "Campeonato removido") : "Sem campeonato"}
                    <span className="text-orbital-text-dim/40">·</span>
                    Capitão: {insc.captain_name} — {insc.players.length} jogadores — {new Date(insc.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <span className={`font-[family-name:var(--font-jetbrains)] text-[0.65rem] px-2 py-0.5 ${cfg.bg} ${cfg.color}`}>
                  {cfg.label}
                </span>
              </button>

              {/* Expanded */}
              {expanded && (
                <div className="border-t border-orbital-border/30 p-4 space-y-3">
                  {/* Campeonato — mover/atribuir a inscrição */}
                  <div className="flex items-center gap-2 flex-wrap bg-[#111] border border-orbital-border p-2.5">
                    <Trophy size={12} className="text-orbital-purple shrink-0" />
                    <span className="font-[family-name:var(--font-russo)] text-[0.6rem] tracking-wider text-orbital-purple">CAMPEONATO</span>
                    <select
                      value={insc.tournament_id ?? ""}
                      onChange={(e) => moveToTournament(insc.id, e.target.value)}
                      disabled={isLoading}
                      className="flex-1 min-w-[180px] bg-[#0A0A0A] border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-xs px-2 py-1.5 focus:border-orbital-purple/50 focus:outline-none transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <option value="">— Sem campeonato —</option>
                      {tournaments.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}{t.status === "active" ? " (ativo)" : t.status === "pending" ? " (aberto)" : t.status === "finished" ? " (finalizado)" : ""}
                        </option>
                      ))}
                    </select>
                    {isLoading && <Loader2 size={12} className="animate-spin text-orbital-purple" />}
                  </div>

                  {/* Logo and Team Info */}
                  <div className="flex gap-4">
                    {insc.logo_url && (
                      <div className="relative w-16 h-16 bg-[#111] border border-orbital-border rounded overflow-hidden shrink-0">
                        <Image src={insc.logo_url} alt="Logo" fill className="object-contain" />
                      </div>
                    )}
                    <div className="flex-1 grid grid-cols-3 gap-3">
                      <div>
                        <div className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-wider text-orbital-purple mb-0.5">WHATSAPP</div>
                        <a href={`https://wa.me/55${insc.captain_whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text hover:text-orbital-purple flex items-center gap-1">
                          {insc.captain_whatsapp} <ExternalLink size={10} />
                        </a>
                      </div>
                      <div>
                        <div className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-wider text-orbital-purple mb-0.5">STEAM ID CAPITÃO</div>
                        <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text">{insc.captain_steam_id}</span>
                      </div>
                      <div>
                        <div className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-wider text-orbital-purple mb-0.5">LOGO</div>
                        <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">{insc.logo_url ? "✓" : "—"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Players */}
                  <div>
                    <div className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-wider text-orbital-purple mb-1">JOGADORES</div>
                    <div className="space-y-1">
                      {insc.players.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-xs">
                          <span className="text-orbital-text-dim w-3">{i + 1}</span>
                          <span className="text-orbital-text">{p.name}</span>
                          <span className="text-orbital-text-dim/50">{p.steam_id}</span>
                          {p.steam_id === insc.captain_steam_id && <span className="text-[0.65rem] text-orbital-purple">(C)</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Comprovante PIX */}
                  {(insc.status === "aprovado" || insc.status === "pago") && (
                    <div className="bg-[#111] border border-orbital-border p-3">
                      <div className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-wider text-orbital-purple mb-2">
                        COMPROVANTE PIX
                      </div>
                      {insc.pix_comprovante_url ? (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setPreviewUrl(insc.pix_comprovante_url)}
                            className="flex items-center gap-2 text-green-400 hover:text-green-300 font-[family-name:var(--font-jetbrains)] text-xs"
                          >
                            <ImageIcon size={14} /> Ver comprovante
                          </button>
                          <span className="text-green-400 text-xs">✓ Anexado</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) uploadComprovante(insc.id, file);
                            }}
                            className="hidden"
                            id={`pix-${insc.id}`}
                          />
                          <label
                            htmlFor={`pix-${insc.id}`}
                            className={`flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 hover:border-yellow-500/60 text-yellow-400 font-[family-name:var(--font-jetbrains)] text-xs cursor-pointer transition-colors ${uploadingId === insc.id ? "opacity-50 pointer-events-none" : ""}`}
                          >
                            {uploadingId === insc.id ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                            {uploadingId === insc.id ? "Enviando..." : "Anexar comprovante"}
                          </label>
                          <span className="text-yellow-400/60 text-xs">Pendente</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-orbital-border/20">
                    {insc.status === "pendente" && (
                      <>
                        <button
                          onClick={() => registerTeam(insc)}
                          disabled={isLoading}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/30 hover:border-green-500/60 text-green-400 font-[family-name:var(--font-jetbrains)] text-xs transition-colors disabled:opacity-40"
                        >
                          {isLoading ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
                          APROVAR + CADASTRAR
                        </button>
                        <button
                          onClick={() => updateStatus(insc.id, "rejeitado")}
                          disabled={isLoading}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 hover:border-red-500/60 text-red-400 font-[family-name:var(--font-jetbrains)] text-xs transition-colors disabled:opacity-40"
                        >
                          <XCircle size={12} /> REJEITAR
                        </button>
                      </>
                    )}
                    {insc.status === "aprovado" && (
                      <button
                        onClick={() => updateStatus(insc.id, "pago")}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 hover:border-blue-500/60 text-blue-400 font-[family-name:var(--font-jetbrains)] text-xs transition-colors disabled:opacity-40"
                      >
                        {isLoading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                        MARCAR PAGO
                      </button>
                    )}
                    <button
                      onClick={() => deleteInscricao(insc.id)}
                      disabled={isLoading}
                      className="ml-auto flex items-center gap-1 px-2 py-1.5 text-orbital-text-dim hover:text-red-400 font-[family-name:var(--font-jetbrains)] text-xs transition-colors disabled:opacity-40"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
