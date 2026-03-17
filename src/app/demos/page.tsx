"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Download, Film, Map, Calendar, Search } from "lucide-react";
import { HudCard } from "@/components/hud-card";
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
}

export default function DemosPage() {
  const [demos, setDemos] = useState<DemoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mapFilter, setMapFilter] = useState("");

  const fetchDemos = useCallback(async () => {
    try {
      const matchRes = await fetch("/api/matches");
      const matchData = await matchRes.json();
      const matches: Match[] = matchData.matches || [];

      // Only finished matches
      const finished = matches.filter(m => m.end_time);

      const demoList: DemoEntry[] = [];

      // Fetch mapstats in batches of 5
      for (let i = 0; i < finished.length; i += 5) {
        const batch = finished.slice(i, i + 5);
        const results = await Promise.all(
          batch.map(async (match) => {
            try {
              const res = await fetch(`/api/mapstats/${match.id}`);
              const data = await res.json();
              const mapStats: MapStats[] = parseMapStats(data) as MapStats[];
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
                }));
            } catch {
              return [];
            }
          })
        );
        demoList.push(...results.flat());
      }

      // Sort by date desc
      demoList.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      setDemos(demoList);
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchDemos(); }, [fetchDemos]);

  const maps = [...new Set(demos.map(d => d.mapName))].sort();

  const filtered = demos.filter(d => {
    if (mapFilter && d.mapName !== mapFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return d.team1.toLowerCase().includes(q) || d.team2.toLowerCase().includes(q) || d.title.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-8">
        <div className="flex items-center gap-3 mb-2">
          <Film size={20} className="text-orbital-purple" />
          <h1 className="font-[family-name:var(--font-orbitron)] text-xl font-bold tracking-wider text-orbital-text">
            DEMOS
          </h1>
        </div>
        <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
          {demos.length} demos disponíveis para download
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-3 mb-6"
      >
        <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-[#0A0A0A] border border-orbital-border px-3 py-2">
          <Search size={12} className="text-orbital-text-dim" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por time..."
            className="bg-transparent flex-1 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text placeholder:text-orbital-text-dim/50 focus:outline-none"
          />
        </div>
        {maps.length > 1 && (
          <div className="flex items-center gap-2">
            <Map size={12} className="text-orbital-text-dim" />
            <select
              value={mapFilter}
              onChange={e => setMapFilter(e.target.value)}
              className="bg-[#0A0A0A] border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-xs px-3 py-2 focus:border-orbital-purple/50 focus:outline-none"
            >
              <option value="">Todos os mapas</option>
              {maps.map(m => (
                <option key={m} value={m}>{m.replace("de_", "").toUpperCase()}</option>
              ))}
            </select>
          </div>
        )}
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-orbital-purple border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          {filtered.map((demo, i) => (
            <motion.div
              key={`${demo.matchId}-${demo.mapNumber}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.03 }}
            >
              <div className="bg-orbital-card border border-orbital-border hover:border-orbital-purple/30 transition-all p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text">
                        {demo.team1} <span className="text-orbital-text-dim">vs</span> {demo.team2}
                      </span>
                      <span className="font-[family-name:var(--font-jetbrains)] text-xs font-bold text-orbital-purple">
                        {demo.team1Score} - {demo.team2Score}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-orbital-text-dim">
                      <span className="flex items-center gap-1 font-[family-name:var(--font-jetbrains)] text-[0.6rem]">
                        <Map size={10} /> {demo.mapName.replace("de_", "").toUpperCase()}
                      </span>
                      <span className="flex items-center gap-1 font-[family-name:var(--font-jetbrains)] text-[0.6rem]">
                        <Calendar size={10} /> {new Date(demo.startTime).toLocaleDateString("pt-BR")}
                      </span>
                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem]">
                        Match #{demo.matchId}
                      </span>
                    </div>
                  </div>
                  <a
                    href={`/api/demo/${demo.demoFile}`}
                    download
                    className="flex items-center gap-2 px-4 py-2 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 hover:bg-orbital-purple/20 transition-all font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-purple shrink-0"
                  >
                    <Download size={12} />
                    DOWNLOAD
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <HudCard className="text-center py-16">
          <Film size={32} className="text-orbital-border mx-auto mb-4" />
          <p className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text-dim">
            {search || mapFilter ? "Nenhuma demo encontrada com esses filtros" : "Nenhuma demo disponível"}
          </p>
        </HudCard>
      )}
    </div>
  );
}
