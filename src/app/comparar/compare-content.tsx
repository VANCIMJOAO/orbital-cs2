"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LeaderboardEntry } from "@/lib/api";
import { OWP_CSS } from "@/lib/owp-styles";

interface CompareContentProps { initialPlayers: LeaderboardEntry[]; }

interface StatDef {
  label: string; key: string;
  getValue: (p: LeaderboardEntry) => number;
  format: (v: number) => string;
  higherIsBetter: boolean;
}

const STATS: StatDef[] = [
  { label: "Rating", key: "rating", getValue: p => p.average_rating || 0, format: v => v.toFixed(2), higherIsBetter: true },
  { label: "K / D", key: "kd", getValue: p => (p.deaths > 0 ? p.kills / p.deaths : p.kills), format: v => v.toFixed(2), higherIsBetter: true },
  { label: "HS%", key: "hsp", getValue: p => p.hsp || 0, format: v => `${Math.round(v)}%`, higherIsBetter: true },
  { label: "Total Kills", key: "kills", getValue: p => p.kills, format: v => v.toLocaleString("pt-BR"), higherIsBetter: true },
  { label: "Total Deaths · menor é melhor", key: "deaths", getValue: p => p.deaths, format: v => v.toLocaleString("pt-BR"), higherIsBetter: false },
  { label: "Wins", key: "wins", getValue: p => p.wins, format: v => v.toLocaleString("pt-BR"), higherIsBetter: true },
  { label: "Rounds", key: "rounds", getValue: p => p.trp, format: v => v.toLocaleString("pt-BR"), higherIsBetter: true },
  { label: "ADR", key: "adr", getValue: p => (p.trp > 0 ? p.total_damage / p.trp : 0), format: v => v.toFixed(1), higherIsBetter: true },
];

