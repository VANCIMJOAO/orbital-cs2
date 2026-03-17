"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Loader2,
  Check,
  AlertCircle,
  Gamepad2,
  ExternalLink,
  RefreshCw,
  Trash2,
  Search,
  Download,
  Crosshair,
  Skull,
  Target,
  Trophy,
  Swords,
  Clock,
  Link2,
} from "lucide-react";
import { HudCard } from "@/components/hud-card";
import { useEffect, useState } from "react";
import type { MappedMatch, MappedPlayerStats } from "@/lib/faceit-mapper";

interface FaceitMatchRow extends MappedMatch {
  demo_downloaded?: boolean;
  highlights_processed?: boolean;
}

export default function AdminFaceit() {
  const [matches, setMatches] = useState<FaceitMatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [importId, setImportId] = useState("");
  const [tournamentId, setTournamentId] = useState("");
  const [importing, setImporting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchMatches = async () => {
    try {
      const res = await fetch("/api/faceit/match", { credentials: "include" });
      const data = await res.json();
      setMatches(data.matches || []);
    } catch { /* */ }
    setLoading(false);
  };

  useEffect(() => { fetchMatches(); }, []);

  const handleImport = async () => {
    if (!importId.trim()) return;
    setImporting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/faceit/match", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          faceit_match_id: importId.trim(),
          tournament_id: tournamentId.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao importar");
      setFeedback({ type: "success", msg: `Partida importada: ${data.match.team1_name} vs ${data.match.team2_name}` });
      setImportId("");
      fetchMatches();
    } catch (err) {
      setFeedback({ type: "error", msg: err instanceof Error ? err.message : "Erro" });
    }
    setImporting(false);
  };

  const statusColors: Record<string, string> = {
    live: "text-red-400",
    finished: "text-green-400",
    cancelled: "text-orbital-text-dim",
    pending: "text-yellow-400",
  };

  const statusLabels: Record<string, string> = {
    live: "AO VIVO",
    finished: "FINALIZADA",
    cancelled: "CANCELADA",
    pending: "PENDENTE",
  };

  const topPlayer = (maps: MappedMatch["maps"]): MappedPlayerStats | null => {
    const all: MappedPlayerStats[] = [];
    for (const m of maps) all.push(...m.player_stats);
    if (all.length === 0) return null;
    return all.reduce((best, p) => (p.kills > best.kills ? p : best), all[0]);
  };

  return (
    <div className="space-y-6">
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-orbitron)] text-lg tracking-wider text-orbital-text flex items-center gap-2">
            <Gamepad2 size={20} className="text-[#FF5500]" />
            FACEIT
          </h1>
          <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim mt-1">
            Importar e gerenciar partidas da Faceit
          </p>
        </div>
        <button
          onClick={fetchMatches}
          className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] border border-orbital-border hover:border-orbital-purple/40 transition-all font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim hover:text-orbital-text"
        >
          <RefreshCw size={12} /> Atualizar
        </button>
      </div>

      {/* ═══ IMPORTAR PARTIDA ═══ */}
      <HudCard>
        <div className="p-5">
          <h2 className="font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-orbital-text mb-4 flex items-center gap-2">
            <Plus size={14} className="text-orbital-purple" />
            IMPORTAR PARTIDA
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim mb-1 block">
                Match ID da Faceit
              </label>
              <input
                type="text"
                placeholder="1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={importId}
                onChange={(e) => setImportId(e.target.value)}
                className="w-full bg-black/40 border border-orbital-border px-3 py-2 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text placeholder:text-orbital-text-dim/30 focus:border-orbital-purple/50 focus:outline-none transition-colors"
              />
            </div>
            <div className="w-full sm:w-48">
              <label className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim mb-1 block">
                Campeonato (opcional)
              </label>
              <input
                type="text"
                placeholder="ID do campeonato"
                value={tournamentId}
                onChange={(e) => setTournamentId(e.target.value)}
                className="w-full bg-black/40 border border-orbital-border px-3 py-2 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text placeholder:text-orbital-text-dim/30 focus:border-orbital-purple/50 focus:outline-none transition-colors"
              />
            </div>
            <button
              onClick={handleImport}
              disabled={importing || !importId.trim()}
              className="self-end px-5 py-2 bg-[#FF5500]/10 border border-[#FF5500]/30 hover:border-[#FF5500]/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-[family-name:var(--font-orbitron)] text-xs text-[#FF5500] flex items-center gap-2"
            >
              {importing ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              IMPORTAR
            </button>
          </div>

          <p className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim/50 mt-3">
            Cole o match ID da URL da Faceit (ex: faceit.com/pt/cs2/room/<span className="text-orbital-text-dim">1-abc123...</span>)
          </p>

          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mt-3 flex items-center gap-2 text-xs font-[family-name:var(--font-jetbrains)] ${
                  feedback.type === "success" ? "text-green-400" : "text-red-400"
                }`}
              >
                {feedback.type === "success" ? <Check size={12} /> : <AlertCircle size={12} />}
                {feedback.msg}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </HudCard>

      {/* ═══ STATS RESUMO ═══ */}
      {!loading && matches.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: matches.length, icon: Swords },
            { label: "Finalizadas", value: matches.filter(m => m.status === "finished").length, icon: Check },
            { label: "Ao Vivo", value: matches.filter(m => m.status === "live").length, icon: Clock },
            { label: "Com Demo", value: matches.filter(m => m.demo_urls.length > 0).length, icon: Download },
          ].map((s) => (
            <div key={s.label} className="bg-orbital-card border border-orbital-border p-3">
              <div className="flex items-center gap-2 mb-1">
                <s.icon size={12} className="text-orbital-text-dim/50" />
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim">{s.label}</span>
              </div>
              <span className="font-[family-name:var(--font-orbitron)] text-lg text-orbital-text">{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* ═══ LISTA DE PARTIDAS ═══ */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-orbital-purple" />
        </div>
      ) : matches.length === 0 ? (
        <HudCard>
          <div className="p-12 text-center">
            <Gamepad2 size={32} className="text-orbital-text-dim/20 mx-auto mb-3" />
            <p className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text-dim">
              Nenhuma partida Faceit importada
            </p>
            <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim/50 mt-1">
              Use o formulário acima ou configure webhooks para importar automaticamente
            </p>
          </div>
        </HudCard>
      ) : (
        <div className="space-y-2">
          {matches.map((match) => {
            const isExpanded = expanded === match.faceit_match_id;
            const best = topPlayer(match.maps);
            return (
              <motion.div
                key={match.faceit_match_id}
                layout
                className="bg-orbital-card border border-orbital-border hover:border-orbital-border/80 transition-colors"
              >
                {/* Match Row */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : match.faceit_match_id)}
                  className="w-full p-4 flex items-center gap-4 text-left"
                >
                  {/* Status */}
                  <div className={`font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider w-20 shrink-0 ${statusColors[match.status]}`}>
                    {match.status === "live" && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mr-1" />
                    )}
                    {statusLabels[match.status] || match.status.toUpperCase()}
                  </div>

                  {/* Teams */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className={`font-[family-name:var(--font-jetbrains)] text-sm truncate ${match.winner === "team1" ? "text-green-400" : "text-orbital-text"}`}>
                        {match.team1_name}
                      </span>
                      <span className="font-[family-name:var(--font-orbitron)] text-xs text-orbital-text-dim shrink-0">
                        {match.team1_score} — {match.team2_score}
                      </span>
                      <span className={`font-[family-name:var(--font-jetbrains)] text-sm truncate ${match.winner === "team2" ? "text-green-400" : "text-orbital-text"}`}>
                        {match.team2_name}
                      </span>
                    </div>
                    {/* Maps line */}
                    {match.maps.length > 0 && (
                      <div className="flex items-center gap-2 mt-1">
                        {match.maps.map((m, i) => (
                          <span key={i} className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim/60">
                            {m.map_name.replace("de_", "")} {m.team1_score}-{m.team2_score}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Best player */}
                  {best && (
                    <div className="hidden sm:flex items-center gap-2 shrink-0">
                      <Trophy size={10} className="text-yellow-500/60" />
                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                        {best.nickname} ({best.kills}K)
                      </span>
                    </div>
                  )}

                  {/* Date */}
                  <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim/50 shrink-0 w-16 text-right">
                    {match.end_time
                      ? new Date(match.end_time).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
                      : match.start_time
                      ? new Date(match.start_time).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
                      : "—"}
                  </div>

                  {/* Faceit link */}
                  {match.faceit_url && (
                    <a
                      href={match.faceit_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[#FF5500]/50 hover:text-[#FF5500] transition-colors shrink-0"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </button>

                {/* Expanded details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 border-t border-orbital-border/30 pt-3">
                        {/* Players grid per map */}
                        {match.maps.map((map, mi) => (
                          <div key={mi} className="mb-4 last:mb-0">
                            <div className="font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-wider text-orbital-text-dim mb-2 flex items-center gap-2">
                              <Crosshair size={10} className="text-orbital-purple" />
                              {map.map_name.replace("de_", "").toUpperCase()} — {map.team1_score}:{map.team2_score}
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full text-[0.6rem] font-[family-name:var(--font-jetbrains)]">
                                <thead>
                                  <tr className="text-orbital-text-dim/50 border-b border-orbital-border/20">
                                    <th className="text-left py-1 pr-4">Player</th>
                                    <th className="text-center px-2">K</th>
                                    <th className="text-center px-2">D</th>
                                    <th className="text-center px-2">A</th>
                                    <th className="text-center px-2">ADR</th>
                                    <th className="text-center px-2">HS%</th>
                                    <th className="text-center px-2">KDR</th>
                                    <th className="text-center px-2 hidden sm:table-cell">Entry</th>
                                    <th className="text-center px-2 hidden sm:table-cell">Clutch</th>
                                    <th className="text-center px-2 hidden md:table-cell">Flash</th>
                                    <th className="text-center px-2 hidden md:table-cell">Util DMG</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {map.player_stats
                                    .sort((a, b) => b.kills - a.kills)
                                    .map((p, pi) => (
                                      <tr
                                        key={pi}
                                        className={`border-b border-orbital-border/10 ${p.won ? "text-orbital-text" : "text-orbital-text-dim/70"}`}
                                      >
                                        <td className="py-1.5 pr-4 flex items-center gap-1.5">
                                          {p.won ? (
                                            <span className="w-1 h-1 rounded-full bg-green-500 shrink-0" />
                                          ) : (
                                            <span className="w-1 h-1 rounded-full bg-red-500/50 shrink-0" />
                                          )}
                                          {p.nickname}
                                        </td>
                                        <td className="text-center px-2 text-green-400">{p.kills}</td>
                                        <td className="text-center px-2 text-red-400/70">{p.deaths}</td>
                                        <td className="text-center px-2">{p.assists}</td>
                                        <td className={`text-center px-2 ${p.adr >= 80 ? "text-orbital-purple" : ""}`}>
                                          {p.adr.toFixed(1)}
                                        </td>
                                        <td className="text-center px-2">{p.headshot_pct}%</td>
                                        <td className={`text-center px-2 ${p.kdr >= 1.2 ? "text-green-400" : p.kdr < 0.8 ? "text-red-400/70" : ""}`}>
                                          {p.kdr.toFixed(2)}
                                        </td>
                                        <td className="text-center px-2 hidden sm:table-cell">{p.first_kills}</td>
                                        <td className="text-center px-2 hidden sm:table-cell">{p.clutch_kills}</td>
                                        <td className="text-center px-2 hidden md:table-cell">{p.enemies_flashed}</td>
                                        <td className="text-center px-2 hidden md:table-cell">{p.utility_damage}</td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}

                        {/* Actions */}
                        <MatchActions
                          match={match}
                          onUpdate={fetchMatches}
                        />

                        {/* Meta info */}
                        <div className="flex flex-wrap items-center gap-3 mt-2 pt-2 border-t border-orbital-border/10">
                          <span className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-text-dim/40">
                            BO{match.num_maps}
                          </span>
                          {match.demo_urls.length > 0 && (
                            <span className="flex items-center gap-1 font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-green-400/60">
                              <Download size={8} /> {match.demo_urls.length} demo(s)
                            </span>
                          )}
                          <span className="font-[family-name:var(--font-jetbrains)] text-[0.45rem] text-orbital-text-dim/30 ml-auto select-all">
                            {match.faceit_match_id}
                          </span>
                        </div>

                        {/* Roster */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                          {[
                            { label: match.team1_name, players: match.players.team1, isWinner: match.winner === "team1" },
                            { label: match.team2_name, players: match.players.team2, isWinner: match.winner === "team2" },
                          ].map((team, ti) => (
                            <div key={ti}>
                              <div className={`font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider mb-1.5 flex items-center gap-1.5 ${team.isWinner ? "text-green-400" : "text-orbital-text-dim"}`}>
                                {team.isWinner && <Trophy size={9} />}
                                {team.label}
                              </div>
                              <div className="space-y-0.5">
                                {team.players.map((p, pi) => (
                                  <div key={pi} className="flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim/70">
                                    <span className="text-[#FF5500]/50">Lv{p.skill_level}</span>
                                    <span className="text-orbital-text">{p.nickname}</span>
                                    {p.steam_id && (
                                      <a
                                        href={`/perfil/${p.steam_id}`}
                                        className="text-orbital-purple/40 hover:text-orbital-purple transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Link2 size={8} />
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Componente separado com state próprio pra feedback inline
function MatchActions({
  match,
  onUpdate,
}: {
  match: FaceitMatchRow;
  onUpdate: () => void;
}) {
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const handleRefreshClick = async () => {
    setActionFeedback(null);
    try {
      const res = await fetch("/api/faceit/match", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faceit_match_id: match.faceit_match_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro");
      setActionFeedback({ type: "success", msg: `Stats atualizados: ${data.match.team1_name} ${data.match.team1_score}-${data.match.team2_score} ${data.match.team2_name}` });
      onUpdate();
    } catch (err) {
      setActionFeedback({ type: "error", msg: err instanceof Error ? err.message : "Erro" });
    }
  };

  const handleSyncClick = async () => {
    setActionFeedback(null);
    try {
      const res = await fetch("/api/faceit/sync", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faceit_match_id: match.faceit_match_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro");
      setActionFeedback({ type: "success", msg: `Sincronizado com G5API: match #${data.g5_match_id}` });
    } catch (err) {
      setActionFeedback({ type: "error", msg: err instanceof Error ? err.message : "Erro" });
    }
  };

  const [loadingRefresh, setLoadingRefresh] = useState(false);
  const [loadingSync, setLoadingSync] = useState(false);

  return (
    <div className="mt-3 pt-3 border-t border-orbital-border/20">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={async () => { setLoadingRefresh(true); await handleRefreshClick(); setLoadingRefresh(false); }}
          disabled={loadingRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF5500]/10 border border-[#FF5500]/30 hover:border-[#FF5500]/60 disabled:opacity-40 transition-all font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-[#FF5500]"
        >
          {loadingRefresh ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
          ATUALIZAR STATS
        </button>
        {match.status === "finished" && match.maps.length > 0 && (
          <button
            onClick={async () => { setLoadingSync(true); await handleSyncClick(); setLoadingSync(false); }}
            disabled={loadingSync}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 disabled:opacity-40 transition-all font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-purple"
          >
            {loadingSync ? <Loader2 size={10} className="animate-spin" /> : <Download size={10} />}
            SYNC G5API
          </button>
        )}
      </div>
      {actionFeedback && (
        <div className={`mt-2 flex items-center gap-2 text-[0.55rem] font-[family-name:var(--font-jetbrains)] ${
          actionFeedback.type === "success" ? "text-green-400" : "text-red-400"
        }`}>
          {actionFeedback.type === "success" ? <Check size={10} /> : <AlertCircle size={10} />}
          {actionFeedback.msg}
        </div>
      )}
    </div>
  );
}
