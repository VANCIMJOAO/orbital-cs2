"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Users, Swords, Tag, Trophy, BarChart3, Shield, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { HudCard } from "@/components/hud-card";
import { Team, Match, PlayerStats, MapStats, LeaderboardEntry, getStatusType } from "@/lib/api";

type Tab = "info" | "roster" | "matches" | "stats";

interface Props {
  team: Team;
  matches: Match[];
  playerStats: PlayerStats[];
  mapStats: MapStats[];
  teamsMap: Record<number, { name: string; logo: string | null }>;
  leaderboard: LeaderboardEntry[];
}

export function TeamDetailContent({ team, matches, playerStats, mapStats, teamsMap }: Props) {
  const [tab, setTab] = useState<Tab>("info");

  const players = useMemo(() => {
    return Object.entries(team.auth_name || {}).map(([steamId, val]) => {
      const name = typeof val === "string" ? val : val.name;
      const isCaptain = typeof val === "object" && val.captain === 1;
      const isCoach = typeof val === "object" && val.coach === 1;
      return { steamId, name, isCaptain, isCoach };
    });
  }, [team]);

  // Compute stats
  const finishedMatches = useMemo(() =>
    matches.filter(m => m.end_time && !m.cancelled && !m.forfeit),
    [matches]
  );

  const wins = finishedMatches.filter(m => m.winner === team.id).length;
  const losses = finishedMatches.length - wins;
  const winRate = finishedMatches.length > 0 ? ((wins / finishedMatches.length) * 100).toFixed(1) : "0";

  // Current streak
  const streak = useMemo(() => {
    let count = 0;
    let type: "W" | "L" | null = null;
    for (const m of finishedMatches) {
      const won = m.winner === team.id;
      if (type === null) {
        type = won ? "W" : "L";
        count = 1;
      } else if ((type === "W" && won) || (type === "L" && !won)) {
        count++;
      } else {
        break;
      }
    }
    return { type, count };
  }, [finishedMatches, team.id]);

  // Last 5 results
  const last5 = finishedMatches.slice(0, 5);

  // Head-to-Head stats per opponent
  const h2h = useMemo(() => {
    const map: Record<number, { name: string; logo: string | null; wins: number; losses: number; matches: number }> = {};
    for (const m of finishedMatches) {
      const opponentId = m.team1_id === team.id ? m.team2_id : m.team1_id;
      const opponentName = m.team1_id === team.id ? (m.team2_string || "?") : (m.team1_string || "?");
      if (!map[opponentId]) {
        map[opponentId] = { name: opponentName, logo: teamsMap[opponentId]?.logo || null, wins: 0, losses: 0, matches: 0 };
      }
      map[opponentId].matches++;
      if (m.winner === team.id) map[opponentId].wins++;
      else map[opponentId].losses++;
    }
    return Object.entries(map)
      .map(([id, data]) => ({ id: parseInt(id), ...data }))
      .sort((a, b) => b.matches - a.matches);
  }, [finishedMatches, team.id, teamsMap]);

  // Player aggregated stats (from playerStats for this team)
  interface PlayerAgg {
    steamId: string;
    name: string;
    kills: number;
    deaths: number;
    assists: number;
    flashAssists: number;
    rounds: number;
    maps: number;
    rating: number[];
    headshots: number;
    damage: number;
  }

  const playerAggregated = useMemo(() => {
    const byPlayer: Record<string, PlayerAgg> = {};

    for (const ps of playerStats) {
      if (ps.team_id !== team.id) continue;
      if (!byPlayer[ps.steam_id]) {
        byPlayer[ps.steam_id] = {
          steamId: ps.steam_id,
          name: ps.name,
          kills: 0, deaths: 0, assists: 0, flashAssists: 0,
          rounds: 0, maps: 0, rating: [], headshots: 0, damage: 0,
        };
      }
      const existing = byPlayer[ps.steam_id];
      existing.kills += ps.kills;
      existing.deaths += ps.deaths;
      existing.assists += ps.assists;
      existing.flashAssists += ps.flash_assists;
      existing.rounds += ps.roundsplayed;
      existing.maps += 1;
      existing.rating.push(ps.rating);
      existing.headshots += ps.headshot_kills;
      existing.damage += ps.damage;
      existing.name = ps.name || existing.name;
    }

    return Object.values(byPlayer)
      .map(p => ({
        ...p,
        avgRating: p.rating.length > 0 ? (p.rating.reduce((a: number, b: number) => a + b, 0) / p.rating.length) : 0,
        kdr: p.deaths > 0 ? p.kills / p.deaths : p.kills,
        hsp: p.kills > 0 ? (p.headshots / p.kills) * 100 : 0,
        adr: p.rounds > 0 ? p.damage / p.rounds : 0,
      }))
      .sort((a, b) => b.avgRating - a.avgRating);
  }, [playerStats, team.id]);

  // Map statistics
  const mapWinStats = useMemo(() => {
    const byMap: Record<string, { played: number; wins: number }> = {};

    for (const ms of mapStats) {
      const matchOfMap = finishedMatches.find(m => m.id === ms.match_id);
      if (!matchOfMap) continue;

      const mapName = ms.map_name;
      if (!byMap[mapName]) byMap[mapName] = { played: 0, wins: 0 };
      byMap[mapName].played++;

      const isTeam1 = matchOfMap.team1_id === team.id;
      const teamScore = isTeam1 ? ms.team1_score : ms.team2_score;
      const oppScore = isTeam1 ? ms.team2_score : ms.team1_score;
      if (teamScore > oppScore) byMap[mapName].wins++;
    }

    return Object.entries(byMap)
      .map(([map, stats]) => ({
        map,
        ...stats,
        winRate: stats.played > 0 ? (stats.wins / stats.played) * 100 : 0,
      }))
      .sort((a, b) => b.winRate - a.winRate);
  }, [mapStats, finishedMatches, team.id]);

  const getTeamName = (id: number, fallback: string) => teamsMap[id]?.name || fallback || `Time ${id}`;
  const getTeamLogo = (id: number) => teamsMap[id]?.logo || null;

  const tabs: { value: Tab; label: string }[] = [
    { value: "info", label: "Info" },
    { value: "roster", label: "Roster" },
    { value: "matches", label: "Partidas" },
    { value: "stats", label: "Stats" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
      {/* Back */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-4">
        <Link href="/times" className="inline-flex items-center gap-2 text-orbital-text-dim hover:text-orbital-purple transition-colors font-[family-name:var(--font-jetbrains)] text-xs">
          <ArrowLeft size={14} /> Voltar
        </Link>
      </motion.div>

      {/* Team Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="bg-orbital-card border border-orbital-border p-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 bg-orbital-purple/10 border border-orbital-purple/20 flex items-center justify-center shrink-0">
              {team.logo ? (
                <img src={team.logo} alt={team.name} className="w-14 h-14 object-contain" />
              ) : (
                <Shield size={32} className="text-orbital-purple" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {team.flag && <span className="text-lg">{team.flag}</span>}
                <h1 className="font-[family-name:var(--font-orbitron)] text-2xl font-bold text-orbital-text tracking-wider">
                  {team.name}
                </h1>
              </div>
              <div className="flex items-center gap-4 mt-1.5">
                {team.tag && (
                  <span className="flex items-center gap-1 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
                    <Tag size={11} /> [{team.tag}]
                  </span>
                )}
                <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
                  {players.length} jogadores
                </span>
              </div>
              {/* Quick Stats Row */}
              {finishedMatches.length > 0 && (
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5">
                    <Trophy size={12} className="text-orbital-success" />
                    <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text">
                      {wins}W <span className="text-orbital-text-dim">/</span> {losses}L
                    </span>
                  </div>
                  <div className="font-[family-name:var(--font-jetbrains)] text-xs">
                    <span className={`${parseFloat(winRate) >= 50 ? "text-orbital-success" : "text-orbital-danger"}`}>
                      {winRate}%
                    </span>
                    <span className="text-orbital-text-dim"> win rate</span>
                  </div>
                  {streak.type && streak.count >= 2 && (
                    <div className="flex items-center gap-1">
                      {streak.type === "W"
                        ? <TrendingUp size={12} className="text-orbital-success" />
                        : <TrendingDown size={12} className="text-orbital-danger" />
                      }
                      <span className={`font-[family-name:var(--font-jetbrains)] text-xs ${streak.type === "W" ? "text-orbital-success" : "text-orbital-danger"}`}>
                        {streak.count}{streak.type} streak
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex items-center border-b border-orbital-border mb-6">
        {tabs.map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`relative px-5 py-3 font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.12em] transition-colors ${
              tab === t.value ? "text-orbital-purple" : "text-orbital-text-dim hover:text-orbital-text"
            }`}
          >
            {t.label}
            {tab === t.value && (
              <motion.div
                layoutId="team-tab"
                className="absolute bottom-0 left-2 right-2 h-[2px] bg-orbital-purple"
                style={{ boxShadow: "0 0 8px rgba(168,85,247,0.4)" }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        ))}
      </motion.div>

      {/* Tab Content */}
      {tab === "info" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Stats Cards */}
          {finishedMatches.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="PARTIDAS" value={finishedMatches.length} />
              <StatCard label="VITÓRIAS" value={wins} color="text-orbital-success" />
              <StatCard label="DERROTAS" value={losses} color="text-orbital-danger" />
              <StatCard label="WIN RATE" value={`${winRate}%`} color={parseFloat(winRate) >= 50 ? "text-orbital-success" : "text-orbital-danger"} />
            </div>
          )}

          {/* Last 5 Results */}
          {last5.length > 0 && (
            <HudCard label="ÚLTIMAS PARTIDAS">
              <div className="flex items-center gap-3 py-3">
                {last5.map(m => {
                  const won = m.winner === team.id;
                  const oppId = m.team1_id === team.id ? m.team2_id : m.team1_id;
                  const oppName = getTeamName(oppId, m.team1_id === team.id ? m.team2_string : m.team1_string);
                  const oppLogo = getTeamLogo(oppId);
                  return (
                    <Link key={m.id} href={`/partidas/${m.id}`} className="flex flex-col items-center gap-1.5 group">
                      <div className={`w-12 h-12 border flex items-center justify-center ${
                        won ? "bg-orbital-success/10 border-orbital-success/30" : "bg-orbital-danger/10 border-orbital-danger/30"
                      }`}>
                        {oppLogo ? (
                          <img src={oppLogo} alt={oppName} className="w-8 h-8 object-contain group-hover:scale-110 transition-transform" />
                        ) : (
                          <Shield size={18} className="text-orbital-text-dim group-hover:text-orbital-purple transition-colors" />
                        )}
                      </div>
                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim truncate max-w-[60px] text-center">
                        {oppName}
                      </span>
                      <span className={`font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider px-2 py-0.5 ${
                        won ? "bg-orbital-success/20 text-orbital-success" : "bg-orbital-danger/20 text-orbital-danger"
                      }`}>
                        {won ? "WON" : "LOST"}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </HudCard>
          )}

          {/* Map Win Statistics */}
          {mapWinStats.length > 0 && (
            <HudCard label="WINRATE POR MAPA">
              <div className="space-y-2 py-2">
                {mapWinStats.map(ms => (
                  <div key={ms.map} className="flex items-center gap-3">
                    <div className="w-24 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text">
                      {ms.map.replace("de_", "").charAt(0).toUpperCase() + ms.map.replace("de_", "").slice(1)}
                    </div>
                    <div className="flex-1 h-5 bg-[#0A0A0A] border border-orbital-border relative overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          ms.winRate >= 60 ? "bg-orbital-success/40" : ms.winRate >= 40 ? "bg-orbital-warning/40" : "bg-orbital-danger/40"
                        }`}
                        style={{ width: `${ms.winRate}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text">
                          {ms.winRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="w-16 font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim text-right">
                      {ms.wins}/{ms.played}
                    </div>
                  </div>
                ))}
              </div>
            </HudCard>
          )}
        </motion.div>
      )}

      {tab === "roster" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Roster with Stats */}
          {playerAggregated.length > 0 ? (
            <HudCard label="JOGADORES">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Jogador</th>
                      <th className="text-center">Mapas</th>
                      <th className="text-center">K</th>
                      <th className="text-center">D</th>
                      <th className="text-center">A</th>
                      <th className="text-center">K/D</th>
                      <th className="text-center">ADR</th>
                      <th className="text-center">HS%</th>
                      <th className="text-center">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playerAggregated.map(p => (
                      <tr key={p.steamId}>
                        <td>
                          <div className="flex items-center gap-2">
                            <Link href={`/perfil/${p.steamId}`} className="text-orbital-text hover:text-orbital-purple transition-colors font-medium">
                              {p.name}
                            </Link>
                            {players.find(pl => pl.steamId === p.steamId)?.isCaptain && (
                              <span className="px-1.5 py-0.5 bg-orbital-purple/10 border border-orbital-purple/30 font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-orbital-purple">
                                CAP
                              </span>
                            )}
                            {players.find(pl => pl.steamId === p.steamId)?.isCoach && (
                              <span className="px-1.5 py-0.5 bg-orbital-warning/10 border border-orbital-warning/30 font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-orbital-warning">
                                COACH
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-center text-orbital-text-dim">{p.maps}</td>
                        <td className="text-center">{p.kills}</td>
                        <td className="text-center text-orbital-text-dim">{p.deaths}</td>
                        <td className="text-center text-orbital-text-dim">{p.assists}</td>
                        <td className={`text-center font-bold ${p.kdr >= 1.2 ? "text-orbital-success" : p.kdr < 0.9 ? "text-orbital-danger" : "text-orbital-text"}`}>
                          {p.kdr.toFixed(2)}
                        </td>
                        <td className="text-center">{p.adr.toFixed(1)}</td>
                        <td className="text-center text-orbital-text-dim">{p.hsp.toFixed(1)}%</td>
                        <td className={`text-center font-bold ${p.avgRating >= 1.1 ? "text-orbital-success" : p.avgRating < 0.9 ? "text-orbital-danger" : "text-orbital-text"}`}>
                          {p.avgRating.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </HudCard>
          ) : (
            <HudCard label="JOGADORES">
              {players.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Steam ID</th>
                        <th>Função</th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.map(p => (
                        <tr key={p.steamId}>
                          <td>
                            <Link href={`/perfil/${p.steamId}`} className="text-orbital-text hover:text-orbital-purple transition-colors">
                              {p.name || p.steamId}
                            </Link>
                          </td>
                          <td className="text-orbital-text-dim">{p.steamId}</td>
                          <td>
                            {p.isCaptain && <span className="text-orbital-purple text-[0.6rem]">Capitão</span>}
                            {p.isCoach && <span className="text-orbital-warning text-[0.6rem]">Coach</span>}
                            {!p.isCaptain && !p.isCoach && <span className="text-orbital-text-dim text-[0.6rem]">Jogador</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Users size={20} className="text-orbital-border mx-auto mb-2" />
                  <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
                    Nenhum jogador cadastrado
                  </p>
                </div>
              )}
            </HudCard>
          )}
        </motion.div>
      )}

      {tab === "matches" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Match stats summary */}
          {finishedMatches.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-orbital-card border border-orbital-border p-4 text-center">
                <div className="font-[family-name:var(--font-jetbrains)] text-2xl font-bold text-orbital-text">
                  {streak.count}
                </div>
                <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-text-dim mt-1">
                  {streak.type === "W" ? "SEQUÊNCIA DE VITÓRIAS" : streak.type === "L" ? "SEQUÊNCIA DE DERROTAS" : "NEUTRO"}
                </div>
              </div>
              <div className="bg-orbital-card border border-orbital-border p-4 text-center">
                <div className={`font-[family-name:var(--font-jetbrains)] text-2xl font-bold ${parseFloat(winRate) >= 50 ? "text-orbital-success" : "text-orbital-danger"}`}>
                  {winRate}%
                </div>
                <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-text-dim mt-1">
                  WIN RATE
                </div>
              </div>
            </div>
          )}

          {/* Head-to-Head */}
          {h2h.length > 0 && (
            <HudCard label="HEAD-TO-HEAD">
              <div className="space-y-1 mt-2">
                {h2h.map(opp => {
                  const wr = opp.matches > 0 ? Math.round((opp.wins / opp.matches) * 100) : 0;
                  return (
                    <Link key={opp.id} href={`/times/${opp.id}`} className="flex items-center gap-3 p-2.5 hover:bg-white/[0.02] transition-colors group">
                      <div className="w-6 h-6 flex items-center justify-center shrink-0">
                        {opp.logo ? (
                          <img src={opp.logo} alt={opp.name} className="w-5 h-5 object-contain" />
                        ) : (
                          <Shield size={14} className="text-orbital-text-dim/30" />
                        )}
                      </div>
                      <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text group-hover:text-orbital-purple transition-colors flex-1 truncate">
                        {opp.name}
                      </span>
                      <span className={`font-[family-name:var(--font-jetbrains)] text-xs font-bold ${opp.wins > opp.losses ? "text-orbital-success" : opp.wins < opp.losses ? "text-orbital-danger" : "text-orbital-text-dim"}`}>
                        {opp.wins}W - {opp.losses}L
                      </span>
                      <div className="w-16 h-1.5 bg-orbital-border shrink-0">
                        <div className={`h-full ${wr >= 50 ? "bg-orbital-success" : "bg-orbital-danger"}`} style={{ width: `${wr}%` }} />
                      </div>
                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-text-dim w-6 text-right">
                        {opp.matches}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </HudCard>
          )}

          {/* Upcoming matches */}
          {(() => {
            const upcoming = matches.filter(m => !m.end_time && !m.cancelled);
            if (upcoming.length === 0) return null;
            return (
              <HudCard label="PRÓXIMAS PARTIDAS">
                <div className="space-y-2 py-1">
                  {upcoming.map(m => {
                    const oppId = m.team1_id === team.id ? m.team2_id : m.team1_id;
                    const oppName = getTeamName(oppId, m.team1_id === team.id ? m.team2_string : m.team1_string);
                    const statusType = getStatusType(m);
                    return (
                      <Link key={m.id} href={`/partidas/${m.id}`} className="flex items-center justify-between px-3 py-2.5 bg-[#0A0A0A] border border-orbital-border hover:border-orbital-purple/30 transition-all group">
                        <div className="flex items-center gap-3">
                          <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text">
                            {team.name}
                          </span>
                          <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
                            {m.team1_score} : {m.team2_score}
                          </span>
                          <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text">
                            {oppName}
                          </span>
                        </div>
                        {statusType === "live" && (
                          <span className="flex items-center gap-1 font-[family-name:var(--font-orbitron)] text-[0.5rem] text-orbital-live">
                            <span className="w-1.5 h-1.5 rounded-full bg-orbital-live animate-pulse" /> LIVE
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </HudCard>
            );
          })()}

          {/* Recent results */}
          <HudCard label="RESULTADOS RECENTES">
            {finishedMatches.length > 0 ? (
              <div className="space-y-1 py-1">
                {finishedMatches.slice(0, 20).map(m => {
                  const won = m.winner === team.id;
                  const isTeam1 = m.team1_id === team.id;
                  const teamScore = isTeam1 ? m.team1_score : m.team2_score;
                  const oppScore = isTeam1 ? m.team2_score : m.team1_score;
                  const oppId = isTeam1 ? m.team2_id : m.team1_id;
                  const oppName = getTeamName(oppId, isTeam1 ? m.team2_string : m.team1_string);

                  return (
                    <Link key={m.id} href={`/partidas/${m.id}`} className="flex items-center gap-3 px-3 py-2.5 bg-[#0A0A0A] border border-orbital-border hover:border-orbital-purple/30 transition-all group">
                      <span className={`w-5 h-5 flex items-center justify-center font-[family-name:var(--font-orbitron)] text-[0.5rem] ${
                        won ? "bg-orbital-success/20 text-orbital-success" : "bg-orbital-danger/20 text-orbital-danger"
                      }`}>
                        {won ? "W" : "L"}
                      </span>
                      <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text flex-1">
                        {team.name}
                      </span>
                      <span className={`font-[family-name:var(--font-jetbrains)] text-sm font-bold ${won ? "text-orbital-success" : "text-orbital-danger"}`}>
                        {teamScore} : {oppScore}
                      </span>
                      <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim flex-1 text-right group-hover:text-orbital-purple transition-colors">
                        {oppName}
                      </span>
                      {m.title && (
                        <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim/50 hidden sm:inline">
                          {m.title}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6">
                <Swords size={20} className="text-orbital-border mx-auto mb-2" />
                <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
                  Nenhuma partida encontrada
                </p>
              </div>
            )}
          </HudCard>
        </motion.div>
      )}

      {tab === "stats" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Last 5 visual */}
          {last5.length > 0 && (
            <HudCard label="ÚLTIMAS 5 PARTIDAS">
              <div className="flex items-center justify-center gap-4 py-4">
                {last5.map(m => {
                  const won = m.winner === team.id;
                  const oppId = m.team1_id === team.id ? m.team2_id : m.team1_id;
                  const oppName = getTeamName(oppId, m.team1_id === team.id ? m.team2_string : m.team1_string);
                  const oppLogo = getTeamLogo(oppId);
                  return (
                    <Link key={m.id} href={`/partidas/${m.id}`} className="flex flex-col items-center gap-2 group">
                      <div className={`w-14 h-14 border-2 flex items-center justify-center transition-all ${
                        won ? "border-orbital-success/40 bg-orbital-success/5" : "border-orbital-danger/40 bg-orbital-danger/5"
                      } group-hover:border-orbital-purple/50`}>
                        {oppLogo ? (
                          <img src={oppLogo} alt={oppName} className="w-9 h-9 object-contain group-hover:scale-110 transition-transform" />
                        ) : (
                          <Shield size={20} className="text-orbital-text-dim group-hover:text-orbital-purple transition-colors" />
                        )}
                      </div>
                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim max-w-[70px] text-center truncate">
                        {oppName}
                      </span>
                      <span className={`font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider px-2 py-0.5 ${
                        won ? "bg-orbital-success/20 text-orbital-success" : "bg-orbital-danger/20 text-orbital-danger"
                      }`}>
                        {won ? "WON" : "LOST"}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </HudCard>
          )}

          {/* Map Win Stats */}
          {mapWinStats.length > 0 && (
            <HudCard label="WINRATE POR MAPA">
              <div className="space-y-3 py-2">
                {mapWinStats.map(ms => {
                  const mapLabel = ms.map.replace("de_", "");
                  const displayName = mapLabel.charAt(0).toUpperCase() + mapLabel.slice(1);
                  return (
                    <div key={ms.map} className="flex items-center gap-3">
                      <div className="w-20 font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-wider text-orbital-text">
                        {displayName}
                      </div>
                      <div className="flex-1 h-6 bg-[#0A0A0A] border border-orbital-border relative overflow-hidden">
                        <div
                          className={`h-full ${
                            ms.winRate >= 60 ? "bg-gradient-to-r from-orbital-success/30 to-orbital-success/50"
                              : ms.winRate >= 40 ? "bg-gradient-to-r from-orbital-warning/30 to-orbital-warning/50"
                              : "bg-gradient-to-r from-orbital-danger/30 to-orbital-danger/50"
                          }`}
                          style={{ width: `${Math.max(ms.winRate, 5)}%` }}
                        />
                        <div className="absolute inset-0 flex items-center px-2">
                          <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text font-bold">
                            {ms.winRate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="w-12 font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim text-right">
                        {ms.wins}W {ms.played - ms.wins}L
                      </div>
                    </div>
                  );
                })}
              </div>
            </HudCard>
          )}

          {/* Team Totals */}
          {playerAggregated.length > 0 && (
            <HudCard label="STATS DOS JOGADORES">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Jogador</th>
                      <th className="text-center">Mapas</th>
                      <th className="text-center">Kills</th>
                      <th className="text-center">Deaths</th>
                      <th className="text-center">K/D</th>
                      <th className="text-center">ADR</th>
                      <th className="text-center">HS%</th>
                      <th className="text-center">Flash A.</th>
                      <th className="text-center">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playerAggregated.map(p => (
                      <tr key={p.steamId}>
                        <td>
                          <Link href={`/perfil/${p.steamId}`} className="text-orbital-text hover:text-orbital-purple transition-colors">
                            {p.name}
                          </Link>
                        </td>
                        <td className="text-center text-orbital-text-dim">{p.maps}</td>
                        <td className="text-center">{p.kills}</td>
                        <td className="text-center text-orbital-text-dim">{p.deaths}</td>
                        <td className={`text-center font-bold ${p.kdr >= 1.2 ? "text-orbital-success" : p.kdr < 0.9 ? "text-orbital-danger" : "text-orbital-text"}`}>
                          {p.kdr.toFixed(2)}
                        </td>
                        <td className="text-center">{p.adr.toFixed(1)}</td>
                        <td className="text-center text-orbital-text-dim">{p.hsp.toFixed(1)}%</td>
                        <td className="text-center text-orbital-text-dim">{p.flashAssists}</td>
                        <td className={`text-center font-bold ${p.avgRating >= 1.1 ? "text-orbital-success" : p.avgRating < 0.9 ? "text-orbital-danger" : "text-orbital-text"}`}>
                          {p.avgRating.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </HudCard>
          )}

          {mapWinStats.length === 0 && playerAggregated.length === 0 && (
            <HudCard className="text-center py-8">
              <BarChart3 size={24} className="text-orbital-border mx-auto mb-3" />
              <p className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text-dim">
                Nenhuma estatística disponível
              </p>
            </HudCard>
          )}
        </motion.div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-orbital-card border border-orbital-border p-4 text-center">
      <div className={`font-[family-name:var(--font-jetbrains)] text-2xl font-bold ${color || "text-orbital-text"}`}>
        {value}
      </div>
      <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-text-dim mt-1">
        {label}
      </div>
    </div>
  );
}
