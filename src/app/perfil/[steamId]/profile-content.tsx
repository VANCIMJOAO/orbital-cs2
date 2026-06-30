"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { PlayerCardExport } from "@/components/player-card-export";
import { VideoPlayer } from "@/components/video-player";
import { MAP_IMAGES } from "@/lib/maps";
import { Match, getStatusType } from "@/lib/api";

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
  enemies_flashed: number;
  util_damage: number;
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

// Stats agregadas por partida (match_id) — usadas na aba Partidas
interface MatchAgg {
  kills: number;
  deaths: number;
  assists: number;
  adr: number;
  rating: number;
}

type TabKey = "overview" | "partidas" | "highlights" | "mapas";

const DEFAULT_MAP_IMG = MAP_IMAGES.de_mirage;
function mapImg(name?: string): string {
  if (!name) return DEFAULT_MAP_IMG;
  const key = name.startsWith("de_") ? name : `de_${name}`;
  return MAP_IMAGES[key] || DEFAULT_MAP_IMG;
}
function mapLabel(name?: string): string {
  if (!name) return "—";
  return name.replace("de_", "").toUpperCase();
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
  const [matchAgg, setMatchAgg] = useState<Record<number, MatchAgg>>({});
  const [playerClips, setPlayerClips] = useState<{ id: number; match_id: number; map_number: number; rank: number; player_name: string; kills_count: number; score: number; description: string; round_number: number; video_file: string; thumbnail_file: string; duration_s: number; team1_string: string; team2_string: string }[]>([]);
  const [mapPerformance, setMapPerformance] = useState<{ map: string; wins: number; total: number; avgRating: number; kills: number; deaths: number; adr: number }[]>([]);
  const [matchHistory, setMatchHistory] = useState<MatchDataPoint[]>([]);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [playerTeams, setPlayerTeams] = useState<{ id: number; name: string; logo: string | null }[]>([]);
  const [userRole, setUserRole] = useState<{ admin: boolean; superAdmin: boolean }>({ admin: false, superAdmin: false });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("overview");
  const [hint, setHint] = useState<{ text: string; x: number; y: number } | null>(null);

  function showHint(e: React.MouseEvent, text: string) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cx = Math.min(Math.max(r.left + r.width / 2, 130), window.innerWidth - 130);
    setHint({ text, x: cx, y: r.top - 11 });
  }
  const hideHint = () => setHint(null);
  function hintProps(text: string) {
    return {
      onMouseEnter: (e: React.MouseEvent) => showHint(e, text),
      onMouseLeave: hideHint,
    };
  }
  function goTab(t: TabKey) {
    setTab(t);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    fetch(`/api/steam/avatar/${steamId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.avatar) setAvatar(d.avatar); if (d?.name) setUserName(prev => prev || d.name); })
      .catch(() => {});
    fetch(`/api/users/${steamId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.user) setUserRole({ admin: !!d.user.admin, superAdmin: !!d.user.super_admin }); })
      .catch(() => {});
    fetch(`/api/teams`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const teams = d?.teams || [];
        const found: { id: number; name: string; logo: string | null }[] = [];
        let nick: string | null = null;
        for (const t of teams) {
          if (!t.auth_name) continue;
          const entry = t.auth_name[steamId];
          if (entry) {
            if (!nick) nick = typeof entry === "string" ? entry : entry.name;
            found.push({ id: t.id, name: t.name, logo: t.logo || null });
          }
        }
        if (nick) setUserName(nick);
        setPlayerTeams(found);
      })
      .catch(() => {});
  }, [steamId]);

  useEffect(() => {
    async function fetchData() {
      let playerStatsArr: Record<string, unknown>[] = [];
      try {
        const res = await fetch(`/api/playerstats/${steamId}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        const rawStats = data.playerstats || data.playerStats || data;
        playerStatsArr = Array.isArray(rawStats) ? rawStats : [rawStats];
      } catch {
        playerStatsArr = [];
      }

      const emptyStats: ProfileStats = {
        steam_id: steamId, name: steamId, wins: 0, total_maps: 0, total_rounds: 0,
        kills: 0, deaths: 0, assists: 0, headshot_kills: 0, flash_assists: 0, damage: 0,
        rating: 0, kdr: 0, hsp: 0, average_rating: 0, kast: 0, contribution_score: 0,
        mvp: 0, enemies_flashed: 0, util_damage: 0, firstkill_t: 0, firstkill_ct: 0, firstdeath_t: 0, firstdeath_ct: 0,
      };

      try {
        const matches = playerStatsArr;
        if (matches.length === 0) {
          setStats(emptyStats);
          setLoading(false);
          return;
        }

        const aggregated: ProfileStats = { ...emptyStats, name: (matches[0].name as string) || steamId, total_maps: matches.length };

        let totalK1 = 0, totalK2 = 0, totalK3 = 0, totalK4 = 0, totalK5 = 0;
        const history: MatchDataPoint[] = [];
        const aggByMatch: Record<number, MatchAgg & { _rounds: number; _maps: number }> = {};

        for (const m of matches) {
          const mKills = (m.kills as number) || 0;
          const mDeaths = (m.deaths as number) || 0;
          const mAssists = (m.assists as number) || 0;
          const mHsk = (m.headshot_kills as number) || 0;
          const mDmg = (m.damage as number) || 0;
          const mRounds = (m.roundsplayed as number) || 0;
          const mk1 = (m.k1 as number) || 0, mk2 = (m.k2 as number) || 0;
          const mk3 = (m.k3 as number) || 0, mk4 = (m.k4 as number) || 0, mk5 = (m.k5 as number) || 0;
          const matchId = (m.match_id as number) || 0;

          aggregated.kills += mKills;
          aggregated.deaths += mDeaths;
          aggregated.assists += mAssists;
          aggregated.headshot_kills += mHsk;
          aggregated.flash_assists += (m.flashbang_assists as number) || (m.flash_assists as number) || 0;
          aggregated.enemies_flashed += (m.enemies_flashed as number) || 0;
          aggregated.util_damage += (m.util_damage as number) || 0;
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

          const mapRating = calcRating(mKills, mRounds, mDeaths, mk1, mk2, mk3, mk4, mk5);
          history.push({
            matchId,
            rating: mapRating,
            kd: mDeaths > 0 ? +(mKills / mDeaths).toFixed(2) : mKills,
            adr: mRounds > 0 ? Math.round(mDmg / mRounds) : 0,
            hsp: mKills > 0 ? Math.round((mHsk / mKills) * 100) : 0,
            kills: mKills,
            deaths: mDeaths,
          });

          // aggrega por partida (BO1/BO3)
          if (matchId) {
            const a = aggByMatch[matchId] || { kills: 0, deaths: 0, assists: 0, adr: 0, rating: 0, _rounds: 0, _maps: 0 };
            a.kills += mKills; a.deaths += mDeaths; a.assists += mAssists;
            a._rounds += mRounds; a._maps += 1;
            a.rating += mapRating; // soma; vira média abaixo
            a.adr += mDmg;         // soma dano; vira adr abaixo
            aggByMatch[matchId] = a;
          }
        }

        history.sort((a, b) => a.matchId - b.matchId);
        setMatchHistory(history);

        const aggFinal: Record<number, MatchAgg> = {};
        for (const [mid, a] of Object.entries(aggByMatch)) {
          aggFinal[+mid] = {
            kills: a.kills, deaths: a.deaths, assists: a.assists,
            adr: a._rounds > 0 ? Math.round(a.adr / a._rounds) : 0,
            rating: a._maps > 0 ? +(a.rating / a._maps).toFixed(2) : 0,
          };
        }
        setMatchAgg(aggFinal);

        aggregated.average_rating = calcRating(aggregated.kills, aggregated.total_rounds, aggregated.deaths, totalK1, totalK2, totalK3, totalK4, totalK5);
        aggregated.kdr = aggregated.deaths > 0 ? aggregated.kills / aggregated.deaths : aggregated.kills;
        aggregated.hsp = aggregated.kills > 0 ? (aggregated.headshot_kills / aggregated.kills) * 100 : 0;
        aggregated.kast = matches.length > 0 ? aggregated.kast / matches.length : 0;
        setStats(aggregated);
      } catch {
        setStats(emptyStats);
      }

      // Performance por mapa
      try {
        const psArr = playerStatsArr as { match_id: number; map_id: number; team_id: number; kills: number; deaths: number; roundsplayed: number; damage: number; k1: number; k2: number; k3: number; k4: number; k5: number }[];
        const psMatchIds = [...new Set(psArr.map(s => s.match_id))];
        const mapPerf: Record<string, { wins: number; total: number; totalRating: number; kills: number; deaths: number; dmg: number; rounds: number }> = {};

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let mapStatsResults: any[][] = [];
        if (psMatchIds.length > 0) {
          try {
            const batchRes = await fetch(`/api/mapstats-batch?ids=${psMatchIds.join(",")}`);
            if (batchRes.ok) {
              const batchData = await batchRes.json();
              const batchMap = batchData.mapStats || {};
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              mapStatsResults = psMatchIds.map(mid => (batchMap[mid] || []).map((ms: any) => ({ ...ms, _matchId: mid })));
            }
          } catch { /* fallback */ }
        }

        for (const mapStatsList of mapStatsResults) {
          for (const ms of mapStatsList) {
            if (!ms.map_name) continue;
            if (!mapPerf[ms.map_name]) mapPerf[ms.map_name] = { wins: 0, total: 0, totalRating: 0, kills: 0, deaths: 0, dmg: 0, rounds: 0 };
            mapPerf[ms.map_name].total++;
            const playerEntry = psArr.find(p => p.match_id === ms._matchId && p.map_id === ms.id);
            if (playerEntry) {
              if (ms.winner === playerEntry.team_id) mapPerf[ms.map_name].wins++;
              mapPerf[ms.map_name].totalRating += calcRating(playerEntry.kills || 0, playerEntry.roundsplayed || 0, playerEntry.deaths || 0, playerEntry.k1 || 0, playerEntry.k2 || 0, playerEntry.k3 || 0, playerEntry.k4 || 0, playerEntry.k5 || 0);
              mapPerf[ms.map_name].kills += playerEntry.kills || 0;
              mapPerf[ms.map_name].deaths += playerEntry.deaths || 0;
              mapPerf[ms.map_name].dmg += playerEntry.damage || 0;
              mapPerf[ms.map_name].rounds += playerEntry.roundsplayed || 0;
            }
          }
        }

        setMapPerformance(
          Object.entries(mapPerf)
            .map(([map, d]) => ({
              map, wins: d.wins, total: d.total,
              avgRating: d.total > 0 ? d.totalRating / d.total : 0,
              kills: d.kills, deaths: d.deaths,
              adr: d.rounds > 0 ? Math.round(d.dmg / d.rounds) : 0,
            }))
            .sort((a, b) => b.total - a.total)
        );
      } catch { /* não crítico */ }

      // Partidas (até 15) — detalhes + placar + mapa
      try {
        const statsArr = playerStatsArr as { match_id: number; team_id: number }[];
        const playerTeamMap: Record<number, number> = {};
        for (const s of statsArr) if (!(s.match_id in playerTeamMap)) playerTeamMap[s.match_id] = s.team_id;
        const recentMatchIds = [...new Set(statsArr.map(s => s.match_id))].sort((a, b) => b - a).slice(0, 15);

        const batchMapRes = await fetch(`/api/mapstats-batch?ids=${recentMatchIds.join(",")}`).then(r => r.ok ? r.json() : { mapStats: {} }).catch(() => ({ mapStats: {} }));
        const batchMapData = batchMapRes.mapStats || {};

        const matchPromises = recentMatchIds.map(async (id) => {
          try {
            const matchRes = await fetch(`/api/matches/${id}`);
            if (!matchRes.ok) return null;
            const d = await matchRes.json();
            const m = d.match as Match;
            type MatchExt = Match & { round_score?: string; map_name?: string; map_list?: string[]; player_team_id?: number };
            const ext = m as MatchExt;
            ext.player_team_id = playerTeamMap[id];
            const maps = batchMapData[id] || [];
            if (maps.length > 0) {
              let t1Rounds = 0, t2Rounds = 0;
              const mapNames: string[] = [];
              for (const ms of maps) {
                t1Rounds += ms.team1_score || 0;
                t2Rounds += ms.team2_score || 0;
                if (ms.map_name) mapNames.push(ms.map_name.replace("de_", ""));
              }
              ext.round_score = `${t1Rounds} - ${t2Rounds}`;
              ext.map_name = mapNames.join(", ");
              ext.map_list = mapNames;
            }
            return m;
          } catch { return null; }
        });
        const resolved = await Promise.all(matchPromises);
        setRecentMatches(resolved.filter((m): m is Match => m !== null));
      } catch { /* não crítico */ }

      try {
        const res = await fetch(`/api/highlights/player/${steamId}`);
        if (res.ok) { const data = await res.json(); setPlayerClips(data.clips || []); }
      } catch { /* não crítico */ }

      try {
        const res = await fetch(`/api/leaderboard/players`);
        if (res.ok) {
          const data = await res.json();
          const entry = (data.leaderboard || []).find((e: { steamId: string }) => e.steamId === steamId);
          if (entry) {
            setStats(prev => prev ? { ...prev, wins: entry.wins || 0 } : prev);
            if (entry.name) setUserName(prev => prev || entry.name);
          }
        }
      } catch { /* não crítico */ }

      setLoading(false);
    }
    fetchData();
  }, [steamId]);

  if (loading) {
    return (
      <div className="owp">
        <style>{OWP_CSS}</style>
        <div className="owp-loading">
          <div className="owp-spin" />
          <span>Carregando perfil…</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="owp">
        <style>{OWP_CSS}</style>
        <div className="owp-loading">
          <span>Jogador não encontrado</span>
          <span className="owp-dim">Steam ID: {steamId}</span>
        </div>
      </div>
    );
  }

  const displayName = userName || (stats.name !== steamId ? stats.name : steamId);
  const adr = stats.total_rounds > 0 ? Math.round(stats.damage / stats.total_rounds) : 0;
  const hsp = stats.kills > 0 ? Math.round((stats.headshot_kills / stats.kills) * 100) : Math.round(stats.hsp || 0);
  const kdr = stats.kdr || (stats.deaths > 0 ? (stats.kills / stats.deaths) : stats.kills);
  const avgRating = stats.average_rating || stats.rating || 0;
  const entryKills = stats.firstkill_t + stats.firstkill_ct;
  const hasStats = stats.total_maps > 0;

  // combate (com larguras relativas decorativas)
  const gm = Math.max(stats.kills, stats.deaths, stats.assists, stats.headshot_kills, entryKills, 1);
  const combat = [
    { k: "⊕ KILLS", v: stats.kills, w: (stats.kills / gm) * 100 },
    { k: "✕ DEATHS", v: stats.deaths, w: (stats.deaths / gm) * 100 },
    { k: "✦ ASSISTS", v: stats.assists, w: (stats.assists / gm) * 100 },
    { k: "◎ HEADSHOTS", v: stats.headshot_kills, w: (stats.headshot_kills / gm) * 100, hint: "Abates com tiro na cabeça." },
    { k: "⚡ ENTRY KILLS", v: entryKills, w: (entryKills / gm) * 100, hint: "Primeiro abate do round (abertura). Mede agressividade e impacto inicial." },
    { k: "◎ DANO TOTAL", v: stats.damage, w: Math.min(100, (adr / 120) * 100), hint: "Dano total causado em todas as partidas." },
  ];

  // forma (últimos 7 ratings)
  const form = matchHistory.slice(-7).map(d => d.rating);
  const formMax = form.length ? Math.max(...form) : 1;
  const formMin = form.length ? Math.min(...form) : 0;
  const formAvg = form.length ? form.reduce((s, v) => s + v, 0) / form.length : 0;
  const formH = (v: number) => {
    const lo = Math.min(formMin * 0.9, 0.0);
    const hi = formMax * 1.05 || 1;
    return Math.max(8, Math.min(100, ((v - lo) / (hi - lo)) * 100));
  };

  const steamProfileUrl = `https://steamcommunity.com/profiles/${steamId}`;
  const isCreator = steamId === "76561198023055702";
  const primaryTeam = playerTeams[0] || null;

  // helper: extrai adversário e resultado de uma partida
  function matchView(match: Match) {
    const ext = match as Match & { round_score?: string; map_name?: string; map_list?: string[]; player_team_id?: number };
    const onTeam1 = ext.player_team_id === match.team1_id;
    const oppName = onTeam1 ? (match.team2_string || `Time ${match.team2_id}`) : (match.team1_string || `Time ${match.team1_id}`);
    const isLive = getStatusType(match) === "live";
    const won = match.winner != null && ext.player_team_id != null && match.winner === ext.player_team_id;
    const lost = match.winner != null && ext.player_team_id != null && match.winner !== ext.player_team_id;
    const agg = matchAgg[match.id];
    return { ext, oppName, isLive, won, lost, agg, firstMap: ext.map_list?.[0] };
  }

  return (
    <div className="owp">
      <style>{OWP_CSS}</style>

      {/* ===== BANNER ===== */}
      <header className="owp-banner">
        <span className="owp-ghost">{displayName}</span>
        <div className="wrap">
          <div className="owp-av">
            <div className="ph">
              {avatar
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={avatar} alt={displayName} />
                : <div className="owp-av-fallback">{displayName?.charAt(0)?.toUpperCase() || "?"}</div>}
            </div>
          </div>
          <div className="owp-pinfo">
            <div className="owp-row1">
              {playerTeams.map(t => (
                <Link key={t.id} href={`/times/${t.id}`} className="owp-tag">
                  {t.logo && <Image src={t.logo} alt={t.name} width={17} height={17} className="object-contain" unoptimized />}
                  {t.name}
                </Link>
              ))}
              {isCreator && <span className="owp-tag creator">★ CRIADOR</span>}
              {userRole.admin && !isCreator && <span className="owp-tag admin">ADMIN</span>}
              {stats.mvp > 0 && <span className="owp-tag mvp" style={{ cursor: "help" }} {...hintProps("Estrelas de MVP de round — o CS dá uma estrela ao destaque de cada round (não é 'melhor da partida').")}>★ {stats.mvp} {stats.mvp === 1 ? "Estrela MVP" : "Estrelas MVP"}</span>}
            </div>
            <h1>{displayName}</h1>
            <div className="owp-meta">
              <span>STEAM <b>{steamId}</b></span>
              <span><b>{stats.total_maps}</b> MAPAS</span>
              <span><b>{stats.wins}</b> VITÓRIAS</span>
            </div>
          </div>
          <div className="owp-bnr-rt">
            <div className="owp-actions">
              <Link className="owp-btn" href={`/comparar?p1=${steamId}`}>Comparar</Link>
              <a className="owp-btn prim" href={steamProfileUrl} target="_blank" rel="noopener noreferrer">Steam ↗</a>
            </div>
            <div className="owp-export">
              <PlayerCardExport
                steamId={steamId}
                displayName={displayName}
                stats={{ kills: stats.kills, deaths: stats.deaths, assists: stats.assists, wins: stats.wins, total_maps: stats.total_maps, mvp: stats.mvp, kdr: +kdr.toFixed(2), hsp: Math.round(hsp), avgRating, adr }}
              />
            </div>
            <div className="owp-ratebox">
              <div className="k">Rating 1.0<span className="owp-info" {...hintProps("Índice de desempenho geral (modelo HLTV 1.0): combina kills, mortes, multi-kills e impacto. 1.00 é a média.")}>i</span></div>
              <div className={`v ${avgRating >= 1.1 ? "hi" : avgRating < 0.9 ? "lo" : ""}`}>{avgRating.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </header>

      {/* ===== TABS ===== */}
      <nav className="owp-tabs"><div className="wrap">
        {([["overview", "Overview"], ["partidas", "Partidas"], ["highlights", "Highlights"], ["mapas", "Por Mapa"]] as [TabKey, string][]).map(([k, label]) => (
          <a key={k} className={tab === k ? "on" : ""} onClick={() => goTab(k)}>{label}</a>
        ))}
      </div></nav>

      {/* ===== STAT STRIP ===== */}
      <div className="owp-strip">
        <Cell k="K / D" v={kdr.toFixed(2)} hint="Razão entre abates e mortes. Acima de 1.0 = mais kills que deaths." hp={hintProps} />
        <Cell k="ADR" v={adr.toString()} hint="Average Damage per Round — dano médio causado por round jogado." hp={hintProps} />
        <Cell k="HS %" v={`${hsp}`} small="%" hint="Porcentagem dos abates que foram tiros na cabeça (headshot)." hp={hintProps} />
        <Cell k="KAST" v={stats.kast ? stats.kast.toFixed(1) : "—"} small={stats.kast ? "%" : ""} hint="% de rounds em que o jogador teve Kill, Assist, Survived ou foi Trocado (Trade)." hp={hintProps} />
        <Cell k="Maps" v={stats.total_maps.toString()} hint="Total de mapas disputados nos campeonatos da ORBITAL ROXA." hp={hintProps} />
        <Cell k="Estrelas MVP" v={stats.mvp.toString()} acc hint="Estrelas de MVP de round — o CS dá uma estrela ao destaque de cada round (não é 'melhor da partida'). Por isso o total costuma ser maior que o nº de mapas." hp={hintProps} />
      </div>

      <div className="wrap">
        {!hasStats && (
          <div className="owp-empty">Esse jogador ainda não tem estatísticas registradas em campeonatos da ORBITAL ROXA.</div>
        )}

        {/* ============ OVERVIEW ============ */}
        {tab === "overview" && hasStats && (
          <div className="owp-panel">
            <section className="owp-sec">
              <div className="owp-grid">
                <div>
                  <div className="owp-lbl"><b>Combate</b></div>
                  <div className="owp-combat">
                    {combat.map((c) => (
                      <div className="owp-cc" key={c.k}>
                        <div className="k">{c.k}{c.hint && <span className="owp-info" {...hintProps(c.hint)}>i</span>}</div>
                        <div className="v">{c.v.toLocaleString("pt-BR")}</div>
                        <div className="bar"><i style={{ width: `${Math.max(0, Math.min(100, c.w))}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="owp-lbl"><b>Forma · últimos {form.length}</b></div>
                  {form.length >= 2 ? (
                    <div className="owp-formc">
                      <div className="owp-spark">
                        {form.map((v, i) => (
                          <div className="b" style={{ height: `${formH(v)}%` }} key={i}><span>{v.toFixed(2)}</span></div>
                        ))}
                      </div>
                      <div className="owp-ft">
                        <span>MÉDIA <b style={{ color: "var(--or2)" }}>{formAvg.toFixed(2)}</b></span>
                        <span>PICO <b style={{ color: "var(--ok)" }}>{formMax.toFixed(2)}</b></span>
                      </div>
                    </div>
                  ) : (
                    <div className="owp-formc"><div className="owp-none">Poucos mapas pra montar a forma.</div></div>
                  )}
                </div>
              </div>
            </section>

            <section className="owp-sec">
              <div className="owp-grid">
                <div>
                  <div className="owp-lbl hasmore"><b>Últimas Partidas</b>{recentMatches.length > 5 && <span className="more" onClick={() => goTab("partidas")}>Ver todas →</span>}</div>
                  {recentMatches.length > 0 ? (
                    <div className="owp-res">
                      {recentMatches.slice(0, 5).map((match) => {
                        const v = matchView(match);
                        return (
                          <div className="owp-rrow" key={match.id} onClick={() => window.location.href = `/partidas/${match.id}`}>
                            <span className={`w ${v.isLive ? "live" : v.won ? "v" : v.lost ? "d" : ""}`} />
                            <div className="opp">
                              <span className="t">vs {v.oppName}</span>
                              <span className="ev">{v.ext.map_name ? mapLabel("de_" + v.ext.map_name.split(",")[0].trim()) : (primaryTeam ? primaryTeam.name : "Partida")}</span>
                            </div>
                            <span className="sc">{v.ext.round_score || `${match.team1_score} - ${match.team2_score}`}</span>
                            <span className={`rt ${v.agg && v.agg.rating >= 1.1 ? "hi" : v.agg && v.agg.rating < 0.9 ? "lo" : ""}`}>{v.agg ? v.agg.rating.toFixed(2) : "—"}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : <div className="owp-res"><div className="owp-none">Nenhuma partida registrada.</div></div>}
                </div>
                <div>
                  <div className="owp-lbl hasmore"><b>Por Mapa</b>{mapPerformance.length > 4 && <span className="more" onClick={() => goTab("mapas")}>Ver todos →</span>}</div>
                  {mapPerformance.length > 0 ? (
                    <div className="owp-maps">
                      {mapPerformance.slice(0, 5).map((mp) => (
                        <div className="owp-mrow" key={mp.map}>
                          <div className="mn"><span className="th" style={{ backgroundImage: `url('${mapImg(mp.map)}')` }} />{mapLabel(mp.map)}</div>
                          <div className="mbar"><i style={{ width: `${Math.max(6, Math.min(100, (mp.avgRating / 1.6) * 100))}%` }} /></div>
                          <div className="mrt">{mp.avgRating.toFixed(2)}<small>{mp.total} {mp.total === 1 ? "map" : "maps"}</small></div>
                        </div>
                      ))}
                    </div>
                  ) : <div className="owp-maps"><div className="owp-none">Sem dados de mapa.</div></div>}
                </div>
              </div>
            </section>

            {playerClips.length > 0 && (
              <section className="owp-sec">
                <div className="owp-lbl hasmore"><b>Melhores Momentos</b>{playerClips.length > 3 && <span className="more" onClick={() => goTab("highlights")}>Ver todos →</span>}</div>
                <div className="owp-hls">
                  {playerClips.slice(0, 3).map((clip) => <ClipCard key={clip.id} clip={clip} />)}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ============ PARTIDAS ============ */}
        {tab === "partidas" && (
          <div className="owp-panel">
            <section className="owp-sec">
              <div className="owp-lbl"><b>Histórico de Partidas</b></div>
              {recentMatches.length > 0 ? (
                <div className="owp-mtbl">
                  <div className="mh"><span /><span>Adversário</span><span>Mapa</span><span>Placar</span><span className="h-kda">K — D — A</span><span className="h-adr">ADR</span><span style={{ textAlign: "right" }}>RAT</span></div>
                  {recentMatches.map((match) => {
                    const v = matchView(match);
                    return (
                      <div className="mr" key={match.id} onClick={() => window.location.href = `/partidas/${match.id}`}>
                        <span className={`w ${v.isLive ? "live" : v.won ? "v" : v.lost ? "d" : ""}`} />
                        <div className="opp"><span className="t">vs {v.oppName}</span><span className="ev">{primaryTeam ? `como ${primaryTeam.name}` : (v.isLive ? "ao vivo" : v.won ? "vitória" : v.lost ? "derrota" : "—")}</span></div>
                        <div className="mp"><span className="th" style={{ backgroundImage: `url('${mapImg(v.firstMap)}')` }} />{v.ext.map_name ? mapLabel("de_" + v.ext.map_name.split(",")[0].trim()) : "—"}</div>
                        <span className={`sc ${v.won ? "win" : v.lost ? "loss" : ""}`}>{v.ext.round_score || `${match.team1_score} - ${match.team2_score}`}</span>
                        <span className="kda">{v.agg ? <><b>{v.agg.kills}</b>—{v.agg.deaths}—<b>{v.agg.assists}</b></> : "—"}</span>
                        <span className="adr">{v.agg ? v.agg.adr : "—"}</span>
                        <span className={`rt ${v.agg && v.agg.rating >= 1.1 ? "hi" : v.agg && v.agg.rating < 0.9 ? "lo" : ""}`}>{v.agg ? v.agg.rating.toFixed(2) : "—"}</span>
                      </div>
                    );
                  })}
                </div>
              ) : <div className="owp-none owp-none-box">Nenhuma partida registrada ainda.</div>}
            </section>
          </div>
        )}

        {/* ============ HIGHLIGHTS ============ */}
        {tab === "highlights" && (
          <div className="owp-panel">
            <section className="owp-sec">
              <div className="owp-lbl"><b>Melhores Momentos</b></div>
              {playerClips.length > 0 ? (
                <div className="owp-hls">
                  {playerClips.map((clip) => <ClipCard key={clip.id} clip={clip} />)}
                </div>
              ) : <div className="owp-none owp-none-box">Esse jogador ainda não tem highlights gerados.</div>}
            </section>
          </div>
        )}

        {/* ============ POR MAPA ============ */}
        {tab === "mapas" && (
          <div className="owp-panel">
            <section className="owp-sec">
              <div className="owp-lbl"><b>Desempenho por Mapa</b></div>
              {mapPerformance.length > 0 ? (
                <div className="owp-mapgrid">
                  {mapPerformance.map((mp) => {
                    const winRate = mp.total > 0 ? Math.round((mp.wins / mp.total) * 100) : 0;
                    const kd = mp.deaths > 0 ? (mp.kills / mp.deaths).toFixed(2) : mp.kills.toFixed(2);
                    return (
                      <div className="owp-mapcard" key={mp.map}>
                        <div className="top" style={{ backgroundImage: `url('${mapImg(mp.map)}')` }}>
                          <span className="nm">{mapLabel(mp.map)}</span>
                          <span className="wl">{mp.wins}-{mp.total - mp.wins} · {winRate}%</span>
                        </div>
                        <div className="body">
                          <div className="st"><div className="sk">Rating</div><div className="sv rt">{mp.avgRating.toFixed(2)}</div></div>
                          <div className="st"><div className="sk">K/D</div><div className="sv">{kd}</div></div>
                          <div className="st"><div className="sk">ADR</div><div className="sv">{mp.adr || "—"}</div></div>
                        </div>
                        <div className="winbar"><i style={{ width: `${winRate}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              ) : <div className="owp-none owp-none-box">Sem dados de mapa pra esse jogador.</div>}
            </section>
          </div>
        )}
      </div>

      {/* tooltip global */}
      {hint && (
        <div className="owp-tip on" style={{ left: hint.x, top: hint.y, transform: "translate(-50%,-100%)" }}>
          {hint.text}
          <span className="owp-tip-arrow" />
        </div>
      )}
    </div>
  );
}

// ---------- subcomponentes ----------
function Cell({ k, v, small, acc, hint, hp }: { k: string; v: string; small?: string; acc?: boolean; hint: string; hp: (t: string) => { onMouseEnter: (e: React.MouseEvent) => void; onMouseLeave: () => void } }) {
  return (
    <div className={`owp-scell ${acc ? "acc" : ""}`}>
      <div className="k">{k}<span className="owp-info" {...hp(hint)}>i</span></div>
      <div className="v">{v}{small && <small>{small}</small>}</div>
    </div>
  );
}

function ClipCard({ clip }: { clip: { id: number; match_id: number; rank: number; kills_count: number; score: number; round_number: number; video_file: string; team1_string: string; team2_string: string } }) {
  const tag = clip.kills_count >= 5 ? "ACE" : clip.kills_count >= 2 ? `${clip.kills_count}K` : null;
  return (
    <div className="owp-hl">
      {tag && <span className="tag2">{tag}</span>}
      <span className="views">#{clip.rank}</span>
      <VideoPlayer src={`/api/highlights-proxy/${clip.video_file}`} clipId={clip.id} />
      {(clip.team1_string || clip.team2_string) && (
        <Link href={`/partidas/${clip.match_id}`} className="cap">{clip.team1_string} vs {clip.team2_string}{clip.round_number ? ` · R${clip.round_number}` : ""}</Link>
      )}
    </div>
  );
}

// ---------- CSS (escopado em .owp) ----------
const OWP_CSS = `
.owp{--bg:#1B0F23;--bg2:#150A1D;--panel:#22132E;--panel2:#2A1838;
  --line:rgba(255,255,255,.09);--line-or:rgba(255,90,31,.32);
  --tx:#F3ECF7;--dim:#9C8AAE;--faint:#6B5A7C;
  --or:#FF5A1F;--or2:#FF8A3D;--vio:#7C5CFF;--vio2:#A892FF;
  --gold:#FFC24B;--ok:#54E08A;--live:#FF3B57;--stroke:#241038;
  --disp:var(--font-russo),sans-serif;--cond:var(--font-anton),sans-serif;
  --body:var(--font-chakra),sans-serif;--mono:var(--font-jetbrains),monospace;
  background:var(--bg);color:var(--tx);font-family:var(--body);min-height:100vh;
  background-image:radial-gradient(120% 70% at 85% -4%,rgba(255,90,31,.16),transparent 55%),radial-gradient(90% 60% at 0% 0%,rgba(124,92,255,.14),transparent 55%);
  padding-bottom:72px;margin-top:-5rem;padding-top:5rem;}
.owp *{box-sizing:border-box}
.owp .wrap{padding:0 clamp(20px,3.2vw,72px)}
.owp a{color:inherit;text-decoration:none}


.owp .owp-info{display:inline-flex;align-items:center;justify-content:center;width:13px;height:13px;margin-left:5px;border:1px solid var(--faint);border-radius:50%;font-family:var(--mono);font-size:8px;font-weight:700;color:var(--dim);vertical-align:middle;cursor:help;line-height:1;text-transform:none}
.owp .owp-info:hover{border-color:var(--or);color:var(--or)}

.owp-tip{position:fixed;z-index:9999;max-width:240px;background:var(--panel2);border:1px solid var(--or);color:var(--tx);font-family:var(--body);font-weight:500;font-size:11.5px;line-height:1.42;text-align:left;padding:11px 13px;clip-path:polygon(0 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%);box-shadow:0 14px 38px -10px rgba(0,0,0,.8);pointer-events:none}
.owp-tip-arrow{position:absolute;left:50%;top:100%;transform:translateX(-50%);border:6px solid transparent;border-top-color:var(--or)}

.owp-lbl{display:flex;align-items:center;gap:13px;margin-bottom:20px}
.owp-lbl b{font-family:var(--disp);font-size:15px;letter-spacing:.04em;text-transform:uppercase;color:#fff;-webkit-text-stroke:2px var(--stroke);paint-order:stroke fill}
.owp-lbl::before{content:'';width:0;height:0;border-style:solid;border-width:7px 0 7px 11px;border-color:transparent transparent transparent var(--or)}
.owp-lbl::after{content:'';flex:1;height:2px;background:linear-gradient(90deg,var(--line-or),transparent)}
.owp-lbl.hasmore::after{display:none}
.owp-lbl .more{margin-left:auto;font-family:var(--cond);font-weight:400;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--or2);cursor:pointer;transition:.15s}
.owp-lbl .more:hover{color:#fff}

.owp-banner{position:relative;overflow:hidden;border-bottom:2px solid var(--or);margin-top:0}
.owp-banner::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,var(--bg) 32%,rgba(27,15,35,.55) 72%,rgba(27,15,35,.85));z-index:0}
.owp-banner .wrap{position:relative;z-index:2;display:flex;align-items:flex-end;gap:30px;padding:40px clamp(20px,3.2vw,72px) 30px;flex-wrap:wrap}
.owp-ghost{position:absolute;right:2vw;bottom:-2.4vw;z-index:1;font-family:var(--disp);font-size:clamp(6rem,15vw,15rem);line-height:.7;color:transparent;-webkit-text-stroke:2px rgba(255,90,31,.15);text-transform:uppercase;pointer-events:none;letter-spacing:-.02em;user-select:none;white-space:nowrap;max-width:60vw;overflow:hidden}
.owp-av{width:118px;height:140px;flex:0 0 auto;position:relative;clip-path:polygon(0 0,100% 0,100% 86%,86% 100%,0 100%);background:linear-gradient(160deg,var(--or),var(--vio));padding:3px}
.owp-av .ph{width:100%;height:100%;overflow:hidden;background:#0d0712;clip-path:polygon(0 0,100% 0,100% 85%,85% 100%,0 100%)}
.owp-av .ph img{width:100%;height:100%;object-fit:cover}
.owp-av-fallback{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:var(--disp);font-size:42px;color:var(--faint)}
.owp-pinfo{padding-bottom:4px;min-width:0}
.owp-row1{display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap}
.owp-tag{display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#fff;background:rgba(124,92,255,.16);border:1px solid var(--vio);padding:5px 11px;clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px);transition:.15s}
a.owp-tag:hover{background:rgba(124,92,255,.3)}
.owp-tag.mvp{background:rgba(255,194,75,.14);border-color:var(--gold);color:var(--gold)}
.owp-tag.creator{background:rgba(255,90,31,.16);border-color:var(--or);color:var(--or2)}
.owp-tag.admin{background:rgba(255,194,75,.12);border-color:var(--gold);color:var(--gold)}
.owp-pinfo h1{font-family:var(--disp);font-size:clamp(2.4rem,5.4vw,5rem);line-height:.82;text-transform:uppercase;color:#fff;-webkit-text-stroke:3px var(--stroke);paint-order:stroke fill;letter-spacing:-.005em;word-break:break-word}
.owp-meta{display:flex;gap:20px;margin-top:15px;font-family:var(--mono);font-size:11px;color:var(--dim);flex-wrap:wrap}
.owp-meta b{color:var(--tx)}
.owp-bnr-rt{margin-left:auto;display:flex;flex-direction:column;align-items:flex-end;gap:14px}
.owp-actions{display:flex;gap:9px}
.owp-btn{font-family:var(--cond);font-weight:400;font-size:14px;letter-spacing:.06em;text-transform:uppercase;padding:11px 20px;border:1px solid var(--line-or);color:var(--or2);transition:.15s;white-space:nowrap;clip-path:polygon(9px 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%,0 9px);background:rgba(255,90,31,.05);cursor:pointer}
.owp-btn:hover{background:rgba(255,90,31,.16);border-color:var(--or);color:#fff}
.owp-btn.prim{background:var(--or);color:#1a0d06;border-color:var(--or)}
.owp-btn.prim:hover{background:var(--or2)}
.owp-export :is(button,a){font-family:var(--cond)!important}
.owp-ratebox{text-align:right}
.owp-ratebox .k{font-family:var(--mono);font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--dim)}
.owp-ratebox .v{font-family:var(--disp);font-size:clamp(2.6rem,5vw,4rem);line-height:.86;color:var(--or);text-shadow:0 0 28px rgba(255,90,31,.4)}
.owp-ratebox .v.hi{color:var(--ok)}.owp-ratebox .v.lo{color:#FF7A8C}

.owp-tabs{border-bottom:1px solid var(--line);background:var(--bg2)}
.owp-tabs .wrap{display:flex;gap:30px}
.owp-tabs a{padding:16px 2px;font-family:var(--cond);font-weight:400;font-size:15px;letter-spacing:.08em;text-transform:uppercase;color:var(--dim);position:relative;transition:.15s;cursor:pointer}
.owp-tabs a:hover{color:var(--tx)}
.owp-tabs a.on{color:#fff}
.owp-tabs a.on::after{content:'';position:absolute;left:0;right:0;bottom:-1px;height:3px;background:var(--or)}

.owp-strip{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;padding:24px clamp(20px,3.2vw,72px);background:var(--bg2);border-bottom:1px solid var(--line)}
.owp-scell{position:relative;background:var(--panel);padding:18px 20px;border-left:3px solid var(--or);clip-path:polygon(0 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%)}
.owp-scell .k{font-family:var(--mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim)}
.owp-scell .v{font-family:var(--cond);font-weight:400;font-size:clamp(26px,2.4vw,38px);margin-top:6px;line-height:1;color:var(--tx)}
.owp-scell .v small{font-family:var(--mono);font-size:12px;color:var(--dim)}
.owp-scell.acc{border-left-color:var(--gold)}.owp-scell.acc .v{color:var(--gold)}

.owp-sec{padding:36px 0}
.owp-grid{display:grid;grid-template-columns:1.5fr 1fr;gap:22px}
.owp-empty,.owp-none-box{font-family:var(--mono);font-size:12.5px;color:var(--dim);background:var(--panel);border:1px solid var(--line);padding:22px;margin-top:30px;line-height:1.5}
.owp-none{font-family:var(--mono);font-size:11px;color:var(--faint);text-transform:uppercase;letter-spacing:.06em;padding:18px}

.owp-combat{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.owp-cc{position:relative;background:var(--panel);padding:18px 20px;border-top:2px solid var(--line-or);clip-path:polygon(0 0,100% 0,100% calc(100% - 13px),calc(100% - 13px) 100%,0 100%)}
.owp-cc .k{font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--dim);display:flex;align-items:center}
.owp-cc .v{font-family:var(--cond);font-weight:400;font-size:32px;margin-top:8px;line-height:1;color:var(--tx)}
.owp-cc .bar{height:5px;background:#160c1f;margin-top:12px;overflow:hidden;transform:skewX(-20deg)}
.owp-cc .bar i{display:block;height:100%;background:linear-gradient(90deg,var(--or),var(--or2))}

.owp-formc{background:var(--panel);padding:22px;border:1px solid var(--line);clip-path:polygon(0 0,100% 0,100% calc(100% - 16px),calc(100% - 16px) 100%,0 100%)}
.owp-spark{display:flex;align-items:flex-end;gap:8px;height:96px;margin-top:14px}
.owp-spark .b{flex:1;background:linear-gradient(180deg,var(--or2),var(--or));position:relative;min-height:8px;clip-path:polygon(0 0,100% 6px,100% 100%,0 100%)}
.owp-spark .b span{position:absolute;top:-18px;left:50%;transform:translateX(-50%);font-family:var(--mono);font-size:9px;color:var(--dim)}
.owp-ft{display:flex;justify-content:space-between;margin-top:16px;font-family:var(--mono);font-size:11px;color:var(--dim)}

.owp-res{background:var(--panel);border:1px solid var(--line)}
.owp-rrow{display:flex;align-items:center;gap:13px;padding:13px 18px;font-family:var(--mono);font-size:12.5px;transition:.15s;cursor:pointer}
.owp-rrow:hover{background:var(--panel2)}.owp-rrow+.owp-rrow{border-top:1px solid var(--line)}
.owp-rrow .w{width:4px;height:32px;flex:0 0 auto;transform:skewX(-12deg);background:var(--faint)}
.owp-rrow .w.v{background:var(--ok)}.owp-rrow .w.d{background:var(--live)}.owp-rrow .w.live{background:var(--live)}
.owp-rrow .opp{flex:1;display:flex;flex-direction:column;gap:3px;min-width:0}
.owp-rrow .opp .t{font-family:var(--cond);font-weight:400;font-size:15px;letter-spacing:.02em;text-transform:uppercase;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.owp-rrow .opp .ev{font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--faint)}
.owp-rrow .sc{font-family:var(--cond);font-weight:400;font-size:17px}
.owp-rrow .rt{font-family:var(--cond);font-weight:400;font-size:16px;width:52px;text-align:right;color:var(--tx)}
.owp-rrow .rt.hi{color:var(--ok)}.owp-rrow .rt.lo{color:#FF7A8C}

.owp-maps{background:var(--panel);border:1px solid var(--line)}
.owp-mrow{display:grid;grid-template-columns:130px 1fr 64px;align-items:center;gap:16px;padding:13px 18px}
.owp-mrow+.owp-mrow{border-top:1px solid var(--line)}
.owp-mrow .mn{display:flex;align-items:center;gap:10px;font-family:var(--cond);font-weight:400;font-size:14px;text-transform:uppercase;letter-spacing:.03em}
.owp-mrow .mn .th{width:36px;height:23px;background-size:cover;background-position:center;opacity:.85;clip-path:polygon(0 0,100% 0,100% 75%,88% 100%,0 100%)}
.owp-mrow .mbar{height:7px;background:#160c1f;overflow:hidden;transform:skewX(-20deg)}
.owp-mrow .mbar i{display:block;height:100%;background:linear-gradient(90deg,var(--or),var(--or2))}
.owp-mrow .mrt{font-family:var(--cond);font-weight:400;font-size:16px;text-align:right;color:var(--tx)}
.owp-mrow .mrt small{display:block;font-family:var(--mono);font-size:9px;color:var(--dim)}

.owp-mtbl{background:var(--panel);border:1px solid var(--line)}
.owp-mtbl .mh,.owp-mtbl .mr{display:grid;grid-template-columns:4px 1.5fr 116px 78px 120px 56px 56px;align-items:center;gap:14px;padding:13px 18px}
.owp-mtbl .mh{background:var(--bg2);border-bottom:1px solid var(--line);font-family:var(--mono);font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--faint)}
.owp-mtbl .mr+.mr{border-top:1px solid var(--line)}
.owp-mtbl .mr{font-family:var(--mono);font-size:12.5px;transition:.15s;cursor:pointer}
.owp-mtbl .mr:hover{background:var(--panel2)}
.owp-mtbl .w{width:4px;height:32px;transform:skewX(-12deg);background:var(--faint)}
.owp-mtbl .w.v{background:var(--ok)}.owp-mtbl .w.d{background:var(--live)}.owp-mtbl .w.live{background:var(--live)}
.owp-mtbl .opp{display:flex;flex-direction:column;gap:3px;min-width:0}
.owp-mtbl .opp .t{font-family:var(--cond);font-weight:400;font-size:15px;letter-spacing:.02em;text-transform:uppercase;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.owp-mtbl .opp .ev{font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--faint)}
.owp-mtbl .mp{display:flex;align-items:center;gap:8px;font-family:var(--cond);font-weight:400;font-size:13px;text-transform:uppercase;color:var(--dim)}
.owp-mtbl .mp .th{width:30px;height:19px;background-size:cover;background-position:center;opacity:.8;clip-path:polygon(0 0,100% 0,100% 74%,86% 100%,0 100%)}
.owp-mtbl .sc{font-family:var(--cond);font-weight:400;font-size:16px;color:var(--tx)}
.owp-mtbl .sc.win{color:var(--ok)}.owp-mtbl .sc.loss{color:#FF7A8C}
.owp-mtbl .kda{color:var(--dim)}.owp-mtbl .kda b{color:var(--tx)}
.owp-mtbl .adr{text-align:right;color:var(--dim)}
.owp-mtbl .rt{font-family:var(--cond);font-weight:400;font-size:16px;text-align:right;color:var(--tx)}
.owp-mtbl .rt.hi{color:var(--ok)}.owp-mtbl .rt.lo{color:#FF7A8C}

.owp-hls{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.owp-hl{position:relative;overflow:hidden;border:1px solid var(--line-or);clip-path:polygon(0 0,100% 0,100% calc(100% - 18px),calc(100% - 18px) 100%,0 100%)}
.owp-hl .tag2{position:absolute;top:10px;left:10px;z-index:3;font-family:var(--cond);font-weight:400;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#1a0d06;background:var(--or);padding:3px 9px;clip-path:polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)}
.owp-hl .views{position:absolute;top:11px;right:11px;z-index:3;font-family:var(--mono);font-size:10px;color:var(--tx);text-shadow:0 1px 4px rgba(0,0,0,.8)}
.owp-hl .cap{position:absolute;left:0;right:0;bottom:0;padding:9px 12px 16px;background:linear-gradient(0deg,rgba(27,15,35,.96),transparent);font-family:var(--mono);font-size:10px;letter-spacing:.04em;text-transform:uppercase;color:var(--tx);z-index:3;display:block}
.owp-hl .cap:hover{color:var(--or2)}

.owp-mapgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.owp-mapcard{position:relative;background:var(--panel);border:1px solid var(--line);overflow:hidden;clip-path:polygon(0 0,100% 0,100% calc(100% - 16px),calc(100% - 16px) 100%,0 100%)}
.owp-mapcard .top{position:relative;height:96px;background-size:cover;background-position:center}
.owp-mapcard .top::after{content:'';position:absolute;inset:0;background:linear-gradient(0deg,var(--panel),rgba(27,15,35,.2) 60%,rgba(27,15,35,.5))}
.owp-mapcard .nm{position:absolute;left:14px;bottom:10px;z-index:2;font-family:var(--disp);font-size:20px;text-transform:uppercase;color:#fff;-webkit-text-stroke:2px var(--stroke);paint-order:stroke fill}
.owp-mapcard .wl{position:absolute;right:12px;top:11px;z-index:2;font-family:var(--mono);font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--tx);background:rgba(27,15,35,.7);border:1px solid var(--line-or);padding:3px 8px}
.owp-mapcard .body{padding:16px 18px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.owp-mapcard .st .sk{font-family:var(--mono);font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--dim)}
.owp-mapcard .st .sv{font-family:var(--cond);font-weight:400;font-size:22px;margin-top:3px;line-height:1;color:var(--tx)}
.owp-mapcard .st .sv.rt{color:var(--or)}
.owp-mapcard .winbar{height:5px;background:#160c1f;margin:0 18px 16px;overflow:hidden;transform:skewX(-20deg)}
.owp-mapcard .winbar i{display:block;height:100%;background:linear-gradient(90deg,var(--or),var(--or2))}

.owp-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:120px 20px;font-family:var(--mono);font-size:12px;color:var(--dim);letter-spacing:.08em;text-transform:uppercase}
.owp-loading .owp-dim{color:var(--faint);font-size:11px}
.owp-spin{width:42px;height:42px;border:3px solid var(--panel2);border-top-color:var(--or);border-radius:50%;animation:owpspin .8s linear infinite}
@keyframes owpspin{to{transform:rotate(360deg)}}

@media(max-width:1000px){
  .owp-grid{grid-template-columns:1fr}
  .owp-strip{grid-template-columns:repeat(3,1fr)}
  .owp-hls,.owp-mapgrid{grid-template-columns:repeat(2,1fr)}
  .owp-combat{grid-template-columns:repeat(2,1fr)}
  .owp-mtbl .mh,.owp-mtbl .mr{grid-template-columns:4px 1.4fr 70px 64px}
  .owp-mtbl .mp,.owp-mtbl .kda,.owp-mtbl .adr,.owp-mtbl .h-kda,.owp-mtbl .h-adr{display:none}
}
@media(max-width:560px){
  .owp-strip{grid-template-columns:repeat(2,1fr)}
  .owp-hls,.owp-mapgrid,.owp-combat{grid-template-columns:1fr}
  .owp-bnr-rt{margin-left:0;align-items:flex-start;width:100%}
  .owp-ratebox{text-align:left}
}
`;