const CMP_CSS = `
.owp .selcard{background:var(--panel);border:1px solid var(--line);border-top:2px solid var(--line-or);padding:20px;margin-bottom:28px;clip-path:polygon(0 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%)}
.owp .selgrid{display:grid;grid-template-columns:1fr auto 1fr;gap:18px;align-items:center}
.owp .pselwrap{position:relative;width:100%}
.owp .csel{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;height:46px;padding:0 16px;background:var(--bg2);border:1px solid var(--line);font-family:var(--cond);font-size:16px;text-transform:uppercase;letter-spacing:.02em;color:var(--tx);cursor:pointer;transition:.15s}
.owp .csel:hover{border-color:var(--or)}
.owp .csel .cval{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.owp .csel .cval.dim{color:var(--faint)}
.owp .csel .chev{color:var(--or);font-size:12px;transition:.15s}
.owp .csel .chev.open{transform:rotate(180deg)}
.owp .selvs{font-family:var(--disp);font-size:20px;color:var(--vio2)}
.owp .cdrop{position:absolute;z-index:50;top:calc(100% + 6px);left:0;right:0;background:var(--bg2);border:1px solid var(--line-or);max-height:288px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 14px 38px -10px rgba(0,0,0,.8)}
.owp .cdrop .ds{padding:9px 11px;border-bottom:1px solid var(--line)}
.owp .cdrop .ds input{width:100%;background:transparent;border:0;outline:none;color:var(--tx);font-family:var(--mono);font-size:12px}
.owp .cdrop .ds input::placeholder{color:var(--faint)}
.owp .cdrop .dl{overflow-y:auto;max-height:236px}
.owp .cdrop .di{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;padding:9px 13px;cursor:pointer;font-family:var(--mono);font-size:12px;color:var(--tx);transition:.12s;background:none;border:0;text-align:left}
.owp .cdrop .di:hover{background:rgba(255,90,31,.12)}
.owp .cdrop .di .rt{color:var(--dim)}
.owp .cdrop .di.clear{color:var(--dim)}
.owp .cdrop .none{padding:12px;text-align:center;font-family:var(--mono);font-size:11px;color:var(--faint)}

.owp .fightcard{position:relative;overflow:hidden;background:var(--panel);border:1px solid var(--line);margin-bottom:24px;clip-path:polygon(0 0,100% 0,100% calc(100% - 18px),calc(100% - 18px) 100%,0 100%)}
.owp .fightcard::before{content:'';position:absolute;inset:0;opacity:.04;background:repeating-linear-gradient(0deg,transparent,transparent 20px,rgba(255,90,31,.4) 20px,rgba(255,90,31,.4) 21px)}
.owp .fc-grid{position:relative;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:clamp(16px,4vw,48px);padding:34px clamp(20px,4vw,44px) 28px}
.owp .fplayer{text-align:center;display:flex;flex-direction:column;align-items:center}
.owp .favatar{width:88px;height:88px;border-radius:50%;padding:3px;margin-bottom:14px}
.owp .favatar.or{background:linear-gradient(160deg,var(--or),#a5380f);box-shadow:0 0 30px rgba(255,90,31,.35)}
.owp .favatar.vi{background:linear-gradient(160deg,var(--vio),#3b2a78);box-shadow:0 0 30px rgba(124,92,255,.35)}
.owp .favatar img,.owp .favatar .ph{width:100%;height:100%;border-radius:50%;object-fit:cover;display:flex;align-items:center;justify-content:center;background:#0d0712;font-family:var(--disp);font-size:26px;color:var(--faint)}
.owp .fname{font-family:var(--disp);font-size:clamp(1.1rem,2vw,1.7rem);text-transform:uppercase;line-height:1;-webkit-text-stroke:1px var(--stroke);paint-order:stroke fill;transition:.15s}
.owp .fname.or{color:var(--or2)}.owp .fname.vi{color:var(--vio2)}
.owp .fname:hover{filter:brightness(1.2)}
.owp .fkda{font-family:var(--mono);font-size:10px;letter-spacing:.04em;color:var(--dim);margin-top:9px}
.owp .fmini{display:flex;align-items:center;gap:14px;margin-top:14px}
.owp .fmini .m{text-align:center}
.owp .fmini .mk{font-family:var(--mono);font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--faint)}
.owp .fmini .mv{font-family:var(--cond);font-size:22px;line-height:1;margin-top:3px}
.owp .fplayer.l .fmini .mv{color:var(--or2)}.owp .fplayer.r .fmini .mv{color:var(--vio2)}
.owp .fmini .div{width:1px;height:26px;background:var(--line)}
.owp .fvs{position:relative;font-family:var(--disp);font-size:clamp(2rem,4vw,3.2rem);color:var(--or);text-shadow:0 0 22px rgba(255,90,31,.5)}
.owp .fvs::after{content:'';position:absolute;top:50%;left:50%;width:66px;height:66px;border:1px solid var(--line-or);border-radius:50%;transform:translate(-50%,-50%);animation:cmppulse 2.2s ease-in-out infinite}
@keyframes cmppulse{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:.5}50%{transform:translate(-50%,-50%) scale(1.5);opacity:0}}

.owp .scoresum{position:relative;display:flex;align-items:center;justify-content:center;gap:22px;padding:18px;border-top:1px solid var(--line)}
.owp .scoresum .ss{font-family:var(--cond);font-size:38px;line-height:1}
.owp .scoresum .ss.l{color:var(--or)}.owp .scoresum .ss.l.lose{color:rgba(255,90,31,.35)}
.owp .scoresum .ss.r{color:var(--vio2)}.owp .scoresum .ss.r.lose{color:rgba(124,92,255,.35)}
.owp .scoresum .swlbl{font-family:var(--mono);font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--dim)}

.owp .statrow{padding:13px 0}
.owp .statrow+.statrow{border-top:1px solid rgba(255,255,255,.05)}
.owp .statlabel{text-align:center;font-family:var(--mono);font-size:9.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--dim);margin-bottom:9px}
.owp .statbars{display:flex;align-items:center;gap:13px}
.owp .sv{width:74px;flex:0 0 auto;font-family:var(--cond);font-size:18px;color:var(--dim)}
.owp .sv.l{text-align:right}.owp .sv.r{text-align:left}
.owp .sv.win.l{color:var(--or2)}.owp .sv.win.r{color:var(--vio2)}
.owp .sv.tie{color:var(--tx)}
.owp .bars{flex:1;display:flex;align-items:center;gap:2px}
.owp .barbox{flex:1;height:22px;background:#160c1f;overflow:hidden;display:flex}
.owp .barbox.l{justify-content:flex-end}
.owp .barbox i{display:block;height:100%}
.owp .barbox.l i{background:linear-gradient(90deg,rgba(255,90,31,.3),rgba(255,90,31,.5))}
.owp .barbox.l.win i{background:linear-gradient(90deg,rgba(255,90,31,.45),var(--or))}
.owp .barbox.r i{background:linear-gradient(90deg,rgba(124,92,255,.5),rgba(124,92,255,.3))}
.owp .barbox.r.win i{background:linear-gradient(90deg,var(--vio),rgba(124,92,255,.45))}
.owp .bardiv{width:1px;height:22px;background:var(--line);flex:0 0 auto}

.owp .cmpempty{text-align:center;padding:64px 20px;border:1px dashed var(--line);background:var(--panel)}
.owp .cmpempty .ic{font-size:40px;opacity:.4}
.owp .cmpempty .t1{font-family:var(--disp);font-size:15px;letter-spacing:.06em;text-transform:uppercase;color:var(--dim);margin-top:16px;-webkit-text-stroke:1px var(--stroke);paint-order:stroke fill}
.owp .cmpempty .t2{font-family:var(--mono);font-size:11px;color:var(--faint);margin-top:10px}

@media(max-width:620px){
  .owp .selgrid{grid-template-columns:1fr}.owp .selvs{display:none}
  .owp .fc-grid{gap:14px;padding:26px 16px 22px}
  .owp .favatar{width:70px;height:70px}
  .owp .sv{width:54px;font-size:15px}
}
`;

