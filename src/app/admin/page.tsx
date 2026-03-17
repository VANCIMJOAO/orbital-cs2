"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Swords, Users, Server, Calendar, ArrowRight, BarChart3, Trophy, Globe, UserCheck, Radio, Activity, Zap, Clock, ChevronRight, Wifi, Film } from "lucide-react";
import Link from "next/link";
import { HudCard } from "@/components/hud-card";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { Match, Team, Season, getStatusType } from "@/lib/api";
import { Tournament } from "@/lib/tournament";

const quickLinks = [
  { href: "/admin/partidas", label: "Criar Partida", icon: Swords, desc: "Configurar e iniciar uma nova partida", accent: "#A855F7" },
  { href: "/admin/times", label: "Gerenciar Times", icon: Users, desc: "Criar, editar ou remover times", accent: "#8B5CF6" },
  { href: "/admin/servidores", label: "Gerenciar Servidores", icon: Server, desc: "Adicionar e configurar servidores CS2", accent: "#F59E0B" },
  { href: "/admin/seasons", label: "Gerenciar Seasons", icon: Calendar, desc: "Criar e configurar temporadas", accent: "#EF4444" },
];

interface Metrics {
  totalMatches: number;
  liveMatches: number;
  finishedMatches: number;
  totalTeams: number;
  totalServers: number;
  totalSeasons: number;
  uniquePlayers: number;
}

interface RecentMatch {
  id: number;
  team1_string: string;
  team2_string: string;
  team1_score: number;
  team2_score: number;
  end_time: string;
}

// Corner bracket accent component
function CornerAccents({ color = "border-orbital-purple/50" }: { color?: string }) {
  return (
    <>
      <div className={`absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 ${color}`} />
      <div className={`absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 ${color}`} />
      <div className={`absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 ${color}`} />
      <div className={`absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 ${color}`} />
    </>
  );
}

// Time ago helper
function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min atrás`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h atrás`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "ontem";
  return `${diffD}d atrás`;
}

