"use client";

import { useEffect, useState, useCallback } from "react";
import { MAP_IMAGES } from "@/lib/maps";
import { Match, MapStats, parseMapStats } from "@/lib/api";
import { OWP_CSS } from "@/lib/owp-styles";

interface DemoEntry {
  demoFile: string;
  matchId: number;
  mapName: string;
  mapNumber: number;
  team1: string;
  team2: string;
  team1Score: number;
  team2Score: number;
  startTime: string;
  endTime: string | null;
  title: string;
  champId?: string;
  champName?: string;
}

const CHAMP_COLORS = ["#A892FF", "#FFC24B", "#54E08A", "#4B9FFF", "#FF8AB0", "#46D6C5"];
function champColor(id?: string) {
  if (!id) return "#A892FF";
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CHAMP_COLORS[h % CHAMP_COLORS.length];
}

const DEMO_CSS = `
.owp .dfilters{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:26px}
.owp .srch{display:flex;align-items:center;gap:8px;background:var(--bg2);border:1px solid var(--line);padding:0 13px;height:42px;flex:1;min-width:220px}
.owp .srch input{background:transparent;border:0;outline:none;color:var(--tx);font-family:var(--mono);font-size:12px;width:100%}
.owp .srch input::placeholder{color:var(--faint)}
.owp .dsel{height:42px;padding:0 13px;background:var(--bg2);border:1px solid var(--line);color:var(--tx);font-family:var(--mono);font-size:12px;outline:none;cursor:pointer}
.owp .dsel:focus{border-color:var(--or)}
.owp .dgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.owp .dcard{position:relative;height:214px;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;border:1px solid var(--line);clip-path:polygon(0 0,100% 0,100% calc(100% - 16px),calc(100% - 16px) 100%,0 100%);transition:.15s}
.owp .dcard:hover{border-color:var(--line-or)}
.owp .dcard .bg{position:absolute;inset:0}
.owp .dcard .bg img{width:100%;height:100%;object-fit:cover;opacity:.42;transition:.5s}
.owp .dcard:hover .bg img{opacity:.55;transform:scale(1.06)}
.owp .dcard .bg::after{content:'';position:absolute;inset:0;background:linear-gradient(to bottom,rgba(27,15,35,.35),rgba(27,15,35,.93))}
.owp .dcard .maplbl{position:absolute;top:12px;left:13px;z-index:3;display:flex;align-items:center;gap:6px;font-family:var(--cond);font-size:13px;text-transform:uppercase;color:#fff;-webkit-text-stroke:1px var(--stroke);paint-order:stroke fill}
.owp .dcard .date{position:absolute;top:14px;right:13px;z-index:3;font-family:var(--mono);font-size:10px;color:var(--dim)}
.owp .dcard .body{position:relative;z-index:3;padding:16px}
.owp .dcard .champ-badge{display:flex;justify-content:center;margin-bottom:10px}
.owp .dcard .champ-badge span{display:inline-flex;align-items:center;gap:6px;padding:3px 9px;border:1px solid;font-family:var(--mono);font-size:9px;letter-spacing:.06em;text-transform:uppercase}
.owp .dcard .vs{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:14px}
.owp .dcard .tn{font-family:var(--cond);font-size:16px;text-transform:uppercase;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:34%}
.owp .dcard .tn.win{color:var(--ok)}
.owp .dcard .sc{font-family:var(--cond);font-size:22px;flex:0 0 auto;color:var(--dim)}
.owp .dcard .sc b.win{color:var(--ok)}
.owp .dcard .sc .x{color:var(--faint);margin:0 5px;font-size:14px}
.owp .dcard .foot{display:flex;align-items:center;justify-content:space-between;gap:10px}
.owp .dcard .mid{font-family:var(--mono);font-size:10px;color:var(--dim)}
@media(max-width:1000px){.owp .dgrid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:560px){.owp .dgrid{grid-template-columns:1fr}.owp .dsel{flex:1}}
`;

