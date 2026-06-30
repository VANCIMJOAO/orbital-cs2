"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { LeaderboardEntry, Season } from "@/lib/api";
import { OWP_CSS } from "@/lib/owp-styles";

const onImgErr = (e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = "none"; };
const ratingBarPct = (r: number) => Math.max(6, Math.min(100, ((r - 0.8) / 0.7) * 100));
const rkCls = (r: number) => r >= 1.2 ? "hi" : r >= 0.8 ? "mid" : "lo";

const LB_CSS = `
.owp .lbar{display:flex;align-items:center;gap:11px;flex-wrap:wrap;margin-bottom:32px}
.owp .lsel{height:38px;padding:0 12px;background:var(--bg2);border:1px solid var(--line);color:var(--tx);font-family:var(--mono);font-size:11px;outline:none;cursor:pointer;transition:.15s}
.owp .lsel:focus{border-color:var(--or)}
.owp .lsearch{display:flex;align-items:center;gap:9px;background:var(--bg2);border:1px solid var(--line);padding:0 13px;height:38px;min-width:200px;flex:1;max-width:300px;transition:.15s;clip-path:polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px)}
.owp .lsearch:focus-within{border-color:var(--or)}
.owp .lsearch input{flex:1;background:none;border:none;outline:none;color:var(--tx);font-family:var(--mono);font-size:11px;width:100%}
.owp .lsearch input::placeholder{color:var(--faint)}
.owp .lbtn{display:inline-flex;align-items:center;gap:7px;height:38px;padding:0 14px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--dim);background:var(--panel);border:1px solid var(--line);cursor:pointer;transition:.15s;clip-path:polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px)}
.owp .lbtn:hover{color:var(--tx);border-color:var(--line-or)}
.owp .lbtn.csv{color:var(--or2);border-color:var(--line-or);background:rgba(255,90,31,.05)}
.owp .lbtn.csv:hover{border-color:var(--or);color:#fff}

.owp .podium{display:grid;grid-template-columns:1fr 1.2fr 1fr;gap:18px;align-items:end;margin-bottom:34px}
.owp .pcard{position:relative;background:var(--panel);border:1px solid var(--line);text-align:center;padding:26px 18px 22px;clip-path:polygon(0 0,100% 0,100% calc(100% - 16px),calc(100% - 16px) 100%,0 100%);transition:.15s;display:flex;flex-direction:column;align-items:center}
.owp .pcard:hover{transform:translateY(-3px);border-color:var(--line-or)}
.owp .pcard.p1{border-top:2px solid #F5C542;padding:38px 20px 30px;background:linear-gradient(180deg,rgba(245,197,66,.07),var(--panel) 60%)}
.owp .pcard.p2{border-top:2px solid #CFD3DC}
.owp .pcard.p3{border-top:2px solid #C8773E}
.owp .pcard .pos{position:absolute;top:13px;left:15px;font-family:var(--disp);font-size:18px;-webkit-text-stroke:2px var(--stroke);paint-order:stroke fill}
.owp .pcard.p1 .pos{color:#F5C542}.owp .pcard.p2 .pos{color:#CFD3DC}.owp .pcard.p3 .pos{color:#C8773E}
.owp .pcard .crown{position:absolute;top:24px;left:50%;transform:translateX(-50%);font-size:24px;z-index:4;filter:drop-shadow(0 0 10px rgba(245,197,66,.7))}
.owp .pcard .frame{width:84px;height:96px;margin:8px auto 0}
.owp .pcard.p1 .frame{width:104px;height:118px;background:linear-gradient(160deg,#FFD96B,#C79A1F)}
.owp .pcard.p2 .frame{background:linear-gradient(160deg,#E8ECF2,#9AA0AC)}
.owp .pcard.p3 .frame{background:linear-gradient(160deg,#E0915A,#9C5A2C)}
.owp .pcard .pnm{font-family:var(--cond);font-size:26px;text-transform:uppercase;color:#fff;-webkit-text-stroke:1px var(--stroke);paint-order:stroke fill;margin-top:15px;line-height:.95;transition:.15s}
.owp .pcard:hover .pnm{color:var(--or2)}
.owp .pcard.p1 .pnm{font-size:32px}
.owp .pcard .rk{font-family:var(--disp);font-size:36px;line-height:.9;margin-top:14px;text-shadow:0 0 22px rgba(255,90,31,.3)}
.owp .pcard.p1 .rk{font-size:48px}
.owp .pcard .rk.hi{color:var(--ok)}.owp .pcard .rk.mid{color:var(--tx)}.owp .pcard .rk.lo{color:#FF7A8C}
.owp .pcard .rk small{font-family:var(--mono);font-size:9px;color:var(--dim);letter-spacing:.16em;display:block;margin-top:8px}
.owp .pcard .kd{font-family:var(--mono);font-size:10.5px;letter-spacing:.04em;color:var(--dim);margin-top:14px;padding-top:13px;border-top:1px solid var(--line);width:100%}
.owp .pcard .kd b{color:var(--tx)}

.owp .tbl th.sortable{cursor:pointer;transition:.15s;user-select:none}
.owp .tbl th.sortable:hover{color:var(--or2)}
.owp .tbl th.sortable.act{color:var(--or)}
.owp .tbl th .ar{margin-left:4px;font-size:9px}
.owp .tbl .pl .pn{display:flex;align-items:center;gap:7px}
.owp .tbl .pl .tier{font-family:var(--mono);font-size:10px;font-weight:700}
.owp .tbl .pl .tier.up{color:var(--ok)}.owp .tbl .pl .tier.mid{color:var(--faint)}.owp .tbl .pl .tier.dn{color:#FF7A8C}
.owp .tbl td.kc{color:var(--ok)}.owp .tbl td.dc{color:#FF8A9C}
.owp .tbl .ratecell{display:flex;flex-direction:column;align-items:flex-start;gap:5px}
.owp .tbl .ratecell .rv{font-family:var(--cond);font-size:16px}
.owp .tbl .ratecell .rv.hi{color:var(--ok)}.owp .tbl .ratecell .rv.mid{color:var(--tx)}.owp .tbl .ratecell .rv.lo{color:#FF7A8C}
.owp .tbl .ratecell .rbar{width:56px;height:3px;background:rgba(255,255,255,.08);overflow:hidden}
.owp .tbl .ratecell .rbar i{display:block;height:100%;background:linear-gradient(90deg,var(--or),var(--or2))}

@media(max-width:620px){
  .owp .podium{grid-template-columns:1fr;gap:13px}
  .owp .pcard{padding:22px 18px 20px!important}
  .owp .pcard.p1{order:-1}
  .owp .pcard .frame,.owp .pcard.p1 .frame{width:80px;height:92px}
  .owp .pcard.p1 .pnm{font-size:26px}.owp .pcard.p1 .rk{font-size:38px}
  .owp .lbar .lsearch{min-width:0;max-width:none;order:-1;width:100%;flex:none}
  .owp .tbl th:nth-child(3),.owp .tbl td:nth-child(3),
  .owp .tbl th:nth-child(4),.owp .tbl td:nth-child(4),
  .owp .tbl th:nth-child(6),.owp .tbl td:nth-child(6),
  .owp .tbl th:nth-child(7),.owp .tbl td:nth-child(7),
  .owp .tbl th:nth-child(8),.owp .tbl td:nth-child(8){display:none}
  .owp .tbl th,.owp .tbl td{padding:11px 9px}
}
`;

