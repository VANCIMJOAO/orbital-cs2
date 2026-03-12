"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Target, Skull, Crosshair, Zap, Award, TrendingUp, Flame, Map, BarChart3 } from "lucide-react";
import Link from "next/link";
import { HudCard, StatBox } from "@/components/hud-card";
import { Match, getStatusText, getStatusType } from "@/lib/api";
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

interface MatchDataPoint {
  matchId: number;
  rating: number;
  kd: number;
  adr: number;
  hsp: number;
  kills: number;
  deaths: number;
}

// Rating formula matching G5API Utils.getRating
function calcRating(kills: number, roundsplayed: number, deaths: number, k1: number, k2: number, k3: number, k4: number, k5: number): number {
  if (roundsplayed === 0) return 0;
  const AverageKPR = 0.679;
  const AverageSPR = 0.317;
  const AverageRMK = 1.277;
  const KillRating = kills / roundsplayed / AverageKPR;
  const SurvivalRating = (roundsplayed - deaths) / roundsplayed / AverageSPR;
  const killcount = k1 + 4 * k2 + 9 * k3 + 16 * k4 + 25 * k5;
  const RoundsWithMultipleKillsRating = killcount / roundsplayed / AverageRMK;
  return +((KillRating + 0.7 * SurvivalRating + RoundsWithMultipleKillsRating) / 2.7).toFixed(2);
}

