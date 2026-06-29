"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Team, Match, PlayerStats, MapStats, getStatusType } from "@/lib/api";
import { MAP_IMAGES } from "@/lib/maps";

type Tab = "info" | "roster" | "matches" | "stats";

interface Props {
  team: Team;
  matches: Match[];
  playerStats: PlayerStats[];
  mapStats: MapStats[];
  teamsMap: Record<number, { name: string; logo: string | null }>;
}

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

export function TeamDetailContent({ team, matches, playerStats, mapStats, teamsMap }: Props) {
  const [tab, setTab] = useState<Tab>("info");
  const [hint, setHint] = useState<{ text: string; x: number; y: number } | null>(null);

  function showHint(e: React.MouseEvent, text: string) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cx = Math.min(Math.max(r.left + r.width / 2, 130), window.innerWidth - 130);
    setHint({ text, x: cx, y: r.top - 11 });
  }
  const hideHint = () => setHint(null);
  function hintProps(text: string) {
    return { onMouseEnter: (e: React.MouseEvent) => showHint(e, text), onMouseLeave: hideHint };
  }

  const players = useMemo(() => {
    return Object.entries(team.auth_name || {}).map(([steamId, val]) => {
      const name = typeof val === "string" ? val : val.name;
      const isCaptain = typeof val === "object" && val.captain === 1;
      const isCoach = typeof val === "object" && val.coach === 1;
      return { steamId, name, isCaptain, isCoach };
    });
  }, [team]);

  const finishedMatches = useMemo(() =>
    matches.filter(m => m.end_time && !m.cancelled && !m.forfeit),
    [matches]
  );

  const wins = finishedMatches.filter(m => m.winner === team.id).length;
  const losses = finishedMatches.length - wins;
  const winRate = finishedMatches.length > 0 ? ((wins / finishedMatches.length) * 100).toFixed(1) : "0";
  const winRateNum = parseFloat(winRate);

  const streak = useMemo(() => {
    let count = 0;
    let type: "W" | "L" | null = null;
    for (const m of finishedMatches) {
      const won = m.winner === team.id;
      if (type === null) { type = won ? "W" : "L"; count = 1; }
      else if ((type === "W" && won) || (type === "L" && !won)) count++;
      else break;
    }
    return { type, count };
  }, [finishedMatches, team.id]);

  const last5 = finishedMatches.slice(0, 5);

  const h2h = useMemo(() => {
    const map: Record<number, { name: string; logo: string | null; wins: number; losses: number; matches: number }> = {};
    for (const m of finishedMatches) {
      const opponentId = m.team1_id === team.id ? m.team2_id : m.team1_id;
      const opponentName = m.team1_id === team.id ? (m.team2_string || "?") : (m.team1_string || "?");
      if (!map[opponentId]) map[opponentId] = { name: opponentName, logo: teamsMap[opponentId]?.logo || null, wins: 0, losses: 0, matches: 0 };
      map[opponentId].matches++;
      if (m.winner === team.id) map[opponentId].wins++; else map[opponentId].losses++;
    }
    return Object.entries(map).map(([id, data]) => ({ id: parseInt(id), ...data })).sort((a, b) => b.matches - a.matches);
  }, [finishedMatches, team.id, teamsMap]);

  interface PlayerAgg {
    steamId: string; name: string; kills: number; deaths: number; assists: number;
    flashAssists: number; rounds: number; maps: number; rating: number[]; headshots: number; damage: number;
  }

  const playerAggregated = useMemo(() => {
    const byPlayer: Record<string, PlayerAgg> = {};
    for (const ps of playerStats) {
      if (ps.team_id !== team.id) continue;
      if (!byPlayer[ps.steam_id]) byPlayer[ps.steam_id] = { steamId: ps.steam_id, name: ps.name, kills: 0, deaths: 0, assists: 0, flashAssists: 0, rounds: 0, maps: 0, rating: [], headshots: 0, damage: 0 };
      const e = byPlayer[ps.steam_id];
      e.kills += ps.kills; e.deaths += ps.deaths; e.assists += ps.assists; e.flashAssists += ps.flash_assists;
      e.rounds += ps.roundsplayed; e.maps += 1; e.rating.push(ps.rating); e.headshots += ps.headshot_kills; e.damage += ps.damage;
      e.name = ps.name || e.name;
    }
    return Object.values(byPlayer).map(p => ({
      ...p,
      avgRating: p.rating.length > 0 ? (p.rating.reduce((a, b) => a + b, 0) / p.rating.length) : 0,
      kdr: p.deaths > 0 ? p.kills / p.deaths : p.kills,
      hsp: p.kills > 0 ? (p.headshots / p.kills) * 100 : 0,
      adr: p.rounds > 0 ? p.damage / p.rounds : 0,
    })).sort((a, b) => b.avgRating - a.avgRating);
  }, [playerStats, team.id]);

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
    return Object.entries(byMap).map(([map, stats]) => ({ map, ...stats, winRate: stats.played > 0 ? (stats.wins / stats.played) * 100 : 0 })).sort((a, b) => b.winRate - a.winRate);
  }, [mapStats, finishedMatches, team.id]);

  const getTeamName = (id: number, fallback: string) => teamsMap[id]?.name || fallback || `Time ${id}`;
  const getTeamLogo = (id: number) => teamsMap[id]?.logo || null;
  const isCaptainOf = (steamId: string) => players.find(pl => pl.steamId === steamId)?.isCaptain;
  const isCoachOf = (steamId: string) => players.find(pl => pl.steamId === steamId)?.isCoach;

  const tabs: { value: Tab; label: string }[] = [
    { value: "info", label: "Info" },
    { value: "roster", label: "Roster" },
    { value: "matches", label: "Partidas" },
    { value: "stats", label: "Stats" },
  ];

  const ratingClass = (r: number) => r >= 1.1 ? "hi" : r < 0.9 ? "lo" : "";

  // card de resultado (logo do adversário + WON/LOST)
  function ResultCard({ m }: { m: Match }) {
    const won = m.winner === team.id;
    const oppId = m.team1_id === team.id ? m.team2_id : m.team1_id;
    const oppName = getTeamName(oppId, m.team1_id === team.id ? m.team2_string : m.team1_string);
    const oppLogo = getTeamLogo(oppId);
    return (
      <Link href={`/partidas/${m.id}`} className="owp-rescard">
        <div className={`logo ${won ? "v" : "d"}`}>
          {oppLogo
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={oppLogo} alt={oppName} />
            : <span className="ph">{oppName?.charAt(0)?.toUpperCase() || "?"}</span>}
        </div>
        <span className="nm">{oppName}</span>
        <span className={`res ${won ? "v" : "d"}`}>{won ? "WON" : "LOST"}</span>
      </Link>
    );
  }

  return (
    <div className="owp">
      <style>{OWP_CSS}</style>

      <div className="owp-back wrap">
        <Link href="/times"><ArrowLeft size={14} /> Voltar aos Times</Link>
      </div>

      {/* ===== BANNER ===== */}
      <header className="owp-banner">
        <span className="owp-ghost">{team.name}</span>
        <div className="wrap">
          <div className="owp-logo">
            <div className="ph">
              {team.logo
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={team.logo} alt={team.name} />
                : <span className="owp-logo-fallback">{team.name?.charAt(0)?.toUpperCase() || "?"}</span>}
            </div>
          </div>
          <div className="owp-pinfo">
            <div className="owp-row1">
              {team.tag && <span className="owp-tag">[{team.tag}]</span>}
              <span className="owp-tag soft">{players.length} {players.length === 1 ? "jogador" : "jogadores"}</span>
              {streak.type && streak.count >= 2 && (
                <span className={`owp-tag ${streak.type === "W" ? "streakw" : "streakl"}`}>
                  {streak.type === "W" ? "▲" : "▼"} {streak.count}{streak.type} streak
                </span>
              )}
            </div>
            <h1>{team.flag ? `${team.flag} ` : ""}{team.name}</h1>
            {finishedMatches.length > 0 && (
              <div className="owp-meta">
                <span><b className="ok">{wins}V</b> · <b className="lo">{losses}D</b></span>
                <span><b>{finishedMatches.length}</b> PARTIDAS</span>
              </div>
            )}
          </div>
          {finishedMatches.length > 0 && (
            <div className="owp-bnr-rt">
              <div className="owp-ratebox">
                <div className="k">Win Rate</div>
                <div className={`v ${winRateNum >= 50 ? "hi" : "lo"}`}>{winRate}<small>%</small></div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ===== TABS ===== */}
      <nav className="owp-tabs"><div className="wrap">
        {tabs.map(t => <a key={t.value} className={tab === t.value ? "on" : ""} onClick={() => setTab(t.value)}>{t.label}</a>)}
      </div></nav>

      {/* ===== STRIP ===== */}
      {finishedMatches.length > 0 && (
        <div className="owp-strip">
          <div className="owp-scell"><div className="k">Partidas</div><div className="v">{finishedMatches.length}</div></div>
          <div className="owp-scell ok"><div className="k">Vitórias</div><div className="v">{wins}</div></div>
          <div className="owp-scell danger"><div className="k">Derrotas</div><div className="v">{losses}</div></div>
          <div className={`owp-scell ${winRateNum >= 50 ? "ok" : "danger"}`}><div className="k">Win Rate</div><div className="v">{winRate}<small>%</small></div></div>
        </div>
      )}

      <div className="wrap">
        {finishedMatches.length === 0 && tab === "info" && (
          <div className="owp-empty">Esse time ainda não tem partidas finalizadas registradas.</div>
        )}

        {/* ============ INFO ============ */}
        {tab === "info" && (
          <div className="owp-panel">
            {last5.length > 0 && (
              <section className="owp-sec">
                <div className="owp-lbl"><b>Últimas Partidas</b></div>
                <div className="owp-results">{last5.map(m => <ResultCard key={m.id} m={m} />)}</div>
              </section>
            )}
            {mapWinStats.length > 0 && (
              <section className="owp-sec">
                <div className="owp-lbl"><b>Winrate por Mapa</b></div>
                <div className="owp-winmap">
                  {mapWinStats.map(ms => (
                    <div className="row" key={ms.map}>
                      <div className="mn"><span className="th" style={{ backgroundImage: `url('${mapImg(ms.map)}')` }} />{mapLabel(ms.map)}</div>
                      <div className="bar"><i className={ms.winRate >= 60 ? "good" : ms.winRate >= 40 ? "mid" : "bad"} style={{ width: `${Math.max(ms.winRate, 4)}%` }} /><span className="pct">{ms.winRate.toFixed(1)}%</span></div>
                      <div className="wl">{ms.wins}V {ms.played - ms.wins}D</div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ============ ROSTER ============ */}
        {tab === "roster" && (
          <div className="owp-panel">
            <section className="owp-sec">
              <div className="owp-lbl"><b>Jogadores</b></div>
              {playerAggregated.length > 0 ? (
                <div className="owp-tblwrap">
                  <table className="owp-tbl">
                    <thead><tr>
                      <th className="l">Jogador</th><th>Mapas</th><th>K</th><th>D</th><th>A</th>
                      <th>K/D</th><th><span className="hh" {...hintProps("Dano médio por round.")}>ADR</span></th>
                      <th><span className="hh" {...hintProps("% dos abates que foram na cabeça.")}>HS%</span></th>
                      <th><span className="hh" {...hintProps("Rating 1.0 (modelo HLTV): desempenho geral, 1.00 é a média.")}>Rating</span></th>
                    </tr></thead>
                    <tbody>
                      {playerAggregated.map(p => (
                        <tr key={p.steamId}>
                          <td className="l"><div className="pl">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <Link href={`/perfil/${p.steamId}`} className="av"><img src={`/api/steam/avatar-image/${p.steamId}`} alt="" /></Link>
                            <Link href={`/perfil/${p.steamId}`}>{p.name}</Link>{isCaptainOf(p.steamId) && <span className="badge cap">CAP</span>}{isCoachOf(p.steamId) && <span className="badge coach">COACH</span>}</div></td>
                          <td className="dim">{p.maps}</td>
                          <td>{p.kills}</td>
                          <td className="dim">{p.deaths}</td>
                          <td className="dim">{p.assists}</td>
                          <td className={`b ${ratingClass(p.kdr)}`}>{p.kdr.toFixed(2)}</td>
                          <td>{p.adr.toFixed(1)}</td>
                          <td className="dim">{p.hsp.toFixed(1)}%</td>
                          <td className={`b ${ratingClass(p.avgRating)}`}>{p.avgRating.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : players.length > 0 ? (
                <div className="owp-tblwrap">
                  <table className="owp-tbl">
                    <thead><tr><th className="l">Nome</th><th className="l">Steam ID</th><th className="l">Função</th></tr></thead>
                    <tbody>
                      {players.map(p => (
                        <tr key={p.steamId}>
                          <td className="l"><Link href={`/perfil/${p.steamId}`}>{p.name || p.steamId}</Link></td>
                          <td className="l dim">{p.steamId}</td>
                          <td className="l">{p.isCaptain ? <span className="badge cap">Capitão</span> : p.isCoach ? <span className="badge coach">Coach</span> : <span className="dim">Jogador</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div className="owp-none owp-none-box">Nenhum jogador cadastrado.</div>}
            </section>
          </div>
        )}

        {/* ============ PARTIDAS ============ */}
        {tab === "matches" && (
          <div className="owp-panel">
            {finishedMatches.length > 0 && (
              <section className="owp-sec">
                <div className="owp-summary">
                  <div className="card"><div className="v">{streak.count}{streak.type || ""}</div><div className="k">{streak.type === "W" ? "Sequência de vitórias" : streak.type === "L" ? "Sequência de derrotas" : "Neutro"}</div></div>
                  <div className="card"><div className={`v ${winRateNum >= 50 ? "ok" : "lo"}`}>{winRate}%</div><div className="k">Win Rate</div></div>
                </div>
              </section>
            )}

            {h2h.length > 0 && (
              <section className="owp-sec">
                <div className="owp-lbl"><b>Head-to-Head</b></div>
                <div className="owp-h2h">
                  {h2h.map(opp => {
                    const wr = opp.matches > 0 ? Math.round((opp.wins / opp.matches) * 100) : 0;
                    return (
                      <Link key={opp.id} href={`/times/${opp.id}`} className="row">
                        <div className="logo">{opp.logo
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={opp.logo} alt={opp.name} />
                          : <span className="ph">{opp.name?.charAt(0)?.toUpperCase() || "?"}</span>}</div>
                        <span className="nm">{opp.name}</span>
                        <span className={`rec ${opp.wins > opp.losses ? "ok" : opp.wins < opp.losses ? "lo" : "dim"}`}>{opp.wins}V - {opp.losses}D</span>
                        <div className="bar"><i className={wr >= 50 ? "good" : "bad"} style={{ width: `${wr}%` }} /></div>
                        <span className="ct">{opp.matches}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {(() => {
              const upcoming = matches.filter(m => !m.end_time && !m.cancelled);
              if (upcoming.length === 0) return null;
              return (
                <section className="owp-sec">
                  <div className="owp-lbl"><b>Próximas Partidas</b></div>
                  <div className="owp-mtbl">
                    {upcoming.map(m => {
                      const oppId = m.team1_id === team.id ? m.team2_id : m.team1_id;
                      const oppName = getTeamName(oppId, m.team1_id === team.id ? m.team2_string : m.team1_string);
                      const isLive = getStatusType(m) === "live";
                      return (
                        <div className="mr up" key={m.id} onClick={() => window.location.href = `/partidas/${m.id}`}>
                          <span className={`w ${isLive ? "live" : ""}`} />
                          <div className="opp"><span className="t">vs {oppName}</span><span className="ev">{isLive ? "ao vivo" : "agendada"}</span></div>
                          <span className="sc">{m.team1_score} : {m.team2_score}</span>
                          {isLive ? <span className="livetag">● LIVE</span> : <span className="rt dim">—</span>}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })()}

            <section className="owp-sec">
              <div className="owp-lbl"><b>Resultados Recentes</b></div>
              {finishedMatches.length > 0 ? (
                <div className="owp-mtbl">
                  {finishedMatches.slice(0, 20).map(m => {
                    const won = m.winner === team.id;
                    const isTeam1 = m.team1_id === team.id;
                    const teamScore = isTeam1 ? m.team1_score : m.team2_score;
                    const oppScore = isTeam1 ? m.team2_score : m.team1_score;
                    const oppId = isTeam1 ? m.team2_id : m.team1_id;
                    const oppName = getTeamName(oppId, isTeam1 ? m.team2_string : m.team1_string);
                    return (
                      <div className="mr" key={m.id} onClick={() => window.location.href = `/partidas/${m.id}`}>
                        <span className={`w ${won ? "v" : "d"}`} />
                        <div className="opp"><span className="t">vs {oppName}</span>{m.title && <span className="ev">{m.title}</span>}</div>
                        <span className={`sc ${won ? "win" : "loss"}`}>{teamScore} : {oppScore}</span>
                        <span className={`rt ${won ? "hi" : "lo"}`}>{won ? "W" : "L"}</span>
                      </div>
                    );
                  })}
                </div>
              ) : <div className="owp-none owp-none-box">Nenhuma partida encontrada.</div>}
            </section>
          </div>
        )}

        {/* ============ STATS ============ */}
        {tab === "stats" && (
          <div className="owp-panel">
            {last5.length > 0 && (
              <section className="owp-sec">
                <div className="owp-lbl"><b>Últimas 5 Partidas</b></div>
                <div className="owp-results">{last5.map(m => <ResultCard key={m.id} m={m} />)}</div>
              </section>
            )}
            {mapWinStats.length > 0 && (
              <section className="owp-sec">
                <div className="owp-lbl"><b>Winrate por Mapa</b></div>
                <div className="owp-winmap">
                  {mapWinStats.map(ms => (
                    <div className="row" key={ms.map}>
                      <div className="mn"><span className="th" style={{ backgroundImage: `url('${mapImg(ms.map)}')` }} />{mapLabel(ms.map)}</div>
                      <div className="bar"><i className={ms.winRate >= 60 ? "good" : ms.winRate >= 40 ? "mid" : "bad"} style={{ width: `${Math.max(ms.winRate, 4)}%` }} /><span className="pct">{ms.winRate.toFixed(1)}%</span></div>
                      <div className="wl">{ms.wins}V {ms.played - ms.wins}D</div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {playerAggregated.length > 0 && (
              <section className="owp-sec">
                <div className="owp-lbl"><b>Stats dos Jogadores</b></div>
                <div className="owp-tblwrap">
                  <table className="owp-tbl">
                    <thead><tr>
                      <th className="l">Jogador</th><th>Mapas</th><th>Kills</th><th>Deaths</th><th>K/D</th>
                      <th><span className="hh" {...hintProps("Dano médio por round.")}>ADR</span></th>
                      <th><span className="hh" {...hintProps("% dos abates que foram na cabeça.")}>HS%</span></th>
                      <th><span className="hh" {...hintProps("Assistências de flashbang (cegou inimigo que foi morto).")}>Flash A.</span></th>
                      <th><span className="hh" {...hintProps("Rating 1.0 (modelo HLTV): desempenho geral, 1.00 é a média.")}>Rating</span></th>
                    </tr></thead>
                    <tbody>
                      {playerAggregated.map(p => (
                        <tr key={p.steamId}>
                          <td className="l"><div className="pl">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <Link href={`/perfil/${p.steamId}`} className="av"><img src={`/api/steam/avatar-image/${p.steamId}`} alt="" /></Link>
                            <Link href={`/perfil/${p.steamId}`}>{p.name}</Link></div></td>
                          <td className="dim">{p.maps}</td>
                          <td>{p.kills}</td>
                          <td className="dim">{p.deaths}</td>
                          <td className={`b ${ratingClass(p.kdr)}`}>{p.kdr.toFixed(2)}</td>
                          <td>{p.adr.toFixed(1)}</td>
                          <td className="dim">{p.hsp.toFixed(1)}%</td>
                          <td className="dim">{p.flashAssists}</td>
                          <td className={`b ${ratingClass(p.avgRating)}`}>{p.avgRating.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
            {mapWinStats.length === 0 && playerAggregated.length === 0 && (
              <div className="owp-none owp-none-box">Nenhuma estatística disponível.</div>
            )}
          </div>
        )}
      </div>

      {hint && (
        <div className="owp-tip on" style={{ left: hint.x, top: hint.y, transform: "translate(-50%,-100%)" }}>
          {hint.text}<span className="owp-tip-arrow" />
        </div>
      )}
    </div>
  );
}

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

.owp-back{padding-top:18px;padding-bottom:6px}
.owp-back a{display:inline-flex;align-items:center;gap:7px;font-family:var(--mono);font-size:11px;letter-spacing:.06em;color:var(--dim);transition:.15s}
.owp-back a:hover{color:var(--or2)}

.owp .hh{cursor:help;border-bottom:1px dotted var(--faint)}
.owp-tip{position:fixed;z-index:9999;max-width:240px;background:var(--panel2);border:1px solid var(--or);color:var(--tx);font-family:var(--body);font-weight:500;font-size:11.5px;line-height:1.42;text-align:left;padding:11px 13px;clip-path:polygon(0 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%);box-shadow:0 14px 38px -10px rgba(0,0,0,.8);pointer-events:none}
.owp-tip-arrow{position:absolute;left:50%;top:100%;transform:translateX(-50%);border:6px solid transparent;border-top-color:var(--or)}

.owp-lbl{display:flex;align-items:center;gap:13px;margin-bottom:20px}
.owp-lbl b{font-family:var(--disp);font-size:15px;letter-spacing:.04em;text-transform:uppercase;color:#fff;-webkit-text-stroke:2px var(--stroke);paint-order:stroke fill}
.owp-lbl::before{content:'';width:0;height:0;border-style:solid;border-width:7px 0 7px 11px;border-color:transparent transparent transparent var(--or)}
.owp-lbl::after{content:'';flex:1;height:2px;background:linear-gradient(90deg,var(--line-or),transparent)}

.owp-banner{position:relative;overflow:hidden;border-bottom:2px solid var(--or);margin-top:6px}
.owp-banner::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,var(--bg) 32%,rgba(27,15,35,.55) 72%,rgba(27,15,35,.85));z-index:0}
.owp-banner .wrap{position:relative;z-index:2;display:flex;align-items:flex-end;gap:30px;padding:40px clamp(20px,3.2vw,72px) 30px;flex-wrap:wrap}
.owp-ghost{position:absolute;right:2vw;bottom:-2.4vw;z-index:1;font-family:var(--disp);font-size:clamp(6rem,15vw,15rem);line-height:.7;color:transparent;-webkit-text-stroke:2px rgba(255,90,31,.15);text-transform:uppercase;pointer-events:none;letter-spacing:-.02em;user-select:none;white-space:nowrap;max-width:62vw;overflow:hidden}
.owp-logo{width:128px;height:128px;flex:0 0 auto;position:relative;clip-path:polygon(0 0,100% 0,100% 86%,86% 100%,0 100%);background:linear-gradient(160deg,var(--or),var(--vio));padding:3px}
.owp-logo .ph{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#0d0712;clip-path:polygon(0 0,100% 0,100% 85%,85% 100%,0 100%)}
.owp-logo .ph img{width:74%;height:74%;object-fit:contain}
.owp-logo-fallback{font-family:var(--disp);font-size:46px;color:var(--faint)}
.owp-pinfo{padding-bottom:4px;min-width:0}
.owp-row1{display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap}
.owp-tag{display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#fff;background:rgba(124,92,255,.16);border:1px solid var(--vio);padding:5px 11px;clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)}
.owp-tag.soft{background:rgba(255,255,255,.04);border-color:var(--line);color:var(--dim)}
.owp-tag.streakw{background:rgba(84,224,138,.12);border-color:var(--ok);color:var(--ok)}
.owp-tag.streakl{background:rgba(255,59,87,.12);border-color:var(--live);color:#FF8A9C}
.owp-pinfo h1{font-family:var(--disp);font-size:clamp(2.4rem,5.4vw,5rem);line-height:.82;text-transform:uppercase;color:#fff;-webkit-text-stroke:3px var(--stroke);paint-order:stroke fill;letter-spacing:-.005em;word-break:break-word}
.owp-meta{display:flex;gap:22px;margin-top:15px;font-family:var(--mono);font-size:11.5px;color:var(--dim);flex-wrap:wrap}
.owp-meta b{color:var(--tx)}.owp-meta b.ok{color:var(--ok)}.owp-meta b.lo{color:#FF7A8C}
.owp-bnr-rt{margin-left:auto;display:flex;flex-direction:column;align-items:flex-end;gap:14px}
.owp-ratebox{text-align:right}
.owp-ratebox .k{font-family:var(--mono);font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--dim)}
.owp-ratebox .v{font-family:var(--disp);font-size:clamp(2.4rem,4.6vw,3.6rem);line-height:.86;color:var(--or);text-shadow:0 0 28px rgba(255,90,31,.4)}
.owp-ratebox .v small{font-family:var(--mono);font-size:14px;color:var(--dim)}
.owp-ratebox .v.hi{color:var(--ok)}.owp-ratebox .v.lo{color:#FF7A8C}

.owp-tabs{border-bottom:1px solid var(--line);background:var(--bg2)}
.owp-tabs .wrap{display:flex;gap:30px}
.owp-tabs a{padding:16px 2px;font-family:var(--cond);font-weight:400;font-size:15px;letter-spacing:.08em;text-transform:uppercase;color:var(--dim);position:relative;transition:.15s;cursor:pointer}
.owp-tabs a:hover{color:var(--tx)}.owp-tabs a.on{color:#fff}
.owp-tabs a.on::after{content:'';position:absolute;left:0;right:0;bottom:-1px;height:3px;background:var(--or)}

.owp-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:24px clamp(20px,3.2vw,72px);background:var(--bg2);border-bottom:1px solid var(--line)}
.owp-scell{position:relative;background:var(--panel);padding:18px 20px;border-left:3px solid var(--or);clip-path:polygon(0 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%)}
.owp-scell .k{font-family:var(--mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim)}
.owp-scell .v{font-family:var(--cond);font-weight:400;font-size:clamp(26px,2.4vw,38px);margin-top:6px;line-height:1;color:var(--tx)}
.owp-scell .v small{font-family:var(--mono);font-size:13px;color:var(--dim)}
.owp-scell.ok{border-left-color:var(--ok)}.owp-scell.ok .v{color:var(--ok)}
.owp-scell.danger{border-left-color:var(--live)}.owp-scell.danger .v{color:#FF7A8C}

.owp-sec{padding:34px 0}
.owp-empty,.owp-none-box{font-family:var(--mono);font-size:12.5px;color:var(--dim);background:var(--panel);border:1px solid var(--line);padding:22px;margin-top:30px;line-height:1.5}
.owp-none{font-family:var(--mono);font-size:11px;color:var(--faint);text-transform:uppercase;letter-spacing:.06em;padding:18px}

.owp-results{display:flex;flex-wrap:wrap;gap:14px}
.owp-rescard{display:flex;flex-direction:column;align-items:center;gap:9px;width:104px}
.owp-rescard .logo{width:72px;height:72px;display:flex;align-items:center;justify-content:center;background:var(--panel);border:1px solid var(--line);clip-path:polygon(0 0,100% 0,100% 82%,82% 100%,0 100%);transition:.15s}
.owp-rescard .logo.v{border-color:rgba(84,224,138,.4);box-shadow:inset 0 0 24px rgba(84,224,138,.12)}
.owp-rescard .logo.d{border-color:rgba(255,59,87,.4);box-shadow:inset 0 0 24px rgba(255,59,87,.12)}
.owp-rescard .logo img{width:60%;height:60%;object-fit:contain}
.owp-rescard .logo .ph{font-family:var(--disp);font-size:26px;color:var(--faint)}
.owp-rescard:hover .logo img{transform:scale(1.08)}
.owp-rescard .nm{font-family:var(--mono);font-size:10px;color:var(--dim);text-align:center;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.owp-rescard .res{font-family:var(--cond);font-weight:400;font-size:12px;letter-spacing:.08em;padding:3px 12px;clip-path:polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)}
.owp-rescard .res.v{background:rgba(84,224,138,.16);color:var(--ok)}
.owp-rescard .res.d{background:rgba(255,59,87,.16);color:#FF8A9C}

.owp-winmap{background:var(--panel);border:1px solid var(--line);padding:8px 0}
.owp-winmap .row{display:grid;grid-template-columns:150px 1fr 80px;align-items:center;gap:16px;padding:11px 18px}
.owp-winmap .row+.row{border-top:1px solid var(--line)}
.owp-winmap .mn{display:flex;align-items:center;gap:11px;font-family:var(--cond);font-weight:400;font-size:14px;text-transform:uppercase;letter-spacing:.03em}
.owp-winmap .mn .th{width:38px;height:24px;background-size:cover;background-position:center;opacity:.85;clip-path:polygon(0 0,100% 0,100% 75%,88% 100%,0 100%)}
.owp-winmap .bar{position:relative;height:22px;background:#160c1f;overflow:hidden;transform:skewX(-16deg)}
.owp-winmap .bar i{display:block;height:100%}
.owp-winmap .bar i.good{background:linear-gradient(90deg,rgba(84,224,138,.45),rgba(84,224,138,.7))}
.owp-winmap .bar i.mid{background:linear-gradient(90deg,var(--or),var(--or2))}
.owp-winmap .bar i.bad{background:linear-gradient(90deg,rgba(255,59,87,.4),rgba(255,59,87,.65))}
.owp-winmap .bar .pct{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;transform:skewX(16deg);font-family:var(--mono);font-size:11px;font-weight:700;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.6)}
.owp-winmap .wl{font-family:var(--mono);font-size:11px;color:var(--dim);text-align:right}

.owp-summary{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
.owp-summary .card{background:var(--panel);border:1px solid var(--line);border-top:2px solid var(--line-or);padding:22px;text-align:center;clip-path:polygon(0 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%)}
.owp-summary .card .v{font-family:var(--cond);font-weight:400;font-size:40px;line-height:1;color:var(--tx)}
.owp-summary .card .v.ok{color:var(--ok)}.owp-summary .card .v.lo{color:#FF7A8C}
.owp-summary .card .k{font-family:var(--mono);font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--dim);margin-top:10px}

.owp-h2h{background:var(--panel);border:1px solid var(--line)}
.owp-h2h .row{display:grid;grid-template-columns:32px 1fr 90px 90px 30px;align-items:center;gap:14px;padding:11px 18px;transition:.15s}
.owp-h2h .row:hover{background:var(--panel2)}.owp-h2h .row+.row{border-top:1px solid var(--line)}
.owp-h2h .logo{width:30px;height:30px;display:flex;align-items:center;justify-content:center;background:var(--bg2);border:1px solid var(--line)}
.owp-h2h .logo img{width:70%;height:70%;object-fit:contain}
.owp-h2h .logo .ph{font-family:var(--disp);font-size:13px;color:var(--faint)}
.owp-h2h .nm{font-family:var(--cond);font-weight:400;font-size:15px;text-transform:uppercase;letter-spacing:.02em;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.owp-h2h .rec{font-family:var(--mono);font-size:12px;font-weight:700;text-align:right}
.owp-h2h .rec.ok{color:var(--ok)}.owp-h2h .rec.lo{color:#FF7A8C}.owp-h2h .rec.dim{color:var(--dim)}
.owp-h2h .bar{height:6px;background:var(--bg2);overflow:hidden;transform:skewX(-16deg)}
.owp-h2h .bar i{display:block;height:100%}
.owp-h2h .bar i.good{background:var(--ok)}.owp-h2h .bar i.bad{background:var(--live)}
.owp-h2h .ct{font-family:var(--mono);font-size:11px;color:var(--dim);text-align:right}

.owp-mtbl{background:var(--panel);border:1px solid var(--line)}
.owp-mtbl .mr{display:flex;align-items:center;gap:13px;padding:13px 18px;font-family:var(--mono);font-size:12.5px;transition:.15s;cursor:pointer}
.owp-mtbl .mr:hover{background:var(--panel2)}.owp-mtbl .mr+.mr{border-top:1px solid var(--line)}
.owp-mtbl .w{width:4px;height:32px;flex:0 0 auto;transform:skewX(-12deg);background:var(--faint)}
.owp-mtbl .w.v{background:var(--ok)}.owp-mtbl .w.d{background:var(--live)}.owp-mtbl .w.live{background:var(--live)}
.owp-mtbl .opp{flex:1;display:flex;flex-direction:column;gap:3px;min-width:0}
.owp-mtbl .opp .t{font-family:var(--cond);font-weight:400;font-size:15px;letter-spacing:.02em;text-transform:uppercase;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.owp-mtbl .opp .ev{font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--faint)}
.owp-mtbl .sc{font-family:var(--cond);font-weight:400;font-size:17px;color:var(--tx)}
.owp-mtbl .sc.win{color:var(--ok)}.owp-mtbl .sc.loss{color:#FF7A8C}
.owp-mtbl .rt{font-family:var(--cond);font-weight:400;font-size:16px;width:40px;text-align:right;color:var(--tx)}
.owp-mtbl .rt.hi{color:var(--ok)}.owp-mtbl .rt.lo{color:#FF7A8C}.owp-mtbl .rt.dim{color:var(--faint)}
.owp-mtbl .livetag{font-family:var(--mono);font-size:10px;font-weight:700;color:var(--live);letter-spacing:.08em}

.owp-tblwrap{background:var(--panel);border:1px solid var(--line);overflow-x:auto}
.owp-tbl{width:100%;border-collapse:collapse;font-family:var(--mono);font-size:12.5px}
.owp-tbl th{font-family:var(--mono);font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--faint);font-weight:400;text-align:center;padding:14px 12px;background:var(--bg2);border-bottom:1px solid var(--line);white-space:nowrap}
.owp-tbl th.l,.owp-tbl td.l{text-align:left}
.owp-tbl td{text-align:center;padding:13px 12px;color:var(--tx);white-space:nowrap}
.owp-tbl tr+tr td{border-top:1px solid var(--line)}
.owp-tbl tbody tr:hover td{background:var(--panel2)}
.owp-tbl td.dim{color:var(--dim)}
.owp-tbl td.b{font-family:var(--cond);font-weight:400;font-size:16px}
.owp-tbl td.b.hi{color:var(--ok)}.owp-tbl td.b.lo{color:#FF7A8C}
.owp-tbl .pl{display:flex;align-items:center;gap:10px}
.owp-tbl .pl a.av{flex:0 0 auto;width:30px;height:30px;overflow:hidden;background:#0d0712;border:1px solid var(--line-or);clip-path:polygon(0 0,100% 0,100% 78%,78% 100%,0 100%);transition:.15s}
.owp-tbl .pl a.av:hover{border-color:var(--or)}
.owp-tbl .pl a.av img{width:100%;height:100%;object-fit:cover}
.owp-tbl .pl a:not(.av){font-family:var(--cond);font-weight:400;font-size:15px;text-transform:uppercase;letter-spacing:.02em;transition:.15s}
.owp-tbl .pl a:not(.av):hover,.owp-tbl td.l a:hover{color:var(--or2)}
.owp-tbl .badge{font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:.06em;padding:2px 7px;text-transform:uppercase}
.owp-tbl .badge.cap{background:rgba(255,90,31,.16);border:1px solid var(--or);color:var(--or2)}
.owp-tbl .badge.coach{background:rgba(255,194,75,.14);border:1px solid var(--gold);color:var(--gold)}

@media(max-width:1000px){
  .owp-strip{grid-template-columns:repeat(2,1fr)}
  .owp-winmap .row{grid-template-columns:110px 1fr 70px}
}
@media(max-width:560px){
  .owp-bnr-rt{margin-left:0;align-items:flex-start;width:100%}
  .owp-ratebox{text-align:left}
  .owp-summary{grid-template-columns:1fr}
  .owp-h2h .row{grid-template-columns:28px 1fr 76px 60px 24px;gap:10px}
}
`;