// Metric card gradient configs
const metricStyles: Record<string, { gradient: string; glow: string; border: string; accent: string }> = {
  "PARTIDAS":    { gradient: "from-purple-500/8 to-transparent",  glow: "shadow-[0_0_15px_rgba(168,85,247,0.08)]", border: "border-purple-500/20", accent: "text-purple-400" },
  "AO VIVO":     { gradient: "from-red-500/10 to-transparent",    glow: "shadow-[0_0_20px_rgba(239,68,68,0.12)]",  border: "border-red-500/30",    accent: "text-red-400" },
  "FINALIZADAS": { gradient: "from-green-500/8 to-transparent",   glow: "shadow-[0_0_15px_rgba(34,197,94,0.08)]",  border: "border-green-500/20",  accent: "text-green-400" },
  "TIMES":       { gradient: "from-violet-500/8 to-transparent",  glow: "shadow-[0_0_15px_rgba(139,92,246,0.08)]", border: "border-violet-500/20", accent: "text-violet-400" },
  "SERVIDORES":  { gradient: "from-amber-500/8 to-transparent",   glow: "shadow-[0_0_15px_rgba(245,158,11,0.08)]", border: "border-amber-500/20",  accent: "text-amber-400" },
  "JOGADORES":   { gradient: "from-cyan-500/8 to-transparent",    glow: "shadow-[0_0_15px_rgba(6,182,212,0.08)]",  border: "border-cyan-500/20",   accent: "text-cyan-400" },
  "SEASONS":     { gradient: "from-rose-500/8 to-transparent",    glow: "shadow-[0_0_15px_rgba(244,63,94,0.08)]",  border: "border-rose-500/20",   accent: "text-rose-400" },
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [activeTournaments, setActiveTournaments] = useState<Tournament[]>([]);
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);
  const [apiStatus, setApiStatus] = useState<"online" | "offline" | "checking">("checking");
  const [highlightsCount, setHighlightsCount] = useState<number>(0);
  const [lastMatchDate, setLastMatchDate] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const [matchesRes, teamsRes, serversRes, seasonsRes, leaderboardRes, tournamentsRes] = await Promise.all([
          fetch("/api/matches", { credentials: "include" }).then(r => r.json()).catch(() => ({ matches: [] })),
          fetch("/api/teams", { credentials: "include" }).then(r => r.json()).catch(() => ({ teams: [] })),
          fetch("/api/servers", { credentials: "include" }).then(r => r.json()).catch(() => ({ servers: [] })),
          fetch("/api/seasons", { credentials: "include" }).then(r => r.json()).catch(() => ({ seasons: [] })),
          fetch("/api/leaderboard/players", { credentials: "include" }).then(r => r.json()).catch(() => ({ leaderboard: [] })),
          fetch("/api/tournaments").then(r => r.json()).catch(() => ({ tournaments: [] })),
        ]);

        // API status - if we got here, it's online
        setApiStatus("online");

        const allTournaments: Tournament[] = tournamentsRes.tournaments || [];
        setActiveTournaments(allTournaments.filter(t => t.status !== "finished"));
        const matches: Match[] = matchesRes.matches || [];
        const teams: Team[] = teamsRes.teams || [];
        const servers = serversRes.servers || [];
        const seasons: Season[] = seasonsRes.seasons || [];
        const leaderboard = leaderboardRes.leaderboard || [];

        // Recent finished matches (last 5)
        const finished = matches
          .filter(m => getStatusType(m) === "finished" && m.end_time)
          .sort((a, b) => new Date(b.end_time!).getTime() - new Date(a.end_time!).getTime())
          .slice(0, 5)
          .map(m => ({
            id: m.id,
            team1_string: m.team1_string || `Time ${m.team1_id}`,
            team2_string: m.team2_string || `Time ${m.team2_id}`,
            team1_score: m.team1_score,
            team2_score: m.team2_score,
            end_time: m.end_time!,
          }));
        setRecentMatches(finished);

        // Last match date
        if (finished.length > 0) {
          setLastMatchDate(finished[0].end_time);
        }

        setMetrics({
          totalMatches: matches.length,
          liveMatches: matches.filter(m => getStatusType(m) === "live").length,
          finishedMatches: matches.filter(m => getStatusType(m) === "finished").length,
          totalTeams: teams.length,
          totalServers: servers.length,
          totalSeasons: seasons.length,
          uniquePlayers: leaderboard.length,
        });
      } catch {
        setApiStatus("offline");
      }
    }

    async function fetchHighlights() {
      try {
        const res = await fetch("/api/highlights/all");
        const data = await res.json();
        const clips = data.clips || data.highlights || [];
        setHighlightsCount(Array.isArray(clips) ? clips.length : 0);
      } catch {
        setHighlightsCount(0);
      }
    }

    fetchMetrics();
    fetchHighlights();
  }, []);

  const metricCards = metrics ? [
    { label: "PARTIDAS", value: metrics.totalMatches, icon: Swords },
    { label: "AO VIVO", value: metrics.liveMatches, icon: BarChart3 },
    { label: "FINALIZADAS", value: metrics.finishedMatches, icon: Trophy },
    { label: "TIMES", value: metrics.totalTeams, icon: Users },
    { label: "SERVIDORES", value: metrics.totalServers, icon: Globe },
    { label: "JOGADORES", value: metrics.uniquePlayers, icon: UserCheck },
    { label: "SEASONS", value: metrics.totalSeasons, icon: Calendar },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Welcome - subtle */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="flex items-center justify-between"
      >
        <div>
          <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
            Bem-vindo de volta,
          </p>
          <h1 className="font-[family-name:var(--font-orbitron)] text-sm font-bold text-orbital-text tracking-wider mt-0.5">
            {user?.name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            apiStatus === "online" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" :
            apiStatus === "offline" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" :
            "bg-yellow-500 animate-pulse"
          }`} />
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim uppercase tracking-wider">
            {apiStatus === "online" ? "SISTEMA ONLINE" : apiStatus === "offline" ? "SISTEMA OFFLINE" : "VERIFICANDO..."}
          </span>
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <AnimatePresence>
        {metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {metricCards.map((m, i) => {
              const Icon = m.icon;
              const style = metricStyles[m.label] || metricStyles["PARTIDAS"];
              const isLive = m.label === "AO VIVO" && m.value > 0;

              return (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, y: 16, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: i * 0.06, duration: 0.4 }}
                  className={`
                    relative overflow-hidden bg-gradient-to-b ${style.gradient}
                    bg-orbital-card border ${style.border} p-4 text-center
                    ${style.glow}
                    ${isLive ? "animate-pulse" : ""}
                    transition-all duration-300 hover:scale-[1.03]
                  `}
                >
                  <CornerAccents color={style.border} />

                  {/* Top accent line */}
                  <div className="absolute top-0 left-[20%] right-[20%] h-[1px] bg-gradient-to-r from-transparent via-current to-transparent opacity-20" />

                  <Icon size={14} className={`${style.accent} mx-auto mb-2 opacity-70`} />
                  <div className={`font-[family-name:var(--font-jetbrains)] text-3xl font-bold ${style.accent}`}>
                    {m.value}
                  </div>
                  <div className="font-[family-name:var(--font-orbitron)] text-[0.4rem] tracking-[0.25em] text-orbital-text-dim mt-1.5">
                    {m.label}
                  </div>

                  {/* Live indicator pulse ring */}
                  {isLive && (
                    <div className="absolute top-2 right-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* Active Tournaments - Mission Control */}
      {activeTournaments.length > 0 && (
        <HudCard label="MISSION CONTROL" delay={0.2}>
          <div className="space-y-3 pt-1">
            {activeTournaments.map((t, i) => {
              const finished = t.matches.filter(m => m.status === "finished").length;
              const total = t.matches.length;
              const progress = total > 0 ? (finished / total) * 100 : 0;
              const liveMatch = t.matches.find(m => m.status === "live");
              const nextMatch = t.matches.find(m => m.status === "pending" && m.team1_id && m.team2_id);
              const isActive = t.status === "active";

              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.08 }}
                  className={`relative border p-4 transition-all duration-300 ${
                    isActive
                      ? "bg-orbital-live/5 border-orbital-live/20 hover:border-orbital-live/50"
                      : "bg-orbital-purple/5 border-orbital-purple/15 hover:border-orbital-purple/40"
                  }`}
                >
                  <CornerAccents color={isActive ? "border-red-500/30" : "border-purple-500/20"} />

                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Tournament header */}
                      <div className="flex items-center gap-2 mb-2">
                        <Radio size={14} className={isActive ? "text-orbital-live" : "text-orbital-purple"} />
                        <span className="font-[family-name:var(--font-orbitron)] text-xs font-bold text-orbital-text tracking-wider truncate">
                          {t.name}
                        </span>
                        {liveMatch ? (
                          <span className="flex items-center gap-1 font-[family-name:var(--font-orbitron)] text-[0.45rem] text-orbital-live shrink-0">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                            </span>
                            LIVE
                          </span>
                        ) : (
                          <span className="font-[family-name:var(--font-orbitron)] text-[0.4rem] tracking-wider text-orbital-text-dim bg-orbital-border px-1.5 py-0.5 shrink-0">
                            {t.status === "active" ? "ATIVO" : "PENDENTE"}
                          </span>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim">
                            Progresso
                          </span>
                          <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim">
                            {finished}/{total} partidas
                          </span>
                        </div>
                        <div className="h-1.5 bg-orbital-border rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.8, delay: 0.4 + i * 0.1 }}
                            className={`h-full rounded-full ${
                              isActive
                                ? "bg-gradient-to-r from-red-500 to-red-400"
                                : "bg-gradient-to-r from-purple-600 to-purple-400"
                            }`}
                          />
                        </div>
                      </div>

                      {/* Current/Next match info */}
                      {liveMatch && (
                        <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-live/80">
                          <Zap size={10} className="inline mr-1" />
                          Ao vivo: {liveMatch.label}
                        </div>
                      )}
                      {!liveMatch && nextMatch && (
                        <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                          <Clock size={10} className="inline mr-1" />
                          Próxima: {nextMatch.label}
                        </div>
                      )}
                    </div>

                    {/* Mission Control button */}
                    <Link
                      href={`/admin/campeonato/${t.id}`}
                      className={`
                        group/btn flex items-center gap-1.5 px-3 py-2 border text-[0.6rem] font-[family-name:var(--font-orbitron)] tracking-wider
                        transition-all duration-300 shrink-0 mt-1
                        ${isActive
                          ? "border-orbital-live/30 text-orbital-live hover:bg-orbital-live/10 hover:border-orbital-live/60 hover:shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                          : "border-orbital-purple/30 text-orbital-purple hover:bg-orbital-purple/10 hover:border-orbital-purple/60 hover:shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                        }
                      `}
                    >
                      CONTROLE
                      <ChevronRight size={12} className="transition-transform group-hover/btn:translate-x-0.5" />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </HudCard>
      )}

      {/* Quick Actions Command Grid */}
      <HudCard label="AÇÕES RÁPIDAS" delay={0.3}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {quickLinks.map((link, i) => {
            const Icon = link.icon;
            return (
              <motion.div
                key={link.href}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.35 + i * 0.08 }}
              >
                <Link href={link.href} className="block group/action">
                  <div
                    className="relative bg-orbital-card border border-orbital-border p-4 transition-all duration-300
                      hover:border-[var(--hover-accent)]/40 hover:shadow-[0_0_20px_var(--hover-glow)] hover:scale-[1.02]"
                    style={{
                      "--hover-accent": link.accent,
                      "--hover-glow": `${link.accent}15`,
                    } as React.CSSProperties}
                  >
                    <CornerAccents color="border-orbital-border group-hover/action:border-orbital-purple/40" />

                    {/* Top shimmer line on hover */}
                    <div className="absolute top-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-orbital-purple/30 to-transparent opacity-0 group-hover/action:opacity-100 transition-opacity duration-300" />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-11 h-11 border flex items-center justify-center transition-all duration-300
                            border-orbital-border bg-orbital-card group-hover/action:border-orbital-purple/30 group-hover/action:bg-orbital-purple/10"
                        >
                          <Icon size={22} className="text-orbital-text-dim group-hover/action:text-orbital-purple transition-colors duration-300" />
                        </div>
                        <div>
                          <h3 className="font-[family-name:var(--font-orbitron)] text-[0.65rem] font-bold text-orbital-text tracking-wider">
                            {link.label}
                          </h3>
                          <p className="font-[family-name:var(--font-jetbrains)] text-[0.58rem] text-orbital-text-dim mt-0.5 leading-relaxed">
                            {link.desc}
                          </p>
                        </div>
                      </div>
                      <ArrowRight
                        size={16}
                        className="text-orbital-text-dim/50 group-hover/action:text-orbital-purple group-hover/action:translate-x-1 transition-all duration-300 shrink-0"
                      />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </HudCard>

      {/* Recent Activity Feed */}
      {recentMatches.length > 0 && (
        <HudCard label="ATIVIDADE RECENTE" delay={0.4}>
          <div className="space-y-0 pt-1">
            {recentMatches.map((match, i) => (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + i * 0.06 }}
              >
                <Link
                  href={`/partidas/${match.id}`}
                  className="group/match flex items-center justify-between py-2.5 px-2 -mx-2 hover:bg-white/[0.02] transition-colors duration-200 border-b border-orbital-border/50 last:border-b-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-6 h-6 flex items-center justify-center border border-orbital-border bg-orbital-card shrink-0">
                      <Trophy size={11} className="text-green-500/60" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-[family-name:var(--font-jetbrains)] text-[0.65rem]">
                        <span className={`${match.team1_score > match.team2_score ? "text-orbital-text font-bold" : "text-orbital-text-dim"} truncate max-w-[120px]`}>
                          {match.team1_string}
                        </span>
                        <span className="text-orbital-purple font-bold shrink-0">
                          {match.team1_score}
                        </span>
                        <span className="text-orbital-text-dim/40 text-[0.5rem] shrink-0">vs</span>
                        <span className="text-orbital-purple font-bold shrink-0">
                          {match.team2_score}
                        </span>
                        <span className={`${match.team2_score > match.team1_score ? "text-orbital-text font-bold" : "text-orbital-text-dim"} truncate max-w-[120px]`}>
                          {match.team2_string}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-text-dim/60">
                      {timeAgo(match.end_time)}
                    </span>
                    <ChevronRight size={12} className="text-orbital-text-dim/30 group-hover/match:text-orbital-purple transition-colors" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </HudCard>
      )}

      {/* System Status Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="relative border border-orbital-border/60 bg-orbital-card/50 px-4 py-3"
      >
        <CornerAccents color="border-orbital-border" />

        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* G5API Status */}
          <div className="flex items-center gap-2">
            <Wifi size={12} className={apiStatus === "online" ? "text-green-500" : "text-red-500"} />
            <span className="font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-[0.15em] text-orbital-text-dim">
              G5API
            </span>
            <span className={`font-[family-name:var(--font-jetbrains)] text-[0.55rem] ${
              apiStatus === "online" ? "text-green-500" : "text-red-500"
            }`}>
              {apiStatus === "online" ? "CONECTADO" : apiStatus === "offline" ? "DESCONECTADO" : "..."}
            </span>
          </div>

          {/* Highlights */}
          <div className="flex items-center gap-2">
            <Film size={12} className="text-orbital-purple/60" />
            <span className="font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-[0.15em] text-orbital-text-dim">
              HIGHLIGHTS
            </span>
            <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim">
              {highlightsCount}
            </span>
          </div>

          {/* Last Match */}
          <div className="flex items-center gap-2">
            <Activity size={12} className="text-orbital-text-dim/40" />
            <span className="font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-[0.15em] text-orbital-text-dim">
              ÚLTIMA PARTIDA
            </span>
            <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim">
              {lastMatchDate ? timeAgo(lastMatchDate) : "—"}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