export function ProfileContent({ steamId }: { steamId: string }) {
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [mapCounts, setMapCounts] = useState<{ map: string; count: number }[]>([]);
  const [playerClips, setPlayerClips] = useState<{ id: number; match_id: number; map_number: number; rank: number; player_name: string; kills_count: number; score: number; description: string; round_number: number; video_file: string; thumbnail_file: string; duration_s: number; team1_string: string; team2_string: string }[]>([]);
  const [mapPerformance, setMapPerformance] = useState<{ map: string; wins: number; total: number; avgRating: number; kills: number; deaths: number }[]>([]);
  const [matchHistory, setMatchHistory] = useState<MatchDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

        let totalK1 = 0, totalK2 = 0, totalK3 = 0, totalK4 = 0, totalK5 = 0;
        const history: MatchDataPoint[] = [];
        for (const m of matches) {
          const mKills = (m.kills as number) || 0;
          const mDeaths = (m.deaths as number) || 0;
          const mHsk = (m.headshot_kills as number) || 0;
          const mDmg = (m.damage as number) || 0;
          const mRounds = (m.roundsplayed as number) || 0;
          const mk1 = (m.k1 as number) || 0, mk2 = (m.k2 as number) || 0;
          const mk3 = (m.k3 as number) || 0, mk4 = (m.k4 as number) || 0, mk5 = (m.k5 as number) || 0;

          aggregated.kills += mKills;
          aggregated.deaths += mDeaths;
          aggregated.assists += (m.assists as number) || 0;
          aggregated.headshot_kills += mHsk;
          aggregated.flash_assists += (m.flashbang_assists as number) || (m.flash_assists as number) || 0;
          aggregated.damage += mDmg;
          aggregated.total_rounds += mRounds;
          aggregated.contribution_score += (m.contribution_score as number) || 0;
          aggregated.mvp += (m.mvp as number) || 0;
          aggregated.firstkill_t += (m.firstkill_t as number) || 0;
          aggregated.firstkill_ct += (m.firstkill_ct as number) || 0;
          aggregated.firstdeath_t += (m.firstdeath_t as number) || 0;
          aggregated.firstdeath_ct += (m.firstdeath_ct as number) || 0;
          aggregated.kast += (m.kast as number) || 0;
          totalK1 += mk1; totalK2 += mk2; totalK3 += mk3; totalK4 += mk4; totalK5 += mk5;

          history.push({
            matchId: (m.match_id as number) || 0,
            rating: calcRating(mKills, mRounds, mDeaths, mk1, mk2, mk3, mk4, mk5),
            kd: mDeaths > 0 ? +(mKills / mDeaths).toFixed(2) : mKills,
            adr: mRounds > 0 ? Math.round(mDmg / mRounds) : 0,
            hsp: mKills > 0 ? Math.round((mHsk / mKills) * 100) : 0,
            kills: mKills,
            deaths: mDeaths,
          });
        }

        // Sort by match_id ascending (chronological)
        history.sort((a, b) => a.matchId - b.matchId);
        setMatchHistory(history);

        aggregated.average_rating = calcRating(aggregated.kills, aggregated.total_rounds, aggregated.deaths, totalK1, totalK2, totalK3, totalK4, totalK5);
        aggregated.kdr = aggregated.deaths > 0 ? aggregated.kills / aggregated.deaths : aggregated.kills;
        aggregated.hsp = aggregated.kills > 0 ? (aggregated.headshot_kills / aggregated.kills) * 100 : 0;
        aggregated.kast = matches.length > 0 ? aggregated.kast / matches.length : 0;

        setStats(aggregated);
      } catch {
        setError(true);
      }

      // Buscar map performance usando os match_ids das playerstats
      try {
        const psRes = await fetch(`/api/playerstats/${steamId}`);
        if (psRes.ok) {
          const psData = await psRes.json();
          const rawPS = psData.playerstats || psData.playerStats || psData;
          const psArr: { match_id: number; map_id: number; team_id: number; kills: number; deaths: number; roundsplayed: number; k1: number; k2: number; k3: number; k4: number; k5: number }[] = Array.isArray(rawPS) ? rawPS : [];
          const matchIds = [...new Set(psArr.map(s => s.match_id))];

          const mapCount: Record<string, number> = {};
          const mapPerf: Record<string, { wins: number; total: number; totalRating: number; kills: number; deaths: number }> = {};

          // Fetch mapstats for each match in parallel
          const mapStatsResults = await Promise.all(
            matchIds.map(async (mid) => {
              try {
                const r = await fetch(`/api/mapstats/${mid}`);
                if (!r.ok) return [];
                const d = await r.json();
                return (d.mapstats || d.mapStats || []).map((ms: Record<string, unknown>) => ({ ...ms, _matchId: mid }));
              } catch { return []; }
            })
          );

          for (const mapStatsList of mapStatsResults) {
            for (const ms of mapStatsList) {
              if (!ms.map_name) continue;
              mapCount[ms.map_name] = (mapCount[ms.map_name] || 0) + 1;

              if (!mapPerf[ms.map_name]) {
                mapPerf[ms.map_name] = { wins: 0, total: 0, totalRating: 0, kills: 0, deaths: 0 };
              }
              mapPerf[ms.map_name].total++;

              // Find the player's stats entry for this map
              const playerEntry = psArr.find(p => p.match_id === ms._matchId && p.map_id === ms.id);
              if (playerEntry) {
                if (ms.winner === playerEntry.team_id) {
                  mapPerf[ms.map_name].wins++;
                }
                const pRating = calcRating(playerEntry.kills || 0, playerEntry.roundsplayed || 0, playerEntry.deaths || 0, playerEntry.k1 || 0, playerEntry.k2 || 0, playerEntry.k3 || 0, playerEntry.k4 || 0, playerEntry.k5 || 0);
                mapPerf[ms.map_name].totalRating += pRating;
                mapPerf[ms.map_name].kills += playerEntry.kills || 0;
                mapPerf[ms.map_name].deaths += playerEntry.deaths || 0;
              }
            }
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

      // Buscar highlights do jogador
      try {
        const res = await fetch(`/api/highlights/player/${steamId}`);
        if (res.ok) {
          const data = await res.json();
          setPlayerClips(data.clips || []);
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

      {/* Detailed Stats — GERAL + COMBATE side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <HudCard delay={0.3} label="GERAL">
          <div className="space-y-3 pt-2">
            <StatRow icon={<Target size={14} className="text-orbital-text-dim" />} label="Rounds" value={(stats.total_rounds || 0).toString()} />
            <StatRow icon={<Crosshair size={14} className="text-orbital-success" />} label="Headshots" value={(stats.headshot_kills || 0).toString()} />
            <StatRow icon={<Zap size={14} className="text-orbital-warning" />} label="Dano Total" value={(stats.damage || 0).toString()} />
            <StatRow icon={<Award size={14} className="text-orbital-purple" />} label="Contribuição" value={(stats.contribution_score || 0).toString()} />
            <StatRow icon={<TrendingUp size={14} className="text-orbital-success" />} label="Rating" value={avgRating.toFixed(2)} highlight={ratingColor} />
          </div>
        </HudCard>

        <HudCard delay={0.35} label="COMBATE">
          <div className="space-y-3 pt-2">
            <StatRow icon={<Crosshair size={14} className="text-orbital-purple" />} label="HS%" value={`${hsp}%`} />
            <StatRow icon={<Target size={14} className="text-orbital-success" />} label="ADR" value={adr.toString()} />
            <StatRow icon={<Zap size={14} className="text-orbital-warning" />} label="Flash Assists" value={stats.flash_assists?.toString() || "0"} />
            <StatRow icon={<Award size={14} className="text-orbital-purple" />} label="KAST" value={stats.kast ? `${stats.kast.toFixed(1)}%` : "N/A"} />
            <StatRow icon={<Flame size={14} className="text-orbital-warning" />} label="MVPs" value={(stats.mvp || 0).toString()} />
          </div>
        </HudCard>
      </div>

      {/* Evolution Charts */}
      {matchHistory.length >= 2 && (
        <HudCard delay={0.45} label="EVOLUÇÃO" className="mt-6">
          <div className="space-y-6 py-2">
            <EvolutionChart
              data={matchHistory.map(d => d.rating)}
              label="Rating"
              color="#A855F7"
              refLine={1.0}
              format={v => v.toFixed(2)}
            />
            <EvolutionChart
              data={matchHistory.map(d => d.kd)}
              label="K/D"
              color="#22C55E"
              refLine={1.0}
              format={v => v.toFixed(2)}
            />
            <EvolutionChart
              data={matchHistory.map(d => d.adr)}
              label="ADR"
              color="#F59E0B"
              format={v => Math.round(v).toString()}
            />
            <EvolutionChart
              data={matchHistory.map(d => d.hsp)}
              label="HS%"
              color="#EF4444"
              format={v => `${Math.round(v)}%`}
            />
          </div>
        </HudCard>
      )}

      {/* Recent Matches */}
      {recentMatches.length > 0 && (
        <HudCard delay={0.5} label="ÚLTIMAS PARTIDAS" className="mt-6">
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

      {/* Player Highlights */}
      {playerClips.length > 0 && (
        <HudCard delay={0.52} label="MELHORES MOMENTOS" className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 py-2">
            {playerClips.map(clip => (
              <div key={clip.id} className="bg-[#0A0A0A] border border-orbital-border overflow-hidden group">
                <video
                  controls
                  preload="metadata"
                  poster={clip.thumbnail_file ? `/api/highlights-proxy/${clip.thumbnail_file}` : undefined}
                  className="w-full aspect-video bg-black"
                >
                  <source src={`/api/highlights-proxy/${clip.video_file}`} type="video/mp4" />
                </video>
                <div className="p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] text-orbital-purple shrink-0">
                        #{clip.rank}
                      </span>
                      {clip.kills_count >= 2 && (
                        <span className="font-[family-name:var(--font-orbitron)] text-[0.45rem] text-orbital-purple bg-orbital-purple/10 px-1.5 py-0.5 shrink-0">
                          {clip.kills_count >= 5 ? "ACE" : `${clip.kills_count}K`}
                        </span>
                      )}
                      {clip.score > 0 && (
                        <span className="font-[family-name:var(--font-jetbrains)] text-[0.45rem] text-orbital-text-dim">
                          {clip.score}pts
                        </span>
                      )}
                    </div>
                    {clip.round_number && (
                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.45rem] text-orbital-text-dim shrink-0">
                        R{clip.round_number}
                      </span>
                    )}
                  </div>
                  {(clip.team1_string || clip.team2_string) && (
                    <Link
                      href={`/partidas/${clip.match_id}`}
                      className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-text-dim hover:text-orbital-purple transition-colors block mt-1 truncate"
                    >
                      {clip.team1_string} vs {clip.team2_string}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </HudCard>
      )}

      {/* Per-Map Performance */}
      {mapPerformance.length > 0 && (
        <HudCard delay={0.55} label="PERFORMANCE POR MAPA" className="mt-6">
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

function EvolutionChart({ data, label, color, refLine, format }: {
  data: number[];
  label: string;
  color: string;
  refLine?: number;
  format: (v: number) => string;
}) {
  if (data.length < 2) return null;

  const W = 600, H = 80;
  const padL = 0, padR = 0, padT = 4, padB = 4;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  // Add 10% padding to range
  const yMin = min - range * 0.1;
  const yMax = max + range * 0.1;
  const yRange = yMax - yMin;

  const toX = (i: number) => padL + (i / (data.length - 1)) * chartW;
  const toY = (v: number) => padT + chartH - ((v - yMin) / yRange) * chartH;

  const points = data.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  const areaPoints = `${toX(0)},${padT + chartH} ${points} ${toX(data.length - 1)},${padT + chartH}`;

  const avg = data.reduce((s, v) => s + v, 0) / data.length;
  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  const trend = last - prev;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-text">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim">
            Avg: <span className="text-orbital-text">{format(avg)}</span>
          </span>
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim">
            Último: <span style={{ color }}>{format(last)}</span>
          </span>
          <span className={`font-[family-name:var(--font-jetbrains)] text-[0.55rem] font-bold ${
            trend > 0 ? "text-orbital-success" : trend < 0 ? "text-orbital-danger" : "text-orbital-text-dim"
          }`}>
            {trend > 0 ? "+" : ""}{format(trend)}
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 80 }}>
        {/* Area fill */}
        <polygon points={areaPoints} fill={color} opacity={0.08} />
        {/* Reference line */}
        {refLine !== undefined && refLine >= yMin && refLine <= yMax && (
          <line
            x1={padL} y1={toY(refLine)} x2={W - padR} y2={toY(refLine)}
            stroke={color} strokeWidth={0.5} opacity={0.3} strokeDasharray="4 3"
          />
        )}
        {/* Average line */}
        <line
          x1={padL} y1={toY(avg)} x2={W - padR} y2={toY(avg)}
          stroke="#666" strokeWidth={0.5} opacity={0.3} strokeDasharray="2 2"
        />
        {/* Line */}
        <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
        {/* Dots */}
        {data.map((v, i) => (
          <circle key={i} cx={toX(i)} cy={toY(v)} r={2.5} fill={color} opacity={0.8}>
            <title>#{i + 1}: {format(v)}</title>
          </circle>
        ))}
        {/* Last dot highlight */}
        <circle cx={toX(data.length - 1)} cy={toY(last)} r={4} fill={color} opacity={0.3} />
      </svg>
    </div>
  );
}
