"use client";

import { motion } from "framer-motion";
import { Trophy, Crosshair, Swords, Users, Star, BarChart3, Clock, Target, Zap, Play, ArrowLeft, ChevronRight, Shield } from "lucide-react";
import Link from "next/link";
import { HudCard, StatBox } from "@/components/hud-card";
import { Tournament, getTeamName, BracketMatch } from "@/lib/tournament";
import type { Match, MapStats, PlayerStats, LeaderboardEntry } from "@/lib/api";

interface MatchData {
  bracketMatch: BracketMatch;
  match: Match | null;
  mapStats: MapStats[];
  playerStats: PlayerStats[];
}

interface HighlightClip {
  id: number;
  match_id: number;
  map_number: number;
  rank: number;
  player_name: string;
  steam_id: string;
  kills_count: number;
  score: number;
  description: string;
  round_number: number;
  video_file: string;
  thumbnail_file: string;
  duration_s: number;
  status: string;
  created_at: string;
  team1_string: string;
  team2_string: string;
}

interface RecapContentProps {
  tournament: Tournament;
  leaderboard: LeaderboardEntry[];
  matchesData: MatchData[];
  highlights: HighlightClip[];
}

function TeamLogo({ logo, size = 32, className = "" }: { logo: string | null | undefined; size?: number; className?: string }) {
  if (!logo) return <Shield size={size * 0.6} className="text-orbital-text-dim" />;
  return <img src={logo} alt="" width={size} height={size} className={`object-contain ${className}`} />;
}

// ── Scroll reveal wrapper ──
function RevealSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <Icon size={16} className="text-orbital-purple" />
      <h2 className="font-[family-name:var(--font-orbitron)] text-xs tracking-[0.2em] text-orbital-purple">{title}</h2>
      <div className="h-[1px] flex-1 bg-gradient-to-r from-orbital-purple/40 to-transparent" />
    </div>
  );
}