export default function DemosPage() {
  const [demos, setDemos] = useState<DemoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mapFilter, setMapFilter] = useState("");
  const [champFilter, setChampFilter] = useState("");

  const fetchDemos = useCallback(async () => {
    try {
      const [matchRes, tourRes] = await Promise.all([
        fetch("/api/matches"),
        fetch("/api/tournaments").then(r => r.json()).catch(() => ({ tournaments: [] })),
      ]);
      const matchData = await matchRes.json();
      const matches: Match[] = matchData.matches || [];

      const tMap: Record<number, { id: string; name: string }> = {};
      for (const tour of (tourRes.tournaments || [])) {
        for (const bm of (tour.matches || [])) {
          if (bm.match_id != null) tMap[bm.match_id] = { id: tour.id, name: tour.name };
        }
      }

      const finished = matches.filter(m => m.end_time);
      const demoList: DemoEntry[] = [];

      for (let i = 0; i < finished.length; i += 5) {
        const batch = finished.slice(i, i + 5);
        const results = await Promise.all(
          batch.map(async (match) => {
            try {
              const res = await fetch(`/api/mapstats/${match.id}`);
              const data = await res.json();
              const mapStats: MapStats[] = parseMapStats(data) as MapStats[];
              const tour = tMap[match.id];
              return mapStats
                .filter(ms => ms.demoFile)
                .map(ms => ({
                  demoFile: ms.demoFile!,
                  matchId: match.id,
                  mapName: ms.map_name,
                  mapNumber: ms.map_number,
                  team1: match.team1_string,
                  team2: match.team2_string,
                  team1Score: ms.team1_score,
                  team2Score: ms.team2_score,
                  startTime: ms.start_time,
                  endTime: ms.end_time,
                  title: match.title || `Match #${match.id}`,
                  champId: tour?.id,
                  champName: tour?.name,
                }));
            } catch { return []; }
          })
        );
        demoList.push(...results.flat());
      }

      demoList.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      setDemos(demoList);
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { (async () => { await fetchDemos(); })(); }, [fetchDemos]);

  const maps = [...new Set(demos.map(d => d.mapName))].sort();
  const champObj: Record<string, string> = {};
  demos.forEach(d => { if (d.champId) champObj[d.champId] = d.champName!; });
  const champs = Object.entries(champObj);

  const filtered = demos.filter(d => {
    if (mapFilter && d.mapName !== mapFilter) return false;
    if (champFilter && d.champId !== champFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return d.team1.toLowerCase().includes(q) || d.team2.toLowerCase().includes(q) || d.title.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="owp">
      <style>{OWP_CSS + DEMO_CSS}</style>

      <header className="pagehead">
        <h1>Demos das Partidas</h1>
        <p>{demos.length} DEMOS DISPONÍVEIS PARA DOWNLOAD · ARQUIVOS .DEM</p>
      </header>

      <div className="wrap">
        <section className="sec" style={{ paddingTop: 24 }}>
          <div className="dfilters">
            <span className="srch">
              <span style={{ color: "var(--faint)" }}>⌕</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por time..." />
            </span>
            {champs.length > 0 && (
              <select className="dsel" value={champFilter} onChange={e => setChampFilter(e.target.value)}>
                <option value="">Todos os campeonatos</option>
                {champs.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            )}
            {maps.length > 1 && (
              <select className="dsel" value={mapFilter} onChange={e => setMapFilter(e.target.value)}>
                <option value="">Todos os mapas</option>
                {maps.map(m => <option key={m} value={m}>{m.replace("de_", "").toUpperCase()}</option>)}
              </select>
            )}
          </div>

          {loading ? (
            <div className="loading"><div className="spin" />Carregando demos…</div>
          ) : filtered.length > 0 ? (
            <div className="dgrid">
              {filtered.map(demo => <DemoCard key={`${demo.matchId}-${demo.mapNumber}`} demo={demo} />)}
            </div>
          ) : (
            <div className="empty">{search || mapFilter || champFilter ? "Nenhuma demo encontrada com esses filtros." : "Nenhuma demo disponível ainda."}</div>
          )}
        </section>
      </div>
    </div>
  );
}

function DemoCard({ demo }: { demo: DemoEntry }) {
  const img = MAP_IMAGES[demo.mapName] || MAP_IMAGES.de_mirage;
  const mapLabel = demo.mapName.replace("de_", "").toUpperCase();
  const w1 = demo.team1Score > demo.team2Score;
  const w2 = demo.team2Score > demo.team1Score;
  const cc = champColor(demo.champId);

  return (
    <div className="dcard">
      <div className="bg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt="" />
      </div>
      <span className="maplbl">▣ {mapLabel}</span>
      <span className="date">{new Date(demo.startTime).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
      <div className="body">
        {demo.champName && (
          <div className="champ-badge">
            <span style={{ color: cc, borderColor: `${cc}88`, background: `${cc}1f` }}>🏆 {demo.champName}</span>
          </div>
        )}
        <div className="vs">
          <span className={`tn ${w1 ? "win" : ""}`}>{demo.team1}</span>
          <span className="sc"><b className={w1 ? "win" : ""}>{demo.team1Score}</b><span className="x">:</span><b className={w2 ? "win" : ""}>{demo.team2Score}</b></span>
          <span className={`tn ${w2 ? "win" : ""}`}>{demo.team2}</span>
        </div>
        <div className="foot">
          <span className="mid">Match #{demo.matchId}</span>
          <a href={`/api/demo/${demo.demoFile}`} download className="btn sm prim">⭳ Baixar</a>
        </div>
      </div>
    </div>
  );
}
