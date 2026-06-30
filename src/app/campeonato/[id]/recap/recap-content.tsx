"use client";

import React from "react";
import Link from "next/link";
import { Tournament, getTeamName, BracketMatch } from "@/lib/tournament";
import type { Match, MapStats, PlayerStats, LeaderboardEntry, HighlightClip } from "@/lib/api";
import { calculateAwards } from "@/lib/awards";
import { OWP_CSS } from "@/lib/owp-styles";

interface MatchData {
  bracketMatch: BracketMatch;
  match: Match | null;
  mapStats: MapStats[];
  playerStats: PlayerStats[];
}

interface RecapContentProps {
  tournament: Tournament;
  leaderboard: LeaderboardEntry[];
  matchesData: MatchData[];
  highlights: HighlightClip[];
  teamsMap?: Record<number, { name: string; logo?: string }>;
}

const onImgErr = (e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = "none"; };
const initial = (s?: string | null) => (s || "?").trim().charAt(0).toUpperCase() || "?";
const mapLabel = (m?: string | null) => (m || "").replace("de_", "").toUpperCase();

const RECAP_CSS = `
.owp .rhero{text-align:center;padding:40px 0 20px;position:relative;overflow:hidden}
.owp .rhero .badge{display:inline-flex;align-items:center;gap:8px;padding:7px 15px;background:rgba(255,90,31,.1);border:1px solid var(--line-or);font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--or2)}
.owp .rhero h1{font-family:var(--disp);font-size:clamp(2.2rem,5vw,4rem);text-transform:uppercase;color:#fff;-webkit-text-stroke:3px var(--stroke);paint-order:stroke fill;margin:22px 0 6px;line-height:.9}
.owp .champ{max-width:560px;margin:26px auto 0;position:relative;overflow:hidden;background:linear-gradient(180deg,rgba(245,197,66,.08),var(--panel) 70%);border:1px solid rgba(245,197,66,.32);border-top:2px solid var(--gold);padding:26px;clip-path:polygon(0 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%)}
.owp .champ .lbl2{display:flex;align-items:center;justify-content:center;gap:10px;font-family:var(--mono);font-size:9px;letter-spacing:.25em;text-transform:uppercase;color:var(--gold)}
.owp .champ .who{display:flex;align-items:center;justify-content:center;gap:18px;margin-top:16px}
.owp .champ .lg{width:74px;height:74px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;background:#0d0712;border:1px solid var(--gold);clip-path:polygon(0 0,100% 0,100% 82%,82% 100%,0 100%);font-family:var(--cond);font-size:36px;color:var(--gold);overflow:hidden;position:relative}
.owp .champ .lg img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;padding:10px}
.owp .champ .nm{font-family:var(--disp);font-size:clamp(1.6rem,3.2vw,2.6rem);text-transform:uppercase;color:var(--gold);text-shadow:0 0 26px rgba(245,197,66,.45)}
.owp .champ .ev{font-family:var(--mono);font-size:9.5px;color:rgba(245,197,66,.6);margin-top:5px;letter-spacing:.08em}
.owp .rmvp{max-width:440px;margin:18px auto 0;background:linear-gradient(180deg,rgba(255,90,31,.08),var(--panel) 70%);border:1px solid var(--line-or);border-top:2px solid var(--or);padding:16px 22px;clip-path:polygon(0 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%)}
.owp .rmvp .lbl2{display:flex;align-items:center;justify-content:center;gap:9px;font-family:var(--mono);font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:var(--or2)}
.owp .rmvp .nm{font-family:var(--disp);font-size:20px;text-transform:uppercase;color:var(--or2);margin-top:8px;transition:.15s}
.owp .rmvp:hover .nm{color:#fff}
.owp .rmvp .st{display:flex;align-items:center;justify-content:center;gap:14px;font-family:var(--mono);font-size:10px;color:var(--dim);margin-top:7px}
.owp .rmvp .st b{color:var(--or2)}

.owp .shead{display:flex;align-items:center;gap:13px;margin:48px 0 20px}
.owp .shead .ic{color:var(--or);font-size:15px}
.owp .shead b{font-family:var(--disp);font-size:14px;letter-spacing:.06em;text-transform:uppercase;color:#fff;-webkit-text-stroke:2px var(--stroke);paint-order:stroke fill;font-weight:400}
.owp .shead::after{content:'';flex:1;height:2px;background:linear-gradient(90deg,var(--line-or),transparent)}

.owp .agrid{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}
.owp .acard{background:var(--panel);border:1px solid var(--line);border-top:2px solid var(--line-or);padding:18px 12px;text-align:center;transition:.15s;clip-path:polygon(0 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%)}
.owp .acard:hover{border-color:var(--line-or);transform:translateY(-3px)}
.owp .acard.mvp1{border-top-color:var(--gold);background:linear-gradient(180deg,rgba(245,197,66,.06),var(--panel) 60%)}
.owp .acard .emo{font-size:28px;line-height:1}
.owp .acard .att{font-family:var(--mono);font-size:8.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--or2);margin-top:9px}
.owp .acard.mvp1 .att{color:var(--gold)}
.owp .acard .apl{font-family:var(--cond);font-size:16px;text-transform:uppercase;color:#fff;margin-top:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.owp .acard .aval{font-family:var(--mono);font-size:10px;color:var(--tx);margin-top:5px}
.owp .acard .adesc{font-family:var(--mono);font-size:8px;color:var(--faint);margin-top:4px;line-height:1.3}

.owp .sgrid{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}
.owp .sbox{background:var(--panel);border:1px solid var(--line);border-left:3px solid var(--or);padding:16px 16px;clip-path:polygon(0 0,100% 0,100% calc(100% - 11px),calc(100% - 11px) 100%,0 100%)}
.owp .sbox .k{font-family:var(--mono);font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--dim)}
.owp .sbox .v{font-family:var(--cond);font-size:26px;line-height:1;color:var(--tx);margin-top:7px}
.owp .sbox .s{font-family:var(--mono);font-size:8.5px;color:var(--faint);margin-top:5px;min-height:11px}

.owp .tl{position:relative;max-width:780px;margin:0 auto;padding:6px 0}
.owp .tl::before{content:'';position:absolute;left:50%;top:0;bottom:0;width:2px;background:linear-gradient(180deg,var(--line-or),rgba(255,90,31,.15),var(--line-or));transform:translateX(-1px)}
.owp .tli{position:relative;width:50%;padding:0 28px;margin-bottom:14px;box-sizing:border-box}
.owp .tli.l{left:0;text-align:right}
.owp .tli.r{left:50%}
.owp .tli .dot{position:absolute;top:20px;width:13px;height:13px;background:var(--bg);border:2px solid var(--ok);z-index:2}
.owp .tli.l .dot{right:-6px}.owp .tli.r .dot{left:-7px}
.owp .tli.gf .dot{border-color:var(--gold);background:rgba(245,197,66,.2)}
.owp .tlc{display:block;text-align:left;width:100%;max-width:330px;background:var(--panel);border:1px solid var(--line);border-left:2px solid var(--ok);padding:13px 15px;clip-path:polygon(0 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%);transition:.15s}
.owp .tli.l .tlc{margin-left:auto}
.owp .tlc:hover{border-color:var(--line-or)}
.owp .tli.gf .tlc{border-color:rgba(245,197,66,.4);border-left-color:var(--gold);background:linear-gradient(90deg,rgba(245,197,66,.05),var(--panel))}
.owp .tlc .top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px}
.owp .tlc .ph{font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--or2)}
.owp .tli.gf .tlc .ph{color:var(--gold)}
.owp .tlc .dt{font-family:var(--mono);font-size:9px;color:var(--faint)}
.owp .tlc .mt{display:flex;align-items:center;gap:10px}
.owp .tlc .tn{flex:1;font-family:var(--cond);font-size:14px;text-transform:uppercase;color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.owp .tlc .tn.tl{text-align:right}.owp .tlc .tn.win{color:var(--ok)}.owp .tli.gf .tlc .tn.win{color:var(--gold)}
.owp .tlc .sc{font-family:var(--cond);font-size:17px;color:#fff;flex:0 0 auto}
.owp .tlc .sc .x{color:var(--faint);margin:0 3px;font-size:12px}
.owp .tlc .map{text-align:center;font-family:var(--mono);font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--or2);margin-top:8px}

.owp .mdist{display:flex;flex-direction:column;gap:11px}
.owp .mdrow{display:flex;align-items:center;gap:14px}
.owp .mdrow .mn{width:110px;flex:0 0 auto;text-align:right;font-family:var(--cond);font-size:14px;text-transform:uppercase;color:var(--tx)}
.owp .mdbar{flex:1;position:relative;height:28px;background:#160c1f;border:1px solid var(--line);overflow:hidden}
.owp .mdbar i{position:absolute;inset:0 auto 0 0;height:100%;background:linear-gradient(90deg,rgba(255,90,31,.4),rgba(255,90,31,.15));border-right:1px solid var(--or)}
.owp .mdbar .ct{position:absolute;inset:0;display:flex;align-items:center;padding:0 12px;font-family:var(--mono);font-size:11px;font-weight:700;color:#fff}

.owp .bh{display:flex;gap:22px;align-items:center;background:var(--panel);border:1px solid var(--line-or);padding:22px;clip-path:polygon(0 0,100% 0,100% calc(100% - 16px),calc(100% - 16px) 100%,0 100%)}
.owp .bh .binfo{flex:1;min-width:0}
.owp .bh .sc{display:flex;align-items:center;gap:8px;font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--gold)}
.owp .bh .pl{font-family:var(--disp);font-size:20px;text-transform:uppercase;color:#fff;-webkit-text-stroke:1px var(--stroke);paint-order:stroke fill;margin-top:11px}
.owp .bh .desc{font-family:var(--mono);font-size:11px;color:var(--dim);margin-top:7px}
.owp .bh .meta{display:flex;gap:14px;font-family:var(--mono);font-size:9px;color:var(--faint);margin-top:9px;text-transform:uppercase;letter-spacing:.06em;flex-wrap:wrap}
.owp .bh .thumb{width:220px;aspect-ratio:16/9;flex:0 0 auto;position:relative;overflow:hidden;border:1px solid var(--line-or);clip-path:polygon(0 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%)}
.owp .bh .thumb img{width:100%;height:100%;object-fit:cover;opacity:.8}
.owp .bh .thumb::after{content:'▶';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px;text-shadow:0 0 16px var(--or)}

.owp .rcta{display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;padding:48px 0 8px}

@media(max-width:1000px){.owp .agrid,.owp .sgrid{grid-template-columns:repeat(3,1fr)}.owp .bh{flex-direction:column}.owp .bh .thumb{width:100%}}
@media(max-width:620px){.owp .agrid,.owp .sgrid{grid-template-columns:repeat(2,1fr)}
  .owp .tl::before{left:18px}.owp .tli{width:100%;left:0;text-align:left;padding:0 0 0 44px}.owp .tli .dot{left:12px;right:auto}.owp .tli.l .dot{right:auto;left:12px}.owp .tli .tlc{margin:0;max-width:none}
  .owp .tbl th:nth-child(5),.owp .tbl td:nth-child(5),.owp .tbl th:nth-child(6),.owp .tbl td:nth-child(6){display:none}
  .owp .rhero h1{font-size:1.9rem}.owp .shead{margin-top:36px}}
`;