function PlayerSelect({ players, selected, onSelect, placeholder, otherSelected }: {
  players: LeaderboardEntry[]; selected: LeaderboardEntry | null;
  onSelect: (p: LeaderboardEntry | null) => void; placeholder: string; otherSelected: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = useMemo(() =>
    players.filter(p => p.steamId !== otherSelected && p.name.toLowerCase().includes(search.toLowerCase())),
    [players, otherSelected, search]);

  return (
    <div className="pselwrap">
      <button className="csel" onClick={() => setOpen(o => !o)}>
        <span className={`cval ${selected ? "" : "dim"}`}>{selected ? selected.name : placeholder}</span>
        <span className={`chev ${open ? "open" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="cdrop">
          <div className="ds"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar jogador..." autoFocus /></div>
          <div className="dl">
            {selected && <button className="di clear" onClick={() => { onSelect(null); setOpen(false); setSearch(""); }}>Limpar</button>}
            {filtered.map(p => (
              <button key={p.steamId} className="di" onClick={() => { onSelect(p); setOpen(false); setSearch(""); }}>
                <span>{p.name}</span><span className="rt">{(p.average_rating || 0).toFixed(2)}</span>
              </button>
            ))}
            {filtered.length === 0 && <div className="none">Nenhum jogador encontrado</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerCard({ player, side, avatarUrl }: { player: LeaderboardEntry; side: "l" | "r"; avatarUrl?: string | null }) {
  const accent = side === "l" ? "or" : "vi";
  return (
    <div className={`fplayer ${side}`}>
      <div className={`favatar ${accent}`}>
        {avatarUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={avatarUrl} alt={player.name} />
          : <span className="ph">{(player.name || "?").charAt(0).toUpperCase()}</span>}
      </div>
      <Link href={`/perfil/${player.steamId}`} className={`fname ${accent}`}>{player.name}</Link>
      <div className="fkda">{player.kills}K / {player.deaths}D / {player.assists}A</div>
      <div className="fmini">
        <div className="m"><div className="mk">Rating</div><div className="mv">{(player.average_rating || 0).toFixed(2)}</div></div>
        <div className="div" />
        <div className="m"><div className="mk">Maps</div><div className="mv">{player.total_maps}</div></div>
      </div>
    </div>
  );
}

function StatBar({ stat, p1, p2 }: { stat: StatDef; p1: LeaderboardEntry; p2: LeaderboardEntry }) {
  const v1 = stat.getValue(p1), v2 = stat.getValue(p2);
  const max = Math.max(v1, v2, 0.01);
  const pct1 = (v1 / max) * 100, pct2 = (v2 / max) * 100;
  const p1Wins = stat.higherIsBetter ? v1 > v2 : v1 < v2;
  const p2Wins = stat.higherIsBetter ? v2 > v1 : v2 < v1;
  const tied = v1 === v2;
  return (
    <div className="statrow">
      <div className="statlabel">{stat.label}</div>
      <div className="statbars">
        <span className={`sv l ${p1Wins ? "win" : tied ? "tie" : ""}`}>{stat.format(v1)}</span>
        <div className="bars">
          <div className={`barbox l ${p1Wins ? "win" : ""}`}><i style={{ width: `${pct1}%` }} /></div>
          <div className="bardiv" />
          <div className={`barbox r ${p2Wins ? "win" : ""}`}><i style={{ width: `${pct2}%` }} /></div>
        </div>
        <span className={`sv r ${p2Wins ? "win" : tied ? "tie" : ""}`}>{stat.format(v2)}</span>
      </div>
    </div>
  );
}

export function CompareContent({ initialPlayers }: CompareContentProps) {
  const searchParams = useSearchParams();
  const findById = (id: string | null) => id ? (initialPlayers.find(p => p.steamId === id) || null) : null;
  const [player1, setPlayer1] = useState<LeaderboardEntry | null>(() => findById(searchParams.get("p1")));
  const [player2, setPlayer2] = useState<LeaderboardEntry | null>(() => findById(searchParams.get("p2")));
  const [avatars, setAvatars] = useState<Record<string, string>>({});

  const sorted = useMemo(() => [...initialPlayers].sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0)), [initialPlayers]);

  useEffect(() => {
    const ids = [player1?.steamId, player2?.steamId].filter((id): id is string => !!id && !avatars[id]);
    ids.forEach(steamId => {
      fetch(`/api/steam/avatar/${steamId}`).then(r => r.json()).then(d => { if (d?.avatar) setAvatars(prev => ({ ...prev, [steamId]: d.avatar })); }).catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player1?.steamId, player2?.steamId]);

  const bothSelected = player1 !== null && player2 !== null;

  let p1Score = 0, p2Score = 0;
  if (bothSelected) {
    for (const stat of STATS) {
      const v1 = stat.getValue(player1!), v2 = stat.getValue(player2!);
      if (stat.higherIsBetter) { if (v1 > v2) p1Score++; else if (v2 > v1) p2Score++; }
      else { if (v1 < v2) p1Score++; else if (v2 < v1) p2Score++; }
    }
  }

  return (
    <div className="owp">
      <style>{OWP_CSS + CMP_CSS}</style>

      <header className="pagehead">
        <div className="lbl"><b>Head to Head</b></div>
        <h1>Comparar <span style={{ color: "var(--or)" }}>Jogadores</span></h1>
        <p>SELECIONE DOIS JOGADORES PARA COMPARAR SUAS ESTATÍSTICAS LADO A LADO</p>
      </header>

      <div className="wrap">
        <section className="sec">
          <div className="selcard">
            <div className="lbl" style={{ marginBottom: 16 }}><b>Selecionar</b></div>
            <div className="selgrid">
              <PlayerSelect players={sorted} selected={player1} onSelect={setPlayer1} placeholder="Jogador 1" otherSelected={player2?.steamId || null} />
              <span className="selvs">VS</span>
              <PlayerSelect players={sorted} selected={player2} onSelect={setPlayer2} placeholder="Jogador 2" otherSelected={player1?.steamId || null} />
            </div>
          </div>

          {bothSelected ? (
            <>
              <div className="fightcard">
                <div className="fc-grid">
                  <PlayerCard player={player1!} side="l" avatarUrl={avatars[player1!.steamId]} />
                  <div className="fvs">VS</div>
                  <PlayerCard player={player2!} side="r" avatarUrl={avatars[player2!.steamId]} />
                </div>
                <div className="scoresum">
                  <span className={`ss l ${p1Score < p2Score ? "lose" : ""}`}>{p1Score}</span>
                  <span className="swlbl">Stats Won</span>
                  <span className={`ss r ${p2Score < p1Score ? "lose" : ""}`}>{p2Score}</span>
                </div>
              </div>

              <div className="lbl"><b>Estatísticas</b></div>
              <div className="card pad" style={{ padding: "8px 22px" }}>
                {STATS.map(stat => <StatBar key={stat.key} stat={stat} p1={player1!} p2={player2!} />)}
              </div>
            </>
          ) : (
            <div className="cmpempty">
              <div className="ic">⚔</div>
              <div className="t1">Aguardando jogadores</div>
              <div className="t2">Selecione dois jogadores acima para iniciar a comparação</div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
