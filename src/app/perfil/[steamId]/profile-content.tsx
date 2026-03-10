"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Target, Skull, Crosshair, Zap, Award, TrendingUp, Shield, Flame, Swords, Map, Key, Eye, EyeOff, Copy, Check, BarChart3 } from "lucide-react";
import Link from "next/link";
import { HudCard, StatBox } from "@/components/hud-card";
import { Match, getStatusText, getStatusType } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";

interface ProfileStats {
  steam_id: string;
  name: string;
  wins: number;
  total_maps: number;
  total_rounds: number;
  kills: number;
  deaths: number;
  assists: number;
  headshot_kills: number;
  flash_assists: number;
  damage: number;
  rating: number;
  kdr: number;
  hsp: number;
  average_rating: number;
  kast: number;
  contribution_score: number;
  mvp: number;
  firstkill_t: number;
  firstkill_ct: number;
  firstdeath_t: number;
  firstdeath_ct: number;
}

export function ProfileContent({ steamId }: { steamId: string }) {
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [mapCounts, setMapCounts] = useState<{ map: string; count: number }[]>([]);
  const [mapPerformance, setMapPerformance] = useState<{ map: string; wins: number; total: number; avgRating: number; kills: number; deaths: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { user } = useAuth();
  const isOwnProfile = user?.steam_id === steamId;
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // Buscar stats individuais por partida
        const res = await fetch(`/api/playerstats/${steamId}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        const rawStats = data.playerstats || data.playerStats || data;
        const matches: Record<string, unknown>[] = Array.isArray(rawStats) ? rawStats : [rawStats];

        if (matches.length === 0) throw new Error("No stats");

        // Agregar stats de todas as partidas
        const aggregated: ProfileStats = {
          steam_id: steamId,
          name: (matches[0].name as string) || steamId,
          wins: 0,
          total_maps: matches.length,
          total_rounds: 0,
          kills: 0,
          deaths: 0,
          assists: 0,
          headshot_kills: 0,
          flash_assists: 0,
          damage: 0,
          rating: 0,
          kdr: 0,
          hsp: 0,
          average_rating: 0,
          kast: 0,
          contribution_score: 0,
          mvp: 0,
          firstkill_t: 0,
          firstkill_ct: 0,
          firstdeath_t: 0,
          firstdeath_ct: 0,
        };

        let totalRating = 0;
        for (const m of matches) {
          aggregated.kills += (m.kills as number) || 0;
          aggregated.deaths += (m.deaths as number) || 0;
          aggregated.assists += (m.assists as number) || 0;
          aggregated.headshot_kills += (m.headshot_kills as number) || 0;
          aggregated.flash_assists += (m.flashbang_assists as number) || (m.flash_assists as number) || 0;
          aggregated.damage += (m.damage as number) || 0;
          aggregated.total_rounds += (m.roundsplayed as number) || 0;
          aggregated.contribution_score += (m.contribution_score as number) || 0;
          aggregated.mvp += (m.mvp as number) || 0;
          aggregated.firstkill_t += (m.firstkill_t as number) || 0;
          aggregated.firstkill_ct += (m.firstkill_ct as number) || 0;
          aggregated.firstdeath_t += (m.firstdeath_t as number) || 0;
          aggregated.firstdeath_ct += (m.firstdeath_ct as number) || 0;
          aggregated.kast += (m.kast as number) || 0;
          totalRating += (m.average_rating as number) || (m.rating as number) || 0;
        }

        aggregated.average_rating = matches.length > 0 ? totalRating / matches.length : 0;
        aggregated.kdr = aggregated.deaths > 0 ? aggregated.kills / aggregated.deaths : aggregated.kills;
        aggregated.hsp = aggregated.kills > 0 ? (aggregated.headshot_kills / aggregated.kills) * 100 : 0;
        aggregated.kast = matches.length > 0 ? aggregated.kast / matches.length : 0;

        setStats(aggregated);
      } catch {
        setError(true);
      }

      // Buscar partidas recentes e map stats
      try {
        const matchRes = await fetch(`/api/matches`);
        if (matchRes.ok) {
          const matchData = await matchRes.json();
          const allMatches: Match[] = matchData.matches || [];
          // Filtrar partidas deste jogador (precisa verificar player stats)
          // Por ora, buscar mapstats do jogador para saber quais mapas jogou
          const playerMatches = allMatches
            .filter((m: Match) => m.team1_string?.includes(steamId) || m.team2_string?.includes(steamId))
            .sort((a: Match, b: Match) => b.id - a.id)
            .slice(0, 10);

          // Buscar map stats para contar mapas jogados e performance por mapa
          const mapCount: Record<string, number> = {};
          const mapPerf: Record<string, { wins: number; total: number; totalRating: number; kills: number; deaths: number }> = {};

          for (const m of playerMatches.slice(0, 20)) {
            try {
              const [msRes, psRes] = await Promise.all([
                fetch(`/api/mapstats/${m.id}`).then(r => r.ok ? r.json() : null),
                fetch(`/api/playerstats/match/${m.id}`).then(r => r.ok ? r.json() : null),
              ]);
              const maps = msRes?.mapstats || msRes?.mapStats || [];
              const pStats = psRes?.playerstats || psRes?.playerStats || [];
              const playerEntries = pStats.filter((p: { steam_id: string }) => p.steam_id === steamId);

              for (const ms of maps) {
                if (!ms.map_name) continue;
                mapCount[ms.map_name] = (mapCount[ms.map_name] || 0) + 1;

                if (!mapPerf[ms.map_name]) {
                  mapPerf[ms.map_name] = { wins: 0, total: 0, totalRating: 0, kills: 0, deaths: 0 };
                }
                mapPerf[ms.map_name].total++;

                // Check if player's team won this map
                const playerEntry = playerEntries.find((p: { map_id: number }) => p.map_id === ms.id);
                if (playerEntry) {
                  if (ms.winner === playerEntry.team_id) {
                    mapPerf[ms.map_name].wins++;
                  }
                  mapPerf[ms.map_name].totalRating += playerEntry.rating || playerEntry.average_rating || 0;
                  mapPerf[ms.map_name].kills += playerEntry.kills || 0;
                  mapPerf[ms.map_name].deaths += playerEntry.deaths || 0;
                }
              }
            } catch { /* skip */ }
          }

          setMapCounts(
            Object.entries(mapCount)
              .map(([map, count]) => ({ map, count }))
              .sort((a, b) => b.count - a.count)
          );

          setMapPerformance(
            Object.entries(mapPerf)
              .map(([map, d]) => ({
                map,
                wins: d.wins,
                total: d.total,
                avgRating: d.total > 0 ? d.totalRating / d.total : 0,
                kills: d.kills,
                deaths: d.deaths,
              }))
              .sort((a, b) => b.total - a.total)
          );
        }
      } catch { /* não crítico */ }

      // Buscar partidas recentes onde o jogador participou (via playerstats)
      try {
        const res = await fetch(`/api/playerstats/${steamId}`);
        if (res.ok) {
          const data = await res.json();
          const rawStats = data.playerstats || data.playerStats || data;
          const statsArr: { match_id: number }[] = Array.isArray(rawStats) ? rawStats : [];
          const matchIds = [...new Set(statsArr.map(s => s.match_id))].sort((a, b) => b - a).slice(0, 5);

          const matchPromises = matchIds.map(async (id) => {
            try {
              const r = await fetch(`/api/matches/${id}`);
              if (r.ok) {
                const d = await r.json();
                return d.match as Match;
              }
            } catch { /* skip */ }
            return null;
          });
          const resolved = await Promise.all(matchPromises);
          setRecentMatches(resolved.filter((m): m is Match => m !== null));
        }
      } catch { /* não crítico */ }

      // Buscar dados agregados do leaderboard para wins
      try {
        const res = await fetch(`/api/leaderboard/players`);
        if (res.ok) {
          const data = await res.json();
          const entry = (data.leaderboard || []).find((e: { steamId: string }) => e.steamId === steamId);
          if (entry) {
            setStats(prev => prev ? { ...prev, wins: entry.wins || 0 } : prev);
          }
        }
      } catch {
        // não crítico
      }

      setLoading(false);
    }
    fetchData();
  }, [steamId]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        <div className="py-4">
          <Link href="/leaderboard" className="inline-flex items-center gap-2 text-orbital-text-dim hover:text-orbital-purple transition-colors font-[family-name:var(--font-jetbrains)] text-xs">
            <ArrowLeft size={14} />
            Voltar
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-20 h-20 rounded-full bg-orbital-border animate-pulse" />
          <div className="h-4 w-40 bg-orbital-border animate-pulse" />
          <div className="h-3 w-24 bg-orbital-border animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        <div className="py-4">
          <Link href="/leaderboard" className="inline-flex items-center gap-2 text-orbital-text-dim hover:text-orbital-purple transition-colors font-[family-name:var(--font-jetbrains)] text-xs">
            <ArrowLeft size={14} />
            Voltar
          </Link>
        </div>
        <HudCard className="text-center py-12">
          <Skull size={32} className="text-orbital-border mx-auto mb-4" />
          <p className="font-[family-name:var(--font-orbitron)] text-sm text-orbital-text-dim">
            Jogador não encontrado
          </p>
          <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim mt-2">
            Steam ID: {steamId}
          </p>
        </HudCard>
      </div>
    );
  }

  const adr = stats.total_rounds > 0 ? Math.round(stats.damage / stats.total_rounds) : 0;
  const hsp = stats.kills > 0 ? Math.round((stats.headshot_kills / stats.kills) * 100) : (stats.hsp || 0);
  const kdr = stats.kdr || (stats.deaths > 0 ? (stats.kills / stats.deaths) : stats.kills);
  const avgRating = stats.average_rating || stats.rating || 0;
  const totalFk = (stats.firstkill_t || 0) + (stats.firstkill_ct || 0);
  const totalFd = (stats.firstdeath_t || 0) + (stats.firstdeath_ct || 0);

  const ratingColor = avgRating >= 1.2 ? "text-orbital-success" : avgRating >= 0.8 ? "text-orbital-text" : "text-orbital-danger";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
      {/* Back */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-4">
        <Link href="/leaderboard" className="inline-flex items-center gap-2 text-orbital-text-dim hover:text-orbital-purple transition-colors font-[family-name:var(--font-jetbrains)] text-xs">
          <ArrowLeft size={14} />
          Voltar ao Ranking
        </Link>
      </motion.div>

      {/* Profile Header */}
      <HudCard glow className="mb-6" label="PERFIL">
        <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-2 border-orbital-purple/50 overflow-hidden" style={{ boxShadow: "0 0 25px rgba(168,85,247,0.3)" }}>
              <div className="w-full h-full bg-orbital-border flex items-center justify-center">
                <span className="font-[family-name:var(--font-orbitron)] text-2xl text-orbital-text-dim">
                  {stats.name?.charAt(0)?.toUpperCase() || "?"}
                </span>
              </div>
            </div>
            {/* Rating badge */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-orbital-card border border-orbital-border px-3 py-0.5">
              <span className={`font-[family-name:var(--font-jetbrains)] text-sm font-bold ${ratingColor}`}>
                {avgRating.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Info */}
          <div className="text-center sm:text-left flex-1">
            <h1 className="font-[family-name:var(--font-orbitron)] text-xl sm:text-2xl font-bold text-orbital-text tracking-wider">
              {stats.name}
            </h1>
            <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim mt-1">
              {steamId}
            </p>
            <div className="flex items-center gap-4 mt-3 justify-center sm:justify-start">
              <div className="flex items-center gap-1.5">
                <Award size={14} className="text-orbital-success" />
                <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text">
                  {stats.wins || 0} vitórias
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp size={14} className="text-orbital-purple" />
                <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text">
                  {stats.total_maps || 0} mapas
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Flame size={14} className="text-orbital-warning" />
                <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text">
                  {stats.mvp || 0} MVPs
                </span>
              </div>
            </div>
          </div>
        </div>
      </HudCard>

      {/* API Key (own profile only) */}
      {isOwnProfile && user?.api_key && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <HudCard label="API KEY" className="mb-6">
            <div className="flex items-center gap-3 py-1">
              <Key size={14} className="text-orbital-purple shrink-0" />
              <div className="flex-1 flex items-center gap-2 bg-[#0A0A0A] border border-orbital-border px-3 py-2 overflow-hidden">
                <code className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text truncate flex-1">
                  {showApiKey ? user.api_key : "••••••••••••••••••••••••••••••"}
                </code>
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="text-orbital-text-dim hover:text-orbital-purple transition-colors shrink-0"
                  title={showApiKey ? "Ocultar" : "Mostrar"}
                >
                  {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(user.api_key || "");
                    setApiKeyCopied(true);
                    setTimeout(() => setApiKeyCopied(false), 2000);
                  }}
                  className="text-orbital-text-dim hover:text-orbital-purple transition-colors shrink-0"
                  title="Copiar"
                >
                  {apiKeyCopied ? <Check size={14} className="text-orbital-success" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </HudCard>
        </motion.div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <HudCard delay={0.1}>
          <StatBox label="KILLS" value={stats.kills} />
        </HudCard>
        <HudCard delay={0.15}>
          <StatBox label="DEATHS" value={stats.deaths} />
        </HudCard>
        <HudCard delay={0.2}>
          <StatBox label="ASSISTS" value={stats.assists} />
        </HudCard>
        <HudCard delay={0.25}>
          <StatBox label="K/D" value={kdr.toFixed(2)} />
        </HudCard>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <HudCard delay={0.3} label="COMBATE">
          <div className="space-y-3 pt-2">
            <StatRow icon={<Crosshair size={14} className="text-orbital-purple" />} label="HS%" value={`${hsp}%`} />
            <StatRow icon={<Target size={14} className="text-orbital-success" />} label="ADR" value={adr.toString()} />
            <StatRow icon={<Zap size={14} className="text-orbital-warning" />} label="Flash Assists" value={stats.flash_assists?.toString() || "0"} />
            <StatRow icon={<Award size={14} className="text-orbital-purple" />} label="KAST" value={stats.kast ? `${(stats.kast * 100).toFixed(1)}%` : "N/A"} />
            <StatRow icon={<TrendingUp size={14} className="text-orbital-success" />} label="Rating" value={avgRating.toFixed(2)} highlight={ratingColor} />
          </div>
        </HudCard>

        <HudCard delay={0.35} label="ABERTURAS">
          <div className="space-y-3 pt-2">
            <StatRow icon={<Target size={14} className="text-orbital-success" />} label="First Kills (T)" value={(stats.firstkill_t || 0).toString()} />
            <StatRow icon={<Target size={14} className="text-orbital-success" />} label="First Kills (CT)" value={(stats.firstkill_ct || 0).toString()} />
            <StatRow icon={<Skull size={14} className="text-orbital-danger" />} label="First Deaths (T)" value={(stats.firstdeath_t || 0).toString()} />
            <StatRow icon={<Skull size={14} className="text-orbital-danger" />} label="First Deaths (CT)" value={(stats.firstdeath_ct || 0).toString()} />
            <StatRow icon={<Shield size={14} className="text-orbital-purple" />} label="FK/FD" value={totalFd > 0 ? (totalFk / totalFd).toFixed(2) : totalFk.toString()} />
          </div>
        </HudCard>
      </div>

      {/* Rounds info */}
      <HudCard delay={0.4} label="GERAL">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2">
          <StatBox label="ROUNDS" value={stats.total_rounds || 0} />
          <StatBox label="HEADSHOTS" value={stats.headshot_kills || 0} />
          <StatBox label="DANO TOTAL" value={stats.damage || 0} />
          <StatBox label="CONTRIB." value={stats.contribution_score || 0} />
        </div>
      </HudCard>

      {/* Recent Matches */}
      {recentMatches.length > 0 && (
        <HudCard delay={0.45} label="ÚLTIMAS PARTIDAS" className="mt-6">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Time 1</th>
                  <th>Placar</th>
                  <th>Time 2</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentMatches.map((match) => {
                  const st = getStatusType(match);
                  const stText = getStatusText(match);
                  return (
                    <tr key={match.id}>
                      <td>
                        <Link href={`/partidas/${match.id}`} className="text-orbital-purple hover:underline">
                          {match.id}
                        </Link>
                      </td>
                      <td>{match.team1_string || `Time ${match.team1_id}`}</td>
                      <td className="text-center font-bold">
                        {match.team1_score} - {match.team2_score}
                      </td>
                      <td>{match.team2_string || `Time ${match.team2_id}`}</td>
                      <td>
                        <span className={`text-[0.65rem] ${
                          st === "live" ? "text-orbital-live" :
                          st === "cancelled" ? "text-orbital-danger" :
                          "text-orbital-text-dim"
                        }`}>
                          {stText}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </HudCard>
      )}

      {/* Per-Map Performance */}
      {mapPerformance.length > 0 && (
        <HudCard delay={0.5} label="PERFORMANCE POR MAPA" className="mt-6">
          <div className="space-y-3 py-2">
            {mapPerformance.map(({ map, wins, total, avgRating, kills, deaths }) => {
              const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
              const kd = deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(2);
              return (
                <div key={map} className="bg-[#0A0A0A] border border-orbital-border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Map size={12} className="text-orbital-purple" />
                      <span className="font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-text">
                        {map.replace("de_", "").toUpperCase()}
                      </span>
                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim">
                        {total} {total === 1 ? "partida" : "partidas"}
                      </span>
                    </div>
                    <span className={`font-[family-name:var(--font-jetbrains)] text-xs font-bold ${
                      avgRating >= 1.2 ? "text-orbital-success" : avgRating >= 0.8 ? "text-orbital-text" : "text-orbital-danger"
                    }`}>
                      {avgRating.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Win rate bar */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim">
                          Win Rate
                        </span>
                        <span className={`font-[family-name:var(--font-jetbrains)] text-[0.55rem] font-bold ${
                          winRate >= 60 ? "text-orbital-success" : winRate >= 40 ? "text-orbital-text" : "text-orbital-danger"
                        }`}>
                          {winRate}% ({wins}W / {total - wins}L)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-orbital-border">
                        <div
                          className={`h-full transition-all ${winRate >= 60 ? "bg-orbital-success" : winRate >= 40 ? "bg-orbital-purple" : "bg-orbital-danger"}`}
                          style={{ width: `${winRate}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim">
                        K/D: <span className="text-orbital-text font-bold">{kd}</span>
                      </span>
                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim">
                        <BarChart3 size={10} className="inline text-orbital-purple mr-0.5" />
                        {kills}K / {deaths}D
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </HudCard>
      )}
    </div>
  );
}

function StatRow({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">{label}</span>
      </div>
      <span className={`font-[family-name:var(--font-jetbrains)] text-sm font-bold ${highlight || "text-orbital-text"}`}>
        {value}
      </span>
    </div>
  );
}
