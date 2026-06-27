"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Download, Film, Map, Search, Trophy } from "lucide-react";
import { HudCard } from "@/components/hud-card";
import { PageHeader } from "@/components/page-header";
import { MAP_IMAGES } from "@/lib/maps";
import { Match, MapStats, parseMapStats } from "@/lib/api";

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

const CHAMP_COLORS = ["#A892FF", "#F5C542", "#3DD68C", "#4B9FFF", "#FF8AB0", "#46D6C5"];
function champColor(id?: string) {
  if (!id) return "#A892FF";
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CHAMP_COLORS[h % CHAMP_COLORS.length];
}
const onImgErr = (e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = "none"; };

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

      // Vínculo partida → campeonato
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
            } catch {
              return [];
            }
          })
        );
        demoList.push(...results.flat());
      }

      demoList.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      setDemos(demoList);
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchDemos(); }, [fetchDemos]);

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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-20">
      <PageHeader
        kicker="Arquivos .dem"
        title="Demos das"
        accent="Partidas"
        sub={`${demos.length} demos disponíveis para download`}
      />

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2.5 mb-7">
        <label className="flex-1 min-w-[200px] h-10 flex items-center gap-2 px-3 border border-orbital-border focus-within:border-orbital-purple/50 transition-colors">
          <Search size={13} className="text-orbital-text-dim/60 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por time..."
            className="flex-1 bg-transparent outline-none font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text placeholder:text-orbital-text-dim/50"
          />
        </label>
        {champs.length > 0 && (
          <select
            value={champFilter}
            onChange={e => setChampFilter(e.target.value)}
            className="h-10 px-3 bg-orbital-bg border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-xs focus:outline-none focus:border-orbital-purple/50 cursor-pointer"
          >
            <option value="">Todos os campeonatos</option>
            {champs.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        )}
        {maps.length > 1 && (
          <select
            value={mapFilter}
            onChange={e => setMapFilter(e.target.value)}
            className="h-10 px-3 bg-orbital-bg border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-xs focus:outline-none focus:border-orbital-purple/50 cursor-pointer"
          >
            <option value="">Todos os mapas</option>
            {maps.map(m => <option key={m} value={m}>{m.replace("de_", "").toUpperCase()}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-orbital-purple border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((demo, i) => (
            <DemoCard key={`${demo.matchId}-${demo.mapNumber}`} demo={demo} delay={i * 0.02} />
          ))}
        </div>
      ) : (
        <HudCard className="text-center py-16">
          <Film size={32} className="text-orbital-border mx-auto mb-4" />
          <p className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text-dim">
            {search || mapFilter || champFilter ? "Nenhuma demo encontrada com esses filtros" : "Nenhuma demo disponível"}
          </p>
        </HudCard>
      )}
    </div>
  );
}

function DemoCard({ demo, delay }: { demo: DemoEntry; delay: number }) {
  const img = MAP_IMAGES[demo.mapName] || null;
  const mapLabel = demo.mapName.replace("de_", "").toUpperCase();
  const w1 = demo.team1Score > demo.team2Score;
  const w2 = demo.team2Score > demo.team1Score;
  const cc = champColor(demo.champId);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay }}>
      <div className="relative h-[214px] border border-orbital-border hover:border-orbital-purple/45 transition-colors overflow-hidden flex flex-col justify-end group">
        {/* Fundo: mapa */}
        <div className="absolute inset-0">
          {img ? (
            <>
              <img src={img} alt="" className="w-full h-full object-cover opacity-[0.45] group-hover:opacity-[0.55] transition-all duration-500 group-hover:scale-[1.06]" />
              <div className="absolute inset-0 bg-gradient-to-b from-orbital-bg/35 to-orbital-bg/90" />
            </>
          ) : <div className="absolute inset-0 bg-orbital-card" />}
        </div>

        {/* Selo do mapa + data */}
        <span className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 bg-orbital-bg/55 border border-white/[0.12] font-[family-name:var(--font-russo)] text-[0.6rem] uppercase text-orbital-text">
          <Map size={10} className="text-orbital-purple-bright" /> {mapLabel}
        </span>
        <span className="absolute top-3 right-3 z-10 font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim">
          {new Date(demo.startTime).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
        </span>

        {/* Corpo */}
        <div className="relative z-10 p-4">
          {demo.champName && (
            <div className="text-center mb-2.5">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border font-[family-name:var(--font-jetbrains)] text-[0.5rem] tracking-wide uppercase"
                style={{ color: cc, borderColor: `${cc}88`, background: `${cc}1f` }}>
                <Trophy size={9} /> {demo.champName}
              </span>
            </div>
          )}
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <span className={`font-[family-name:var(--font-russo)] text-sm uppercase truncate ${w1 ? "text-orbital-success" : "text-orbital-text"}`}>{demo.team1}</span>
            <span className="flex items-center gap-1.5 shrink-0">
              <span className={`font-[family-name:var(--font-russo)] text-lg tabular-nums ${w1 ? "text-orbital-success" : "text-orbital-text-dim"}`}>{demo.team1Score}</span>
              <span className="text-orbital-text-dim/40 text-xs">:</span>
              <span className={`font-[family-name:var(--font-russo)] text-lg tabular-nums ${w2 ? "text-orbital-success" : "text-orbital-text-dim"}`}>{demo.team2Score}</span>
            </span>
            <span className={`font-[family-name:var(--font-russo)] text-sm uppercase truncate ${w2 ? "text-orbital-success" : "text-orbital-text"}`}>{demo.team2}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim/80">Match #{demo.matchId}</span>
            <a
              href={`/api/demo/${demo.demoFile}`}
              download
              className="flex items-center gap-1.5 px-3.5 py-2 bg-orbital-purple text-orbital-bg hover:bg-orbital-purple-bright transition-colors font-[family-name:var(--font-chakra)] font-bold text-[0.58rem] tracking-[0.1em] uppercase"
            >
              <Download size={12} /> Baixar
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