export function RecapContent({ tournament, leaderboard, matchesData, highlights, teamsMap = {} }: RecapContentProps) {
  const t = tournament;
  const gf = t.matches.find(m => m.id === "GF");
  const champion = gf?.winner_id ? t.teams.find(tm => tm.id === gf.winner_id) : null;
  const championLogo = champion ? teamsMap[champion.id]?.logo : undefined;

  const allPlayerStats = matchesData.flatMap(md => md.playerStats);
  const allMapStats = matchesData.flatMap(md => md.mapStats);
  const finishedMatches = matchesData.filter(md => md.match);

  const awards = calculateAwards(allPlayerStats);

  const totalKills = allPlayerStats.reduce((s, p) => s + p.kills, 0);
  const totalHeadshots = allPlayerStats.reduce((s, p) => s + p.headshot_kills, 0);
  const totalRoundsActual = allMapStats.reduce((s, ms) => s + ms.team1_score + ms.team2_score, 0);

  let closestMatch: { match: Match; bracketMatch: BracketMatch; diff: number } | null = null;
  let biggestBlowout: { match: Match; bracketMatch: BracketMatch; diff: number } | null = null;
  for (const md of finishedMatches) {
    if (!md.match) continue;
    const diff = Math.abs(md.match.team1_score - md.match.team2_score);
    if (!closestMatch || diff < closestMatch.diff) closestMatch = { match: md.match, bracketMatch: md.bracketMatch, diff };
    if (!biggestBlowout || diff > biggestBlowout.diff) biggestBlowout = { match: md.match, bracketMatch: md.bracketMatch, diff };
  }

  const topPlayers = [...leaderboard]
    .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
    .slice(0, 5)
    .map(p => ({
      name: p.name, steamId: p.steamId, totalKills: p.kills,
      avgRating: p.average_rating || 0,
      kd: p.deaths > 0 ? p.kills / p.deaths : p.kills,
      hsp: p.hsp || 0,
    }));

  const mvp = leaderboard.length > 0
    ? leaderboard.reduce((best, curr) => (curr.average_rating > best.average_rating ? curr : best), leaderboard[0])
    : null;

  const mapCounts: Record<string, number> = {};
  for (const ms of allMapStats) { const name = ms.map_name || "unknown"; mapCounts[name] = (mapCounts[name] || 0) + 1; }
  for (const bm of t.matches) {
    if (bm.status === "finished" && bm.map && !allMapStats.some(ms => ms.match_id === bm.match_id)) {
      mapCounts[bm.map] = (mapCounts[bm.map] || 0) + 1;
    }
  }
  const mapDistribution = Object.entries(mapCounts).sort((a, b) => b[1] - a[1]);
  const maxMapCount = mapDistribution.length > 0 ? mapDistribution[0][1] : 1;

  const timelineMatches = [...matchesData]
    .filter(md => md.match)
    .sort((a, b) => {
      const at = a.match?.start_time ? new Date(a.match.start_time).getTime() : 0;
      const bt = b.match?.start_time ? new Date(b.match.start_time).getTime() : 0;
      return at - bt;
    });

  const bestHighlight = highlights.length > 0
    ? highlights.reduce((best, curr) => (curr.score > best.score ? curr : best), highlights[0])
    : null;

  return (
    <div className="owp">
      <style>{OWP_CSS + RECAP_CSS}</style>

      <div className="wrap">
        {/* ===== HERO ===== */}
        <section className="rhero">
          <span className="badge">📊 Recap Completo</span>
          <h1>{t.name}</h1>

          {champion && (
            <div className="champ">
              <div className="lbl2">🏆 Campeão 🏆</div>
              <div className="who">
                <span className="lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {championLogo ? <img src={championLogo} alt="" /> : initial(champion.name)}
                </span>
                <div><div className="nm">{champion.name}</div><div className="ev">{t.name}</div></div>
              </div>
            </div>
          )}

          {mvp && (
            <Link href={`/perfil/${mvp.steamId}`} className="rmvp" style={{ display: "block" }}>
              <div className="lbl2">★ MVP do Campeonato ★</div>
              <div className="nm">{mvp.name}</div>
              <div className="st"><span>Rating <b>{(mvp.average_rating || 0).toFixed(2)}</b></span><span>{mvp.kills}K / {mvp.deaths}D</span><span>HS <b>{Math.round(mvp.hsp || 0)}%</b></span></div>
            </Link>
          )}
        </section>

        {/* ===== AWARDS ===== */}
        {awards.length > 0 && (
          <>
            <div className="shead"><span className="ic">★</span><b>Destaques do Campeonato</b></div>
            <div className="agrid">
              {awards.map((a, i) => (
                <Link key={a.id} href={`/perfil/${a.steamId}`} className={`acard ${i === 0 ? "mvp1" : ""}`}>
                  <div className="emo">{a.emoji}</div>
                  <div className="att">{a.title}</div>
                  <div className="apl">{a.playerName}</div>
                  <div className="aval">{a.value}</div>
                  <div className="adesc">{a.description}</div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* ===== ESTATÍSTICAS GERAIS ===== */}
        <div className="shead"><span className="ic">◎</span><b>Estatísticas Gerais</b></div>
        <div className="sgrid">
          <div className="sbox"><div className="k">Partidas</div><div className="v">{finishedMatches.length}</div><div className="s">{t.matches.length} no bracket</div></div>
          <div className="sbox"><div className="k">Total Kills</div><div className="v">{totalKills.toLocaleString("pt-BR")}</div><div className="s" /></div>
          <div className="sbox"><div className="k">Headshots</div><div className="v">{totalHeadshots.toLocaleString("pt-BR")}</div><div className="s">{totalKills > 0 ? `${Math.round((totalHeadshots / totalKills) * 100)}% HS` : ""}</div></div>
          <div className="sbox"><div className="k">Total Rounds</div><div className="v">{totalRoundsActual.toLocaleString("pt-BR")}</div><div className="s" /></div>
          <div className="sbox"><div className="k">Mais Acirrada</div><div className="v">{closestMatch ? `${closestMatch.match.team1_score}-${closestMatch.match.team2_score}` : "—"}</div><div className="s">{closestMatch?.bracketMatch.label || ""}</div></div>
          <div className="sbox"><div className="k">Maior Goleada</div><div className="v">{biggestBlowout ? `${biggestBlowout.match.team1_score}-${biggestBlowout.match.team2_score}` : "—"}</div><div className="s">{biggestBlowout?.bracketMatch.label || ""}</div></div>
        </div>

        {/* ===== TOP 5 ===== */}
        <div className="shead"><span className="ic">⦿</span><b>Top 5 Jogadores</b></div>
        <div className="tblwrap"><table className="tbl">
          <thead><tr><th>#</th><th className="l">Jogador</th><th>Rating</th><th>K/D</th><th>HS%</th><th>Kills</th></tr></thead>
          <tbody>
            {topPlayers.length > 0 ? topPlayers.map((p, i) => (
              <tr key={p.steamId}>
                <td><span className={`rank ${i < 3 ? "top" : ""}`}>{i + 1}</span></td>
                <td className="l"><Link href={`/perfil/${p.steamId}`} className="pl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <span className="av"><img src={`/api/steam/avatar-image/${p.steamId}`} alt="" onError={onImgErr} /></span>
                  <a>{p.name}</a></Link></td>
                <td className={`b ${p.avgRating >= 1.2 ? "hi" : p.avgRating < 1 ? "lo" : ""}`}>{p.avgRating.toFixed(2)}</td>
                <td>{p.kd.toFixed(2)}</td>
                <td className="dim">{Math.round(p.hsp)}%</td>
                <td className="dim">{p.totalKills}</td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="dim" style={{ textAlign: "center", padding: 24 }}>Nenhum dado de jogador disponível</td></tr>
            )}
          </tbody>
        </table></div>

        {/* ===== TIMELINE ===== */}
        {timelineMatches.length > 0 && (
          <>
            <div className="shead"><span className="ic">◷</span><b>Timeline do Campeonato</b></div>
            <div className="tl">
              {timelineMatches.map((md, i) => {
                const m = md.match!;
                const isGF = md.bracketMatch.id === "GF";
                const side = i % 2 === 0 ? "l" : "r";
                const mp = md.mapStats[0]?.map_name || md.bracketMatch.map || null;
                const date = m.start_time ? new Date(m.start_time).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" }) : "";
                const t1 = m.team1_string || getTeamName(t, md.bracketMatch.team1_id);
                const t2 = m.team2_string || getTeamName(t, md.bracketMatch.team2_id);
                const w1 = m.winner === m.team1_id, w2 = m.winner === m.team2_id;
                return (
                  <div key={md.bracketMatch.id} className={`tli ${side} ${isGF ? "gf" : ""}`}>
                    <div className="dot" />
                    <Link href={`/partidas/${m.id}`} className="tlc">
                      <div className="top"><span className="ph">{isGF ? "🏆 " : ""}{md.bracketMatch.label}</span><span className="dt">{date}</span></div>
                      <div className="mt">
                        <span className={`tn tl ${w1 ? "win" : ""}`}>{t1}</span>
                        <span className="sc">{m.team1_score}<span className="x">:</span>{m.team2_score}</span>
                        <span className={`tn ${w2 ? "win" : ""}`}>{t2}</span>
                      </div>
                      {mp && <div className="map">{mapLabel(mp)}</div>}
                    </Link>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ===== DISTRIBUIÇÃO DE MAPAS ===== */}
        {mapDistribution.length > 0 && (
          <>
            <div className="shead"><span className="ic">⌖</span><b>Distribuição de Mapas</b></div>
            <div className="card pad" style={{ padding: "18px 20px" }}>
              <div className="mdist">
                {mapDistribution.map(([name, count]) => (
                  <div className="mdrow" key={name}>
                    <div className="mn">{mapLabel(name)}</div>
                    <div className="mdbar"><i style={{ width: `${(count / maxMapCount) * 100}%` }} /><span className="ct">{count}x</span></div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ===== MELHOR HIGHLIGHT ===== */}
        {bestHighlight && (
          <>
            <div className="shead"><span className="ic">⚡</span><b>Melhor Highlight · Play of the Tournament</b></div>
            <div className="bh">
              <div className="binfo">
                <div className="sc">★ Score: {bestHighlight.score}</div>
                <div className="pl">{bestHighlight.player_name}</div>
                <div className="desc">{bestHighlight.description || `${bestHighlight.kills_count} kills no round ${bestHighlight.round_number}`}</div>
                <div className="meta"><span>{bestHighlight.team1_string} vs {bestHighlight.team2_string}</span><span>{bestHighlight.kills_count} kills</span><span>Round {bestHighlight.round_number}</span></div>
                <Link href={`/partidas/${bestHighlight.match_id}`} className="btn sm prim" style={{ marginTop: 14 }}>▶ Ver Partida</Link>
              </div>
              {bestHighlight.thumbnail_file && (
                <div className="thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/highlights-proxy/${bestHighlight.thumbnail_file}`} alt="" />
                </div>
              )}
            </div>
          </>
        )}

        {/* ===== CTA ===== */}
        <div className="rcta">
          <Link href={`/campeonato/${t.id}`} className="btn prim">⚔ Ver Bracket</Link>
          <Link href="/leaderboard" className="btn ghost">📊 Leaderboard</Link>
          {highlights.length > 0 && <Link href="/highlights" className="btn ghost">⚡ Highlights</Link>}
        </div>
      </div>
    </div>
  );
}
