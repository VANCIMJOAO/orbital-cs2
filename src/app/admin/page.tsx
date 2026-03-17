"use client";

import { motion } from "framer-motion";
import {
  Swords, Users, Server, Calendar, ArrowRight, Trophy, Globe, UserCheck,
  Radio, Activity, Zap, Clock, ChevronRight, Wifi, WifiOff, Film,
  AlertTriangle, Plus, Eye, PlayCircle, Settings,
} from "lucide-react";
import Link from "next/link";
import { HudCard } from "@/components/hud-card";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { Match, Team, Season, getStatusType } from "@/lib/api";
import { Tournament, getTeamName, getNextPlayableMatch } from "@/lib/tournament";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "ontem" : `${d}d`;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [servers, setServers] = useState<{ id: number; display_name: string; ip_string: string; port: number }[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [playerCount, setPlayerCount] = useState(0);
  const [highlightsCount, setHighlightsCount] = useState(0);
  const [apiStatus, setApiStatus] = useState<"online" | "offline" | "checking">("checking");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [matchesRes, teamsRes, serversRes, seasonsRes, lbRes, tourRes] = await Promise.all([
          fetch("/api/matches", { credentials: "include" }).then(r => r.json()).catch(() => ({ matches: [] })),
          fetch("/api/teams", { credentials: "include" }).then(r => r.json()).catch(() => ({ teams: [] })),
          fetch("/api/servers", { credentials: "include" }).then(r => r.json()).catch(() => ({ servers: [] })),
          fetch("/api/seasons", { credentials: "include" }).then(r => r.json()).catch(() => ({ seasons: [] })),
          fetch("/api/leaderboard/players", { credentials: "include" }).then(r => r.json()).catch(() => ({ leaderboard: [] })),
          fetch("/api/tournaments").then(r => r.json()).catch(() => ({ tournaments: [] })),
        ]);
        setApiStatus("online");
        setMatches(matchesRes.matches || []);
        setTeams(teamsRes.teams || []);
        setServers(serversRes.servers || []);
        setSeasons(seasonsRes.seasons || []);
        setTournaments(tourRes.tournaments || []);
        setPlayerCount((lbRes.leaderboard || []).length);
      } catch {
        setApiStatus("offline");
      }
      // Highlights count
      try {
        const hlRes = await fetch("/api/highlights/all");
        const hlData = await hlRes.json();
        setHighlightsCount((hlData.clips || hlData.highlights || []).length);
      } catch { /* */ }
      setLoading(false);
    }
    load();
  }, []);

  // Derived data
  const liveMatches = matches.filter(m => getStatusType(m) === "live");
  const recentFinished = matches
    .filter(m => getStatusType(m) === "finished" && m.end_time)
    .sort((a, b) => new Date(b.end_time!).getTime() - new Date(a.end_time!).getTime())
    .slice(0, 5);
  const activeTournaments = tournaments.filter(t => t.status === "active" || t.status === "pending");
  const finishedTournaments = tournaments.filter(t => t.status === "finished");

  // Alerts
  const alerts: { type: "warning" | "info" | "error"; text: string; action?: string; href?: string }[] = [];
  if (apiStatus === "offline") alerts.push({ type: "error", text: "G5API não está respondendo", action: "Verificar", href: "/admin/servidores" });
  if (servers.length === 0) alerts.push({ type: "warning", text: "Nenhum servidor cadastrado", action: "Adicionar", href: "/admin/servidores" });
  if (teams.length < 2) alerts.push({ type: "warning", text: "Menos de 2 times cadastrados", action: "Criar times", href: "/admin/times" });
  if (seasons.length === 0) alerts.push({ type: "info", text: "Nenhuma season criada", action: "Criar", href: "/admin/seasons" });

  // Matches needing highlights
  const matchesWithoutHighlights = recentFinished.filter(m => {
    // Simple heuristic: if match is recent and we have highlights system
    return true; // Could check actual highlights per match
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-orbital-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ═══ HEADER ═══ */}
      <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-orbitron)] text-lg font-bold text-orbital-text tracking-wider">
            Dashboard
          </h1>
          <p className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim mt-0.5">
            Visão geral do sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${apiStatus === "online" ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" : apiStatus === "offline" ? "bg-red-500" : "bg-yellow-500 animate-pulse"}`} />
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
            {apiStatus === "online" ? "Sistema online" : apiStatus === "offline" ? "Offline" : "Verificando..."}
          </span>
        </div>
      </motion.div>

      {/* ═══ METRICS ROW ═══ */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { icon: Swords, label: "Partidas", value: matches.length, color: "text-purple-400" },
            { icon: Users, label: "Times", value: teams.length, color: "text-violet-400" },
            { icon: Globe, label: "Servidores", value: servers.length, color: "text-amber-400" },
            { icon: UserCheck, label: "Jogadores", value: playerCount, color: "text-cyan-400" },
            { icon: Film, label: "Highlights", value: highlightsCount, color: "text-pink-400" },
            { icon: Calendar, label: "Seasons", value: seasons.length, color: "text-rose-400" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.04 }}
              className="bg-white/[0.02] border border-orbital-border/60 p-3 text-center hover:border-orbital-purple/20 transition-colors"
            >
              <s.icon size={12} className={`${s.color} mx-auto mb-1.5 opacity-60`} />
              <div className={`font-[family-name:var(--font-jetbrains)] text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="font-[family-name:var(--font-orbitron)] text-[0.4rem] tracking-[0.15em] text-orbital-text-dim/50 mt-0.5">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ═══ ALERTS (things that need attention) ═══ */}
      {alerts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-center justify-between px-3 py-2 border ${
                alert.type === "error" ? "bg-red-500/5 border-red-500/20" :
                alert.type === "warning" ? "bg-amber-500/5 border-amber-500/20" :
                "bg-blue-500/5 border-blue-500/20"
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle size={13} className={
                  alert.type === "error" ? "text-red-500" :
                  alert.type === "warning" ? "text-amber-500" :
                  "text-blue-500"
                } />
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">
                  {alert.text}
                </span>
              </div>
              {alert.href && (
                <Link href={alert.href} className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-orbital-purple hover:text-orbital-text transition-colors">
                  {alert.action} →
                </Link>
              )}
            </div>
          ))}
        </motion.div>
      )}

      {/* ═══ AGORA (live matches) ═══ */}
      {liveMatches.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <HudCard label="AGORA" glow>
            <div className="space-y-2 pt-1">
              {liveMatches.map(m => (
                <Link key={m.id} href={`/partidas/${m.id}`} className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/20 hover:border-red-500/40 transition-colors group">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                    </span>
                    <div>
                      <div className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text">
                        <span className={m.team1_score > m.team2_score ? "font-bold" : ""}>{m.team1_string || "Time 1"}</span>
                        <span className="text-red-500 font-bold mx-2">{m.team1_score} : {m.team2_score}</span>
                        <span className={m.team2_score > m.team1_score ? "font-bold" : ""}>{m.team2_string || "Time 2"}</span>
                      </div>
                      {m.title && !m.title.includes("{") && (
                        <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim mt-0.5">{m.title}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] text-red-500">#{m.id}</span>
                    <ChevronRight size={14} className="text-orbital-text-dim group-hover:text-red-500 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </HudCard>
        </motion.div>
      )}

      {/* ═══ TORNEIOS (action-focused) ═══ */}
      {activeTournaments.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          {activeTournaments.map(t => {
            const finished = t.matches.filter(m => m.status === "finished").length;
            const total = t.matches.length;
            const progress = total > 0 ? Math.round((finished / total) * 100) : 0;
            const liveMatch = t.matches.find(m => m.status === "live");
            const nextMatch = getNextPlayableMatch(t);

            return (
              <HudCard key={t.id} label={t.name} className="mb-4">
                <div className="pt-1 space-y-3">
                  {/* Progress */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-orbital-border rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${liveMatch ? "bg-red-500" : "bg-orbital-purple"}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim shrink-0">
                      {finished}/{total}
                    </span>
                  </div>

                  {/* Live match */}
                  {liveMatch && (
                    <Link
                      href={`/admin/campeonato/${t.id}`}
                      className="flex items-center gap-3 p-2.5 bg-red-500/5 border border-red-500/20 hover:border-red-500/40 transition-colors"
                    >
                      <Zap size={14} className="text-red-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] text-red-500 tracking-wider">AO VIVO</div>
                        <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text truncate">{liveMatch.label}</div>
                      </div>
                      <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] text-red-500/60">MISSION CONTROL →</span>
                    </Link>
                  )}

                  {/* Next match to start */}
                  {!liveMatch && nextMatch && (
                    <Link
                      href={`/admin/campeonato/${t.id}`}
                      className="flex items-center gap-3 p-2.5 bg-orbital-purple/5 border border-orbital-purple/20 hover:border-orbital-purple/40 transition-colors"
                    >
                      <PlayCircle size={14} className="text-orbital-purple shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] text-orbital-purple tracking-wider">PRÓXIMA</div>
                        <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text truncate">
                          {nextMatch.label}: {getTeamName(t, nextMatch.team1_id)} vs {getTeamName(t, nextMatch.team2_id)}
                        </div>
                      </div>
                      <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] text-orbital-purple/60">INICIAR VETO →</span>
                    </Link>
                  )}

                  {/* No live, no next = tournament done or waiting */}
                  {!liveMatch && !nextMatch && finished < total && (
                    <Link
                      href={`/admin/campeonato/${t.id}`}
                      className="flex items-center gap-3 p-2.5 bg-white/[0.02] border border-orbital-border hover:border-orbital-purple/30 transition-colors"
                    >
                      <Settings size={14} className="text-orbital-text-dim shrink-0" />
                      <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">Gerenciar torneio</span>
                      <ChevronRight size={14} className="text-orbital-text-dim ml-auto" />
                    </Link>
                  )}
                </div>
              </HudCard>
            );
          })}
        </motion.div>
      )}

      {/* ═══ CRIAR (quick create actions) ═══ */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { href: "/admin/partidas", label: "Partida", icon: Swords },
            { href: "/admin/times", label: "Time", icon: Users },
            { href: "/admin/campeonatos", label: "Torneio", icon: Trophy },
            { href: "/admin/seasons", label: "Season", icon: Calendar },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 p-3 border border-orbital-border hover:border-orbital-purple/40 hover:bg-orbital-purple/5 transition-all group"
            >
              <Plus size={12} className="text-orbital-purple shrink-0" />
              <item.icon size={14} className="text-orbital-text-dim group-hover:text-orbital-purple transition-colors shrink-0" />
              <span className="font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-wider text-orbital-text-dim group-hover:text-orbital-text transition-colors">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* ═══ RECENTE (last activity) ═══ */}
      {recentFinished.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <HudCard label="RECENTE">
            <div className="pt-1">
              {recentFinished.map(m => (
                <Link
                  key={m.id}
                  href={`/partidas/${m.id}`}
                  className="flex items-center justify-between py-2 px-1 hover:bg-white/[0.02] transition-colors border-b border-orbital-border/30 last:border-b-0 group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim/40 w-5 text-right shrink-0">#{m.id}</span>
                    <span className={`font-[family-name:var(--font-jetbrains)] text-[0.65rem] truncate max-w-[100px] ${m.winner === m.team1_id ? "text-orbital-text font-bold" : "text-orbital-text-dim"}`}>
                      {m.team1_string || "?"}
                    </span>
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-purple font-bold shrink-0">
                      {m.team1_score}:{m.team2_score}
                    </span>
                    <span className={`font-[family-name:var(--font-jetbrains)] text-[0.65rem] truncate max-w-[100px] ${m.winner === m.team2_id ? "text-orbital-text font-bold" : "text-orbital-text-dim"}`}>
                      {m.team2_string || "?"}
                    </span>
                  </div>
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-text-dim/40 shrink-0">
                    {m.end_time ? timeAgo(m.end_time) : ""}
                  </span>
                </Link>
              ))}
            </div>
          </HudCard>
        </motion.div>
      )}

      {/* ═══ GERENCIAR (secondary actions) ═══ */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { href: "/admin/servidores", label: "Servidores", icon: Server, count: servers.length, desc: "Configurar" },
            { href: "/admin/times", label: "Times", icon: Users, count: teams.length, desc: "Gerenciar" },
            { href: "/admin/seasons", label: "Seasons", icon: Calendar, count: seasons.length, desc: "Gerenciar" },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 p-3 border border-orbital-border hover:border-orbital-purple/30 transition-colors group"
            >
              <item.icon size={16} className="text-orbital-text-dim/40 group-hover:text-orbital-purple transition-colors shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-wider text-orbital-text-dim group-hover:text-orbital-text transition-colors">
                  {item.label}
                </div>
                <div className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-text-dim/50">
                  {item.count} cadastrados
                </div>
              </div>
              <ArrowRight size={12} className="text-orbital-text-dim/30 group-hover:text-orbital-purple transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      </motion.div>

      {/* ═══ TORNEIOS FINALIZADOS (archive) ═══ */}
      {finishedTournaments.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={12} className="text-orbital-text-dim/40" />
            <span className="font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-[0.2em] text-orbital-text-dim/60">CAMPEONATOS FINALIZADOS</span>
          </div>
          <div className="space-y-1">
            {finishedTournaments.map(t => {
              const gf = t.matches.find(m => m.bracket === "grand_final" || m.id === "GF");
              const winnerName = gf?.winner_id ? getTeamName(t, gf.winner_id) : null;
              return (
                <Link
                  key={t.id}
                  href={`/campeonato/${t.id}`}
                  className="flex items-center justify-between py-2 px-2 hover:bg-white/[0.02] transition-colors border-b border-orbital-border/20 last:border-b-0"
                >
                  <div className="flex items-center gap-2">
                    <Trophy size={12} className="text-amber-500/40 shrink-0" />
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">{t.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {winnerName && (
                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-amber-500/60">{winnerName}</span>
                    )}
                    <Eye size={12} className="text-orbital-text-dim/30" />
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