interface LeaderboardContentProps {
  initialLeaderboard?: LeaderboardEntry[];
  initialSeasons?: Season[];
}

export function LeaderboardContent({ initialLeaderboard, initialSeasons }: LeaderboardContentProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(initialLeaderboard || []);
  const [seasons, setSeasons] = useState<Season[]>(initialSeasons || []);
  const [selectedSeason, setSelectedSeason] = useState<string>("");
  const [loading, setLoading] = useState(!initialLeaderboard);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string>("average_rating");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(prev => prev === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir(key === "deaths" ? "asc" : "desc"); }
  };

  const fetchLeaderboard = useCallback(async (seasonId?: number) => {
    setLoading(true);
    try {
      const query = seasonId ? `?season_id=${seasonId}` : "";
      const res = await fetch(`/api/leaderboard/players${query}`);
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!initialLeaderboard) { (async () => { await fetchLeaderboard(); })(); }
    if (!initialSeasons) {
      fetch("/api/seasons").then(r => r.json()).then(d => setSeasons(d.seasons || [])).catch(() => {});
    }
  }, [fetchLeaderboard, initialLeaderboard, initialSeasons]);

  const handleSeasonChange = (value: string) => {
    setSelectedSeason(value);
    fetchLeaderboard(value ? parseInt(value) : undefined);
  };

  const filtered = search
    ? leaderboard.filter(p => (p.name || "").toLowerCase().includes(search.toLowerCase()) || (p.steamId || "").includes(search))
    : leaderboard;

  const getVal = (p: LeaderboardEntry, key: string): number => {
    if (key === "kd") return (p.deaths || 0) > 0 ? (p.kills || 0) / p.deaths : (p.kills || 0);
    return (p[key as keyof LeaderboardEntry] as number) || 0;
  };

  const sorted = [...filtered].sort((a, b) => {
    const av = getVal(a, sortKey), bv = getVal(b, sortKey);
    return sortDir === "asc" ? av - bv : bv - av;
  });

  const exportCSV = () => {
    const headers = ["Rank", "Jogador", "SteamID", "Kills", "Deaths", "K/D", "HS%", "Wins", "Rounds", "Rating"];
    const rows = sorted.map((p, i) => [
      i + 1, p.name, p.steamId, p.kills, p.deaths,
      p.deaths > 0 ? (p.kills / p.deaths).toFixed(2) : p.kills.toFixed(2),
      Math.round(p.hsp || 0) + "%", p.wins, p.trp, (p.average_rating || 0).toFixed(2),
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ranking${selectedSeason ? `_season_${selectedSeason}` : ""}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const cols: { key: string; label: string }[] = [
    { key: "kills", label: "⊕ K" }, { key: "deaths", label: "✕ D" }, { key: "kd", label: "K/D" },
    { key: "hsp", label: "HS%" }, { key: "wins", label: "Wins" }, { key: "trp", label: "Rounds" },
    { key: "average_rating", label: "Rating" },
  ];

  return (
    <div className="owp">
      <style>{OWP_CSS + LB_CSS}</style>

      <header className="pagehead">
        <div className="lbl"><b>Ranking · HLTV Rating 1.0</b></div>
        <h1>Leaderboard <span style={{ color: "var(--or)" }}>Global</span></h1>
        <p>{selectedSeason ? "RANKING DA SEASON SELECIONADA" : "CLASSIFICAÇÃO GERAL DOS JOGADORES"}</p>
      </header>

      <div className="wrap">
        <section className="sec">
          <div className="lbar">
            {seasons.length > 0 && (
              <select className="lsel" value={selectedSeason} onChange={e => handleSeasonChange(e.target.value)}>
                <option value="">Todas as seasons</option>
                {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            <label className="lsearch">
              <span style={{ color: "var(--faint)" }}>⌕</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar jogador..." />
            </label>
            <Link href="/comparar" className="lbtn">⚔ Comparar</Link>
            <Link href="/times" className="lbtn">🛡 Times</Link>
            {sorted.length > 0 && <button className="lbtn csv" onClick={exportCSV}>⭳ CSV</button>}
          </div>

          {loading ? (
            <div className="loading"><div className="spin" />Carregando ranking…</div>
          ) : sorted.length === 0 ? (
            <div className="empty">Nenhum dado de ranking disponível{search ? " com essa busca." : "."}</div>
          ) : (
            <>
              {/* Pódio */}
              <div className="podium">
                {sorted[1] && <PodiumCard p={sorted[1]} rank={2} />}
                {sorted[0] && <PodiumCard p={sorted[0]} rank={1} />}
                {sorted[2] && <PodiumCard p={sorted[2]} rank={3} />}
              </div>

              {/* Tabela ordenável */}
              <div className="tblwrap"><table className="tbl">
                <thead><tr>
                  <th>#</th>
                  <th className="l">Jogador</th>
                  {cols.map(c => {
                    const active = sortKey === c.key;
                    return (
                      <th key={c.key} className={`sortable ${active ? "act" : ""}`} onClick={() => handleSort(c.key)}>
                        {c.key === "hsp"
                          ? <span className="hh" data-hint="Porcentagem dos abates que foram tiros na cabeça.">{c.label}</span>
                          : c.key === "trp"
                            ? <span className="hh" data-hint="Total de rounds jogados.">{c.label}</span>
                            : c.key === "average_rating"
                              ? <span className="hh" data-hint="Rating 1.0 (modelo HLTV): índice de desempenho geral. 1.00 é a média.">{c.label}</span>
                              : c.label}
                        {active && <span className="ar">{sortDir === "asc" ? "▲" : "▼"}</span>}
                      </th>
                    );
                  })}
                </tr></thead>
                <tbody>
                  {sorted.map((p, i) => {
                    const kd = (p.deaths || 0) > 0 ? ((p.kills || 0) / p.deaths).toFixed(2) : (p.kills || 0).toFixed(2);
                    const rating = p.average_rating || 0;
                    const tier = rating >= 1.2 ? "up" : rating >= 0.8 ? "mid" : "dn";
                    const tierIco = rating >= 1.2 ? "↑" : rating >= 0.8 ? "—" : "↓";
                    return (
                      <tr key={p.steamId}>
                        <td><span className={`rank ${i < 3 ? "top" : ""}`}>{i + 1}</span></td>
                        <td className="l">
                          <Link href={`/perfil/${p.steamId}`} className="pl">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <span className="av"><img src={`/api/steam/avatar-image/${p.steamId}`} alt="" onError={onImgErr} /></span>
                            <span className="pn"><span style={{ fontFamily: "var(--font-anton)", fontSize: 15, textTransform: "uppercase", letterSpacing: ".02em" }}>{p.name}</span><span className={`tier ${tier}`}>{tierIco}</span></span>
                          </Link>
                        </td>
                        <td className="kc">{p.kills}</td>
                        <td className="dc">{p.deaths}</td>
                        <td className="b">{kd}</td>
                        <td className="dim">{Math.round(p.hsp || 0)}%</td>
                        <td>{p.wins}</td>
                        <td className="dim">{p.trp}</td>
                        <td>
                          <div className="ratecell">
                            <span className={`rv ${rkCls(rating)}`}>{rating.toFixed(2)}</span>
                            <span className="rbar"><i style={{ width: `${ratingBarPct(rating)}%` }} /></span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table></div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function PodiumCard({ p, rank }: { p: LeaderboardEntry; rank: number }) {
  const rating = p.average_rating || 0;
  return (
    <Link href={`/perfil/${p.steamId}`} className={`pcard p${rank}`}>
      {rank === 1 && <div className="crown">👑</div>}
      <div className="pos">#{rank}</div>
      <div className="frame">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div className="ph"><img src={`/api/steam/avatar-image/${p.steamId}`} alt="" onError={onImgErr} /></div>
      </div>
      <div className="pnm">{p.name}</div>
      <div className={`rk ${rkCls(rating)}`}>{rating.toFixed(2)}<small>RATING 1.0</small></div>
      <div className="kd"><b>{p.kills}</b>K / <b>{p.deaths}</b>D · <b>{Math.round(p.hsp || 0)}%</b> HS</div>
    </Link>
  );
}