export function RecapContent({ tournament, leaderboard, matchesData, highlights }: RecapContentProps) {
  const t = tournament;
  const gf = t.matches.find(m => m.id === "GF");
  const champion = gf?.winner_id ? t.teams.find(tm => tm.id === gf.winner_id) : null;

  // Aggregate stats
  const allPlayerStats = matchesData.flatMap(md => md.playerStats);
  const allMapStats = matchesData.flatMap(md => md.mapStats);
  const finishedMatches = matchesData.filter(md => md.match);

  const totalKills = allPlayerStats.reduce((sum, p) => sum + p.kills, 0);
  const totalHeadshots = allPlayerStats.reduce((sum, p) => sum + p.headshot_kills, 0);
  const totalRounds = allPlayerStats.reduce((sum, p) => sum + p.roundsplayed, 0) / 10 || 0; // divided by players per team roughly
  const totalRoundsActual = allMapStats.reduce((sum, ms) => sum + ms.team1_score + ms.team2_score, 0);

  // Most competitive match (smallest score difference)
  let closestMatch: { match: Match; bracketMatch: BracketMatch; diff: number } | null = null;
  let biggestBlowout: { match: Match; bracketMatch: BracketMatch; diff: number } | null = null;
  for (const md of finishedMatches) {
    if (!md.match) continue;
    const diff = Math.abs(md.match.team1_score - md.match.team2_score);
    if (!closestMatch || diff < closestMatch.diff) {
      closestMatch = { match: md.match, bracketMatch: md.bracketMatch, diff };
    }
    if (!biggestBlowout || diff > biggestBlowout.diff) {
      biggestBlowout = { match: md.match, bracketMatch: md.bracketMatch, diff };
    }
  }

  // Top 5 players — usar leaderboard (já rankeado por season do campeonato)
  const topPlayers = [...leaderboard]
    .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
    .slice(0, 5)
    .map(p => ({
      name: p.name,
      steamId: p.steamId,
      totalKills: p.kills,
      totalDeaths: p.deaths,
      avgRating: p.average_rating || 0,
      kd: p.deaths > 0 ? p.kills / p.deaths : p.kills,
      hsp: p.hsp || 0,
    }));

  // MVP from leaderboard
  const mvp = leaderboard.length > 0
    ? leaderboard.reduce((best, curr) => (curr.average_rating > best.average_rating ? curr : best), leaderboard[0])
    : null;

  // Map distribution
  const mapCounts: Record<string, number> = {};
  for (const ms of allMapStats) {
    const name = ms.map_name || "unknown";
    mapCounts[name] = (mapCounts[name] || 0) + 1;
  }
  // Also count from bracket veto data
  for (const bm of t.matches) {
    if (bm.status === "finished" && bm.map && !allMapStats.some(ms => ms.match_id === bm.match_id)) {
      mapCounts[bm.map] = (mapCounts[bm.map] || 0) + 1;
    }
  }
  const mapDistribution = Object.entries(mapCounts).sort((a, b) => b[1] - a[1]);
  const maxMapCount = mapDistribution.length > 0 ? mapDistribution[0][1] : 1;

  // Timeline: sort bracket matches chronologically by match start_time or bracket order
  const timelineMatches = [...matchesData]
    .filter(md => md.match)
    .sort((a, b) => {
      const aTime = a.match?.start_time ? new Date(a.match.start_time).getTime() : 0;
      const bTime = b.match?.start_time ? new Date(b.match.start_time).getTime() : 0;
      return aTime - bTime;
    });

  // Best highlight
  const bestHighlight = highlights.length > 0
    ? highlights.reduce((best, curr) => (curr.score > best.score ? curr : best), highlights[0])
    : null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
      {/* Back link */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-6 mb-4">
        <Link href={`/campeonato/${t.id}`} className="inline-flex items-center gap-2 text-orbital-text-dim hover:text-orbital-purple transition-colors font-[family-name:var(--font-jetbrains)] text-xs">
          <ArrowLeft size={14} /> Voltar ao campeonato
        </Link>
      </motion.div>

      {/* ═══ HERO ═══ */}
      <RevealSection className="mb-16">
        <section className="relative py-12 sm:py-20 overflow-hidden rounded-lg">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-b from-orbital-purple/[0.03] via-transparent to-transparent" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(800px,200vw)] h-[400px] bg-orbital-purple/[0.04] blur-[150px] rounded-full" />
          </div>

          <div className="relative text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-center gap-2 mb-6"
            >
              <span className="flex items-center gap-2 px-4 py-2 bg-orbital-purple/10 border border-orbital-purple/30">
                <BarChart3 size={14} className="text-orbital-purple" />
                <span className="font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-[0.25em] text-orbital-purple">RECAP COMPLETO</span>
              </span>
            </motion.div>

            {/* Tournament name */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="font-[family-name:var(--font-orbitron)] text-3xl sm:text-5xl font-black tracking-wider mb-8"
            >
              <span className="text-orbital-purple glow-purple-text">{t.name}</span>
            </motion.h1>

            {/* Champion banner */}
            {champion && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-4 relative bg-gradient-to-r from-yellow-500/[0.03] via-yellow-400/[0.08] to-yellow-500/[0.03] border border-yellow-500/20 overflow-hidden max-w-xl mx-auto"
              >
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(234,179,8,0.05),transparent_70%)]" />
                <div className="relative py-6 px-6 flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-yellow-400/50" />
                    <Trophy size={18} className="text-yellow-400" />
                    <span className="font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.25em] text-yellow-400/80">
                      CAMPEAO
                    </span>
                    <Trophy size={18} className="text-yellow-400" />
                    <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-yellow-400/50" />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 border border-yellow-500/30 flex items-center justify-center bg-[#0A0A0A]">
                      <TeamLogo logo={null} size={48} className="w-12 h-12 sm:w-14 sm:h-14" />
                    </div>
                    <div>
                      <h3
                        className="font-[family-name:var(--font-orbitron)] text-xl sm:text-3xl font-black tracking-wider text-yellow-400"
                        style={{ textShadow: "0 0 20px rgba(234,179,8,0.4)" }}
                      >
                        {champion.name}
                      </h3>
                      <p className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-yellow-400/60 mt-0.5">
                        {t.name}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* MVP */}
            {mvp && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-4 relative bg-gradient-to-r from-red-500/[0.03] via-red-400/[0.08] to-red-500/[0.03] border border-red-500/20 overflow-hidden max-w-md mx-auto"
              >
                <div className="relative py-4 px-6 flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-[1px] w-6 bg-gradient-to-r from-transparent to-red-400/50" />
                    <Star size={14} className="text-red-400 fill-red-400" />
                    <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.25em] text-red-400/80">
                      MVP DO CAMPEONATO
                    </span>
                    <Star size={14} className="text-red-400 fill-red-400" />
                    <div className="h-[1px] w-6 bg-gradient-to-l from-transparent to-red-400/50" />
                  </div>
                  <Link href={`/perfil/${mvp.steamId}`} className="group flex items-center gap-4">
                    <div>
                      <h3
                        className="font-[family-name:var(--font-orbitron)] text-base sm:text-lg font-bold tracking-wider text-red-400 group-hover:text-orbital-text transition-colors"
                        style={{ textShadow: "0 0 15px rgba(248,113,113,0.3)" }}
                      >
                        {mvp.name}
                      </h3>
                      <div className="flex items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim mt-0.5">
                        <span>Rating <span className="text-red-400 font-bold">{(mvp.average_rating || 0).toFixed(2)}</span></span>
                        <span>{mvp.kills}K / {mvp.deaths}D</span>
                        <span>HS {Math.round(mvp.hsp || 0)}%</span>
                      </div>
                    </div>
                  </Link>
                </div>
              </motion.div>
            )}
          </div>
        </section>
      </RevealSection>

      {/* ═══ STATS GRID ═══ */}
      <RevealSection className="mb-16">
        <SectionHeader icon={Target} title="ESTATISTICAS GERAIS" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <HudCard className="text-center" delay={0}>
            <StatBox label="Partidas" value={finishedMatches.length} sub={`${t.matches.length} no bracket`} />
          </HudCard>
          <HudCard className="text-center" delay={0.05}>
            <StatBox label="Total Kills" value={totalKills.toLocaleString()} />
          </HudCard>
          <HudCard className="text-center" delay={0.1}>
            <StatBox label="Headshots" value={totalHeadshots.toLocaleString()} sub={totalKills > 0 ? `${Math.round((totalHeadshots / totalKills) * 100)}% HS` : ""} />
          </HudCard>
          <HudCard className="text-center" delay={0.15}>
            <StatBox label="Total Rounds" value={totalRoundsActual.toLocaleString()} />
          </HudCard>
          <HudCard className="text-center" delay={0.2}>
            <StatBox
              label="Mais Acirrada"
              value={closestMatch ? `${closestMatch.match.team1_score}-${closestMatch.match.team2_score}` : "-"}
              sub={closestMatch ? closestMatch.bracketMatch.label : ""}
            />
          </HudCard>
          <HudCard className="text-center" delay={0.25}>
            <StatBox
              label="Maior Goleada"
              value={biggestBlowout ? `${biggestBlowout.match.team1_score}-${biggestBlowout.match.team2_score}` : "-"}
              sub={biggestBlowout ? biggestBlowout.bracketMatch.label : ""}
            />
          </HudCard>
        </div>
      </RevealSection>

      {/* ═══ TOP 5 PLAYERS ═══ */}
      <RevealSection className="mb-16">
        <SectionHeader icon={Users} title="TOP 5 JOGADORES" />
        <HudCard label="RANKING">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-orbital-border">
                  <th className="text-left py-3 px-3 font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-purple">#</th>
                  <th className="text-left py-3 px-3 font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-purple">JOGADOR</th>
                  <th className="text-center py-3 px-3 font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-purple">RATING</th>
                  <th className="text-center py-3 px-3 font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-purple">K/D</th>
                  <th className="text-center py-3 px-3 font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-purple">HS%</th>
                  <th className="text-center py-3 px-3 font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-purple hidden sm:table-cell">KILLS</th>
                </tr>
              </thead>
              <tbody>
                {topPlayers.map((player, i) => (
                  <motion.tr
                    key={player.steamId}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="border-b border-orbital-border/50 hover:bg-orbital-purple/5 transition-colors"
                  >
                    <td className="py-3 px-3">
                      <span className={`font-[family-name:var(--font-orbitron)] text-sm font-bold ${
                        i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-600" : "text-orbital-text-dim"
                      }`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <Link href={`/perfil/${player.steamId}`} className="hover:text-orbital-purple transition-colors">
                        <span className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text">
                          {player.name}
                        </span>
                      </Link>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`font-[family-name:var(--font-jetbrains)] text-sm font-bold ${
                        player.avgRating >= 1.2 ? "text-orbital-success" : player.avgRating >= 1.0 ? "text-orbital-text" : "text-orbital-danger"
                      }`}>
                        {player.avgRating.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text">
                        {player.kd.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text">
                        {player.hsp.toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center hidden sm:table-cell">
                      <span className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text-dim">
                        {player.totalKills}
                      </span>
                    </td>
                  </motion.tr>
                ))}
                {topPlayers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text-dim">
                      Nenhum dado de jogador disponivel
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </HudCard>
      </RevealSection>

      {/* ═══ TIMELINE ═══ */}
      <RevealSection className="mb-16">
        <SectionHeader icon={Clock} title="TIMELINE DO CAMPEONATO" />
        <div className="relative">
          {/* Central line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-gradient-to-b from-orbital-purple/40 via-orbital-purple/20 to-orbital-purple/40 hidden sm:block" />
          <div className="absolute left-4 top-0 bottom-0 w-[2px] bg-gradient-to-b from-orbital-purple/40 via-orbital-purple/20 to-orbital-purple/40 sm:hidden" />

          <div className="space-y-6">
            {timelineMatches.map((md, i) => {
              const isRight = i % 2 === 1;
              const isGrandFinal = md.bracketMatch.id === "GF";
              const match = md.match!;
              const mapName = md.mapStats[0]?.map_name || md.bracketMatch.map || null;
              const startTime = match.start_time ? new Date(match.start_time) : null;

              return (
                <motion.div
                  key={md.bracketMatch.id}
                  initial={{ opacity: 0, x: isRight ? 30 : -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  className={`relative flex items-center ${isRight ? "sm:flex-row-reverse" : "sm:flex-row"}`}
                >
                  {/* Dot on the line */}
                  <div className={`absolute z-10 w-4 h-4 border-2 ${
                    isGrandFinal ? "border-yellow-400 bg-yellow-400/20" : "border-orbital-success bg-orbital-success/20"
                  } sm:left-1/2 sm:-translate-x-1/2 left-4 -translate-x-1/2`} />

                  {/* Spacer for mobile */}
                  <div className="w-10 shrink-0 sm:hidden" />

                  {/* Content card */}
                  <div className={`flex-1 sm:w-[calc(50%-2rem)] ${isRight ? "sm:pr-8" : "sm:pl-8"}`}>
                    <div className={`sm:${isRight ? "mr-auto" : "ml-auto"} sm:max-w-sm`}>
                      <Link href={`/partidas/${match.id}`} className="block group">
                        <div className={`border p-4 transition-all hover:scale-[1.02] ${
                          isGrandFinal
                            ? "border-yellow-500/30 bg-gradient-to-r from-yellow-500/[0.03] to-yellow-400/[0.05] hover:border-yellow-400/50"
                            : "border-orbital-success/20 bg-orbital-card hover:border-orbital-purple/40"
                        }`}>
                          {/* Label */}
                          <div className="flex items-center justify-between mb-2">
                            <span className={`font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] ${
                              isGrandFinal ? "text-yellow-400" : "text-orbital-purple"
                            }`}>
                              {md.bracketMatch.label}
                            </span>
                            {startTime && (
                              <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim">
                                {startTime.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                              </span>
                            )}
                          </div>

                          {/* Score */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 text-right">
                              <span className={`font-[family-name:var(--font-orbitron)] text-xs font-bold ${
                                match.winner === match.team1_id ? (isGrandFinal ? "text-yellow-400" : "text-orbital-success") : "text-orbital-text-dim"
                              }`}>
                                {match.team1_string || getTeamName(t, md.bracketMatch.team1_id)}
                              </span>
                            </div>
                            <div className="px-3 text-center shrink-0">
                              <span className="font-[family-name:var(--font-jetbrains)] text-lg font-bold text-orbital-text">
                                {match.team1_score}
                              </span>
                              <span className="text-orbital-text-dim mx-1">:</span>
                              <span className="font-[family-name:var(--font-jetbrains)] text-lg font-bold text-orbital-text">
                                {match.team2_score}
                              </span>
                            </div>
                            <div className="flex-1">
                              <span className={`font-[family-name:var(--font-orbitron)] text-xs font-bold ${
                                match.winner === match.team2_id ? (isGrandFinal ? "text-yellow-400" : "text-orbital-success") : "text-orbital-text-dim"
                              }`}>
                                {match.team2_string || getTeamName(t, md.bracketMatch.team2_id)}
                              </span>
                            </div>
                          </div>

                          {/* Map */}
                          {mapName && (
                            <div className="mt-2 text-center">
                              <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-purple">
                                {mapName.replace("de_", "").toUpperCase()}
                              </span>
                            </div>
                          )}

                          {/* View match link */}
                          <div className="mt-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-purple flex items-center justify-center gap-1">
                              Ver detalhes <ChevronRight size={10} />
                            </span>
                          </div>
                        </div>
                      </Link>
                    </div>
                  </div>

                  {/* Opposite side spacer (desktop) */}
                  <div className="hidden sm:block flex-1 sm:w-[calc(50%-2rem)]" />
                </motion.div>
              );
            })}

            {timelineMatches.length === 0 && (
              <div className="text-center py-12">
                <p className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text-dim">
                  Nenhuma partida registrada neste campeonato
                </p>
              </div>
            )}
          </div>
        </div>
      </RevealSection>

      {/* ═══ MAP DISTRIBUTION ═══ */}
      {mapDistribution.length > 0 && (
        <RevealSection className="mb-16">
          <SectionHeader icon={Crosshair} title="DISTRIBUICAO DE MAPAS" />
          <HudCard label="MAPAS JOGADOS">
            <div className="space-y-3 py-2">
              {mapDistribution.map(([mapName, count], i) => (
                <motion.div
                  key={mapName}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-4"
                >
                  <div className="w-24 sm:w-32 text-right shrink-0">
                    <span className="font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-text">
                      {mapName.replace("de_", "").toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 relative h-8 bg-[#0A0A0A] border border-orbital-border overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(count / maxMapCount) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-orbital-purple/30 to-orbital-purple/10 border-r border-orbital-purple/50"
                    />
                    <div className="relative h-full flex items-center px-3">
                      <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text font-bold">
                        {count}x
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </HudCard>
        </RevealSection>
      )}

      {/* ═══ BEST HIGHLIGHT ═══ */}
      {bestHighlight && (
        <RevealSection className="mb-16">
          <SectionHeader icon={Zap} title="MELHOR HIGHLIGHT" />
          <HudCard label="PLAY OF THE TOURNAMENT" glow>
            <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Star size={14} className="text-yellow-400 fill-yellow-400" />
                  <span className="font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-yellow-400">
                    SCORE: {bestHighlight.score}
                  </span>
                </div>
                <h3 className="font-[family-name:var(--font-orbitron)] text-base font-bold text-orbital-text mb-1">
                  {bestHighlight.player_name}
                </h3>
                <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim mb-2">
                  {bestHighlight.description || `${bestHighlight.kills_count} kills no round ${bestHighlight.round_number}`}
                </p>
                <div className="flex items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                  <span>{bestHighlight.team1_string} vs {bestHighlight.team2_string}</span>
                  <span>{bestHighlight.kills_count} kills</span>
                  <span>Round {bestHighlight.round_number}</span>
                </div>
                <Link
                  href={`/partidas/${bestHighlight.match_id}`}
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 transition-all font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-wider text-orbital-purple"
                >
                  <Play size={12} /> VER PARTIDA
                </Link>
              </div>
              {bestHighlight.thumbnail_file && (
                <div className="w-full sm:w-48 h-28 border border-orbital-border overflow-hidden bg-[#0A0A0A] shrink-0">
                  <img
                    src={`/api/highlights-proxy/${bestHighlight.thumbnail_file}`}
                    alt="Highlight thumbnail"
                    className="w-full h-full object-cover opacity-80"
                  />
                </div>
              )}
            </div>
          </HudCard>
        </RevealSection>
      )}

      {/* ═══ BOTTOM CTA ═══ */}
      <RevealSection>
        <div className="text-center py-8">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href={`/campeonato/${t.id}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-purple"
            >
              <Swords size={14} /> VER BRACKET
            </Link>
            <Link
              href="/leaderboard"
              className="inline-flex items-center gap-2 px-6 py-3 border border-orbital-border hover:border-orbital-purple/30 transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-text-dim hover:text-orbital-purple"
            >
              <BarChart3 size={14} /> LEADERBOARD
            </Link>
            {highlights.length > 0 && (
              <Link
                href="/highlights"
                className="inline-flex items-center gap-2 px-6 py-3 border border-orbital-border hover:border-orbital-purple/30 transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-text-dim hover:text-orbital-purple"
              >
                <Zap size={14} /> HIGHLIGHTS
              </Link>
            )}
          </div>
        </div>
      </RevealSection>
    </div>
  );
}
