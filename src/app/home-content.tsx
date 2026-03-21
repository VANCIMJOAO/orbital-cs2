"use client";

import { motion } from "framer-motion";
import { Trophy, Crosshair, Swords, Users, Activity, ChevronRight, Shield, Star, Sparkles, Calendar, MapPin, Zap, BarChart3, Film } from "lucide-react";
import Link from "next/link";
import { Match, LeaderboardEntry } from "@/lib/api";
import { Tournament, getTeamName } from "@/lib/tournament";
import { MapScoresMap } from "@/components/bracket";
import { MatchCard } from "@/components/match-card";

/* ═══════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════ */

function TeamLogo({ logo, size = 24 }: { logo: string | null | undefined; size?: number }) {
  if (!logo) return <Shield size={size * 0.6} className="text-orbital-text-dim" />;
  return <img src={logo} alt="" width={size} height={size} className="object-contain" />;
}

export interface HomeContentProps {
  tournaments: Tournament[];
  activeTournament: Tournament | null;
  liveMatches: Match[];
  recentMatches: Match[];
  upcomingMatches: Match[];
  totalMatches: number;
  teamCount: number;
  playerCount: number;
  topPlayers: LeaderboardEntry[];
  teamsMap?: Record<number, { name: string; logo: string | null; players?: { name: string; steamId: string; captain: number }[] }>;
  mapScoresMap?: MapScoresMap;
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT — 3 Column HLTV-inspired Layout
   ═══════════════════════════════════════════════════════════════════════ */

export function HomeContent({
  tournaments, activeTournament, liveMatches, recentMatches, upcomingMatches,
  totalMatches, teamCount, playerCount, topPlayers, teamsMap, mapScoresMap,
}: HomeContentProps) {

  const t = activeTournament;
  const gf = t?.matches.find(m => m.id === "GF");
  const champion = t?.status === "finished" && gf?.winner_id
    ? t.teams.find(tm => tm.id === gf.winner_id) : null;

  const finishedTournaments = tournaments.filter(t => t.status === "finished");
  const activeTournaments = tournaments.filter(t => t.status === "active" || t.status === "pending");

  return (
    <div className="max-w-[1400px] mx-auto px-3 sm:px-4 lg:px-6 pb-16">

      {/* ── FEATURED TOURNAMENT BANNER ────────────────────────────── */}
      {t && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <Link href={`/campeonato/${t.id}`} className="block group">
            <div className="relative overflow-hidden border border-orbital-border hover:border-orbital-purple/30 transition-all">
              {/* Background */}
              <div className="absolute inset-0">
                <img src="https://i.imgur.com/0irj00x.jpeg" alt="" className="w-full h-full object-cover opacity-25" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/80 to-[#0A0A0A]" />
              </div>

              <div className="relative p-5 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* Left: Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {t.status === "active" && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 bg-orbital-live/10 border border-orbital-live/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-orbital-live animate-pulse" />
                        <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-live">AO VIVO</span>
                      </span>
                    )}
                    {t.status === "finished" && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 bg-orbital-success/10 border border-orbital-success/30">
                        <Trophy size={10} className="text-orbital-success" />
                        <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-success">FINALIZADO</span>
                      </span>
                    )}
                    {t.status === "pending" && (
                      <span className="px-2 py-0.5 bg-orbital-warning/10 border border-orbital-warning/30">
                        <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-warning">EM BREVE</span>
                      </span>
                    )}
                  </div>

                  <h2 className="font-[family-name:var(--font-orbitron)] text-lg sm:text-2xl font-black tracking-wider text-orbital-purple glow-purple-text mb-1">
                    {t.name}
                  </h2>

                  <div className="flex items-center gap-3 flex-wrap">
                    {t.start_date && (
                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim flex items-center gap-1">
                        <Calendar size={10} className="text-orbital-purple/60" />
                        {t.start_date}
                      </span>
                    )}
                    {t.location && (
                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim flex items-center gap-1">
                        <MapPin size={10} className="text-orbital-purple/60" />
                        {t.location}
                      </span>
                    )}
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                      {t.teams.length} times • {t.matches.filter(m => m.status === "finished").length}/{t.matches.length} partidas
                    </span>
                  </div>

                  {/* Champion mini */}
                  {champion && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2">
                        <Trophy size={14} className="text-yellow-400" />
                        <span className="font-[family-name:var(--font-orbitron)] text-xs text-yellow-400 tracking-wider">{champion.name}</span>
                      </div>
                      {teamsMap?.[champion.id]?.players && (
                        <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-yellow-400/50 mt-1 ml-6">
                          {teamsMap[champion.id].players!.map(p => p.name).join(" • ")}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: CTA */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-wider text-orbital-purple group-hover:text-orbital-text transition-colors">
                    VER CAMPEONATO
                  </span>
                  <ChevronRight size={14} className="text-orbital-purple" />
                </div>
              </div>

              {/* Bottom progress bar */}
              {t.matches.length > 0 && (
                <div className="h-[2px] bg-orbital-border">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(t.matches.filter(m => m.status === "finished").length / t.matches.length) * 100}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="h-full bg-gradient-to-r from-orbital-purple to-orbital-purple-bright"
                  />
                </div>
              )}
            </div>
          </Link>
        </motion.section>
      )}

      {/* ── 3-COLUMN GRID ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_260px] gap-4 lg:gap-5">

        {/* ═══════════════════════════════════════════════════════════
           LEFT SIDEBAR
           ═══════════════════════════════════════════════════════════ */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-4 order-2 lg:order-1"
        >
          {/* Top 5 Ranking */}
          <SidebarSection icon={BarChart3} title="TOP RANKING">
            {topPlayers.length > 0 ? (
              <div className="space-y-0">
                {topPlayers.map((p, i) => (
                  <Link key={p.steamId} href={`/perfil/${p.steamId}`} className="flex items-center gap-2 px-3 py-2 hover:bg-orbital-purple/5 transition-colors group">
                    <span className={`font-[family-name:var(--font-jetbrains)] text-[0.6rem] font-bold w-4 text-center ${
                      i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-600" : "text-orbital-text-dim"
                    }`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] text-orbital-text group-hover:text-orbital-purple transition-colors truncate block">
                        {p.name}
                      </span>
                    </div>
                    <span className={`font-[family-name:var(--font-jetbrains)] text-[0.65rem] font-bold ${
                      (p.average_rating || 0) >= 1.2 ? "text-orbital-success" : (p.average_rating || 0) >= 0.8 ? "text-orbital-text" : "text-orbital-danger"
                    }`}>
                      {(p.average_rating || 0).toFixed(2)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="px-3 py-2 text-orbital-text-dim font-[family-name:var(--font-jetbrains)] text-[0.65rem]">Sem dados</p>
            )}
            <Link href="/leaderboard" className="flex items-center justify-center gap-1 py-2 border-t border-orbital-border text-orbital-text-dim hover:text-orbital-purple transition-colors">
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem]">Ranking completo</span>
              <ChevronRight size={10} />
            </Link>
          </SidebarSection>

          {/* Campeonatos */}
          <SidebarSection icon={Trophy} title="CAMPEONATOS">
            {tournaments.length > 0 ? (
              <div className="space-y-0">
                {tournaments.slice(0, 5).map((tour) => (
                  <Link key={tour.id} href={`/campeonato/${tour.id}`} className="flex items-center gap-2 px-3 py-2 hover:bg-orbital-purple/5 transition-colors group">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      tour.status === "active" ? "bg-orbital-live animate-pulse" :
                      tour.status === "finished" ? "bg-orbital-success" : "bg-orbital-warning"
                    }`} />
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text group-hover:text-orbital-purple transition-colors truncate">
                      {tour.name}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="px-3 py-2 text-orbital-text-dim font-[family-name:var(--font-jetbrains)] text-[0.65rem]">Nenhum campeonato</p>
            )}
            <Link href="/campeonatos" className="flex items-center justify-center gap-1 py-2 border-t border-orbital-border text-orbital-text-dim hover:text-orbital-purple transition-colors">
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem]">Ver todos</span>
              <ChevronRight size={10} />
            </Link>
          </SidebarSection>

          {/* Platform Stats */}
          <SidebarSection icon={Zap} title="PLATAFORMA">
            <div className="grid grid-cols-2 gap-[1px] bg-orbital-border">
              <MiniStat label="CAMPEONATOS" value={tournaments.length} />
              <MiniStat label="PARTIDAS" value={totalMatches} />
              <MiniStat label="JOGADORES" value={playerCount} />
              <MiniStat label="TIMES" value={teamCount} />
            </div>
          </SidebarSection>

          {/* Quick Links */}
          <SidebarSection icon={Crosshair} title="NAVEGAÇÃO">
            <div className="space-y-0">
              <SidebarLink href="/campeonatos" icon={Trophy} label="Campeonatos" />
              <SidebarLink href="/partidas" icon={Swords} label="Partidas" />
              <SidebarLink href="/leaderboard" icon={BarChart3} label="Ranking" />
              <SidebarLink href="/highlights" icon={Film} label="Highlights" />
              <SidebarLink href="/comparar" icon={Swords} label="Comparar" />
            </div>
          </SidebarSection>
        </motion.aside>

        {/* ═══════════════════════════════════════════════════════════
           CENTER CONTENT
           ═══════════════════════════════════════════════════════════ */}
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="space-y-5 order-1 lg:order-2"
        >
          {/* Live Matches */}
          {liveMatches.length > 0 && (
            <section>
              <SectionHeader icon={Activity} title="AO VIVO" accent="live" />
              <div className="space-y-2">
                {liveMatches.map((match, i) => (
                  <MatchCard key={match.id} match={match} teamsMap={teamsMap} mapScores={mapScoresMap?.[match.id]} delay={i * 0.05} />
                ))}
              </div>
            </section>
          )}

          {/* Recent Results */}
          <section>
            <SectionHeader icon={Swords} title="RESULTADOS RECENTES" href="/partidas" />
            {recentMatches.length > 0 ? (
              <div className="space-y-2">
                {recentMatches.slice(0, 5).map((match, i) => (
                  <MatchCard key={match.id} match={match} teamsMap={teamsMap} mapScores={mapScoresMap?.[match.id]} delay={i * 0.04} />
                ))}
              </div>
            ) : (
              <div className="border border-orbital-border p-6 text-center">
                <p className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text-dim">Nenhuma partida finalizada</p>
              </div>
            )}
          </section>

          {/* Past Tournaments */}
          {finishedTournaments.length > 0 && (
            <section>
              <SectionHeader icon={Trophy} title="CAMPEONATOS ANTERIORES" href="/campeonatos" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {finishedTournaments.slice(0, 4).map((tour, i) => {
                  const tourGf = tour.matches.find(m => m.id === "GF");
                  const tourChampion = tourGf?.winner_id ? tour.teams.find(tm => tm.id === tourGf.winner_id) : null;
                  return (
                    <motion.div
                      key={tour.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                    >
                      <Link href={`/campeonato/${tour.id}`} className="block group">
                        <div className="border border-orbital-border hover:border-orbital-purple/30 transition-all p-4 bg-orbital-card">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-text group-hover:text-orbital-purple transition-colors truncate">
                              {tour.name}
                            </span>
                            <span className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-text-dim shrink-0">
                              {tour.teams.length} times
                            </span>
                          </div>
                          {tourChampion && (
                            <div className="flex items-center gap-2">
                              <Trophy size={12} className="text-yellow-400" />
                              <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-yellow-400/80">{tourChampion.name}</span>
                            </div>
                          )}
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}
        </motion.main>

        {/* ═══════════════════════════════════════════════════════════
           RIGHT SIDEBAR
           ═══════════════════════════════════════════════════════════ */}
        <motion.aside
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="space-y-4 order-3"
        >
          {/* Upcoming / Live Matches */}
          <SidebarSection icon={Activity} title={liveMatches.length > 0 ? "PARTIDAS" : "PRÓXIMAS"} accent={liveMatches.length > 0 ? "live" : undefined}>
            {(liveMatches.length > 0 || upcomingMatches.length > 0) ? (
              <div className="space-y-0">
                {liveMatches.map((m) => (
                  <MatchRow key={m.id} match={m} teamsMap={teamsMap} isLive />
                ))}
                {upcomingMatches.map((m) => (
                  <MatchRow key={m.id} match={m} teamsMap={teamsMap} />
                ))}
              </div>
            ) : (
              <p className="px-3 py-3 text-orbital-text-dim font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-center">
                Nenhuma partida agendada
              </p>
            )}
          </SidebarSection>

          {/* Champion Spotlight */}
          {champion && t && (
            <SidebarSection icon={Trophy} title="CAMPEÃO" accent="gold">
              <div className="p-3 text-center">
                <div className="w-12 h-12 mx-auto mb-2 border border-yellow-500/30 flex items-center justify-center bg-[#0A0A0A]">
                  <TeamLogo logo={teamsMap?.[champion.id]?.logo} size={36} />
                </div>
                <div className="font-[family-name:var(--font-orbitron)] text-sm font-bold text-yellow-400 tracking-wider mb-1">
                  {champion.name}
                </div>
                <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim">
                  {t.name}
                </div>
                {teamsMap?.[champion.id]?.players && (
                  <div className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-yellow-400/40 mt-1">
                    {teamsMap[champion.id].players!.map(p => p.name).join(" • ")}
                  </div>
                )}
              </div>
            </SidebarSection>
          )}

          {/* Highlights Recentes */}
          <SidebarSection icon={Sparkles} title="HIGHLIGHTS">
            <div className="p-3 text-center">
              <Sparkles size={24} className="text-orbital-purple/30 mx-auto mb-2" />
              <p className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim mb-2">
                Melhores jogadas do campeonato
              </p>
              <Link href="/highlights" className="inline-flex items-center gap-1 font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-orbital-purple hover:text-orbital-text transition-colors">
                VER HIGHLIGHTS <ChevronRight size={10} />
              </Link>
            </div>
          </SidebarSection>

          {/* Recap */}
          {t?.status === "finished" && (
            <SidebarSection icon={Star} title="RECAP">
              <Link href={`/campeonato/${t.id}/recap`} className="block p-3 hover:bg-orbital-purple/5 transition-colors text-center">
                <Star size={20} className="text-orbital-purple/40 mx-auto mb-2" />
                <p className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim mb-2">
                  Reviva o {t.name}
                </p>
                <span className="inline-flex items-center gap-1 font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-orbital-purple">
                  VER RECAP <ChevronRight size={10} />
                </span>
              </Link>
            </SidebarSection>
          )}
        </motion.aside>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════════════════════════════════ */

function SectionHeader({ icon: Icon, title, href, accent }: {
  icon: React.ElementType; title: string; href?: string; accent?: "live";
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon size={14} className={accent === "live" ? "text-orbital-live" : "text-orbital-purple"} />
        <h2 className={`font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] ${
          accent === "live" ? "text-orbital-live" : "text-orbital-purple"
        }`}>{title}</h2>
        <div className="h-[1px] w-8 bg-gradient-to-r from-orbital-purple/30 to-transparent" />
      </div>
      {href && (
        <Link href={href} className="flex items-center gap-1 text-orbital-text-dim hover:text-orbital-purple transition-colors">
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem]">Ver mais</span>
          <ChevronRight size={10} />
        </Link>
      )}
    </div>
  );
}

function SidebarSection({ icon: Icon, title, children, accent }: {
  icon: React.ElementType; title: string; children: React.ReactNode; accent?: "live" | "gold";
}) {
  const borderColor = accent === "live" ? "border-orbital-live/20" : accent === "gold" ? "border-yellow-500/20" : "border-orbital-border";
  const accentColor = accent === "live" ? "text-orbital-live" : accent === "gold" ? "text-yellow-400" : "text-orbital-purple";
  const accentBg = accent === "live" ? "via-orbital-live/30" : accent === "gold" ? "via-yellow-400/30" : "via-orbital-purple/40";

  return (
    <div className={`border ${borderColor} bg-orbital-card overflow-hidden`}>
      {/* Header */}
      <div className="relative px-3 py-2 border-b border-orbital-border bg-[#0D0D0D]">
        <div className={`absolute top-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent ${accentBg} to-transparent`} />
        <div className="flex items-center gap-2">
          <Icon size={11} className={accentColor} />
          <span className={`font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] ${accentColor}`}>
            {title}
          </span>
        </div>
      </div>
      {/* Content */}
      {children}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-orbital-card p-2.5 text-center">
      <div className="font-[family-name:var(--font-jetbrains)] text-base font-bold text-orbital-text">{value}</div>
      <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.1em] text-orbital-text-dim mt-0.5">{label}</div>
    </div>
  );
}

function SidebarLink({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 px-3 py-2 hover:bg-orbital-purple/5 transition-colors group">
      <Icon size={12} className="text-orbital-text-dim group-hover:text-orbital-purple transition-colors" />
      <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim group-hover:text-orbital-text transition-colors">
        {label}
      </span>
    </Link>
  );
}

function MatchRow({ match, teamsMap, isLive }: {
  match: Match;
  teamsMap?: Record<number, { name: string; logo: string | null }>;
  isLive?: boolean;
}) {
  return (
    <Link href={`/partidas/${match.id}`} className="block hover:bg-orbital-purple/5 transition-colors">
      <div className={`px-3 py-2 border-b border-orbital-border/50 ${isLive ? "bg-orbital-live/[0.03]" : ""}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <TeamLogo logo={teamsMap?.[match.team1_id]?.logo} size={14} />
            <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text truncate">
              {match.team1_string || "TBD"}
            </span>
          </div>
          <div className="shrink-0 px-1">
            {isLive ? (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-orbital-live animate-pulse" />
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] font-bold text-orbital-live">
                  {match.team1_score}:{match.team2_score}
                </span>
              </span>
            ) : (
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-text-dim">vs</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
            <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text truncate text-right">
              {match.team2_string || "TBD"}
            </span>
            <TeamLogo logo={teamsMap?.[match.team2_id]?.logo} size={14} />
          </div>
        </div>
        {match.title && !match.title.includes("{") && (
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-text-dim/60 mt-0.5 text-center">
            {match.title}
          </div>
        )}
      </div>
    </Link>
  );
}
