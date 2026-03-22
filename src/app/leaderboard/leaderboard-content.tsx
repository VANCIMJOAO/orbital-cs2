"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Trophy, Target, Skull, Crosshair, Medal, Filter, Download, Search, Users, Shield } from "lucide-react";
import Link from "next/link";
import { HudCard } from "@/components/hud-card";
import { LeaderboardEntry, Season } from "@/lib/api";

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
    if (sortKey === key) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "deaths" ? "asc" : "desc");
    }
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
    if (!initialLeaderboard) {
      fetchLeaderboard();
    }
    if (!initialSeasons) {
      fetch("/api/seasons")
        .then(r => r.json())
        .then(d => setSeasons(d.seasons || []))
        .catch(() => {});
    }
  }, [fetchLeaderboard, initialLeaderboard, initialSeasons]);

  const handleSeasonChange = (value: string) => {
    setSelectedSeason(value);
    fetchLeaderboard(value ? parseInt(value) : undefined);
  };

  const exportCSV = () => {
    const headers = ["Rank", "Jogador", "SteamID", "Kills", "Deaths", "K/D", "HS%", "Wins", "Rounds", "Rating"];
    const rows = sorted.map((p, i) => [
      i + 1,
      p.name,
      p.steamId,
      p.kills,
      p.deaths,
      p.deaths > 0 ? (p.kills / p.deaths).toFixed(2) : p.kills.toFixed(2),
      Math.round(p.hsp || 0) + "%",
      p.wins,
      p.trp,
      (p.average_rating || 0).toFixed(2),
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ranking${selectedSeason ? `_season_${selectedSeason}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = search
    ? leaderboard.filter(p => (p.name || "").toLowerCase().includes(search.toLowerCase()) || (p.steamId || "").includes(search))
    : leaderboard;

  const getVal = (p: LeaderboardEntry, key: string): number => {
    if (key === "kd") return (p.deaths || 0) > 0 ? (p.kills || 0) / p.deaths : (p.kills || 0);
    return (p[key as keyof LeaderboardEntry] as number) || 0;
  };

  const sorted = [...filtered].sort((a, b) => {
    const av = getVal(a, sortKey);
    const bv = getVal(b, sortKey);
    return sortDir === "asc" ? av - bv : bv - av;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="py-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-3">
            <Trophy size={20} className="text-orbital-purple" />
            <h1 className="font-[family-name:var(--font-orbitron)] text-xl font-bold tracking-wider text-orbital-text">
              RANKING
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Season Filter */}
            {seasons.length > 0 && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Filter size={12} className="text-orbital-text-dim hidden sm:block" />
                <select
                  value={selectedSeason}
                  onChange={e => handleSeasonChange(e.target.value)}
                  className="bg-[#0A0A0A] border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-[0.6rem] sm:text-xs px-2 sm:px-3 py-1.5 focus:border-orbital-purple/50 focus:outline-none max-w-[140px] sm:max-w-none"
                >
                  <option value="">Todas as seasons</option>
                  {seasons.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
            {/* Search */}
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-orbital-text-dim/50" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar jogador..."
                className="pl-7 pr-2 py-1.5 w-32 sm:w-40 bg-transparent border border-orbital-border focus:border-orbital-purple/50 font-[family-name:var(--font-jetbrains)] text-[0.6rem] sm:text-xs text-orbital-text placeholder:text-orbital-text-dim/50 outline-none transition-colors"
              />
            </div>
            {/* Compare + Teams + CSV */}
            <Link href="/comparar" className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 hover:border-cyan-500/60 transition-all font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-cyan-400">
              <Users size={11} />
              <span className="hidden sm:inline">COMPARAR</span>
            </Link>
            <Link href="/times" className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-white/5 border border-orbital-border hover:border-orbital-purple/30 transition-all font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
              <Shield size={11} />
              <span className="hidden sm:inline">TIMES</span>
            </Link>
            {sorted.length > 0 && (
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 transition-all font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-purple"
              >
                <Download size={11} />
                <span className="hidden sm:inline">CSV</span>
              </button>
            )}
          </div>
        </div>
        <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
          {selectedSeason ? `Ranking da season selecionada` : "Classificação geral dos jogadores"}
        </p>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-orbital-purple border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sorted.length > 0 ? (
        <>
          {/* Top 3 Podium */}
          {sorted.length >= 1 && (
            <div className={`grid gap-4 mb-8 ${
              sorted.length === 1 ? "grid-cols-1 max-w-xs mx-auto" :
              sorted.length === 2 ? "grid-cols-2 max-w-lg mx-auto" :
              "grid-cols-1 sm:grid-cols-3 max-w-3xl mx-auto"
            }`}>
              {/* 2nd */}
              {sorted.length >= 2 && <PodiumCard player={sorted[1]} rank={2} delay={0.2} />}
              {/* 1st */}
              <PodiumCard player={sorted[0]} rank={1} delay={0.1} />
              {/* 3rd */}
              {sorted.length >= 3 && <PodiumCard player={sorted[2]} rank={3} delay={0.3} />}
            </div>
          )}

          {/* Full Table */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-orbital-card border border-orbital-border overflow-hidden"
          >
            <div className="overflow-x-auto relative">
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-orbital-card to-transparent pointer-events-none lg:hidden z-10" />
              <table className="data-table min-w-[700px]">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Jogador</th>
                    <SortableTh label="K" sortKey="kills" currentKey={sortKey} dir={sortDir} onSort={handleSort} icon={<Target size={10} className="inline" />} />
                    <SortableTh label="D" sortKey="deaths" currentKey={sortKey} dir={sortDir} onSort={handleSort} icon={<Skull size={10} className="inline" />} />
                    <SortableTh label="K/D" sortKey="kd" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortableTh label="HS%" sortKey="hsp" currentKey={sortKey} dir={sortDir} onSort={handleSort} icon={<Crosshair size={10} className="inline" />} />
                    <SortableTh label="Wins" sortKey="wins" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortableTh label="Rounds" sortKey="trp" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortableTh label="Rating" sortKey="average_rating" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((player, i) => {
                    const kd = (player.deaths || 0) > 0 ? ((player.kills || 0) / player.deaths).toFixed(2) : (player.kills || 0).toFixed(2);
                    const rating = player.average_rating || 0;
                    return (
                      <tr key={player.steamId}>
                        <td>
                          <span className={`font-bold ${
                            i === 0 ? "text-yellow-400" :
                            i === 1 ? "text-gray-300" :
                            i === 2 ? "text-amber-600" :
                            "text-orbital-text-dim"
                          }`}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="font-semibold">
                          <Link href={`/perfil/${player.steamId}`} className="hover:text-orbital-purple transition-colors">
                            {player.name}
                          </Link>
                          <RatingTier rating={rating} />
                        </td>
                        <td className="text-orbital-success">{player.kills}</td>
                        <td className="text-orbital-danger">{player.deaths}</td>
                        <td>{kd}</td>
                        <td>{Math.round(player.hsp || 0)}%</td>
                        <td>{player.wins}</td>
                        <td>{player.trp}</td>
                        <td>
                          <span className={`font-bold ${
                            rating >= 1.2 ? "text-orbital-success" :
                            rating >= 0.8 ? "text-orbital-text" :
                            "text-orbital-danger"
                          }`}>
                            {rating.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      ) : (
        <HudCard className="text-center py-12">
          <Trophy size={32} className="text-orbital-border mx-auto mb-4" />
          <p className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text-dim">
            Nenhum dado de ranking disponível
          </p>
        </HudCard>
      )}
    </div>
  );
}

function SortableTh({
  label, sortKey, currentKey, dir, onSort, icon,
}: {
  label: string;
  sortKey: string;
  currentKey: string;
  dir: "asc" | "desc";
  onSort: (key: string) => void;
  icon?: React.ReactNode;
}) {
  const active = currentKey === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      className={`cursor-pointer select-none hover:text-orbital-purple transition-colors font-[family-name:var(--font-orbitron)] ${active ? "text-orbital-purple" : ""}`}
    >
      {icon && <>{icon}{" "}</>}
      {label}
      {active && (
        <span className="ml-1 text-[0.65rem]">{dir === "asc" ? "▲" : "▼"}</span>
      )}
    </th>
  );
}

function RatingTier({ rating }: { rating: number }) {
  if (rating >= 1.2) return <span className="ml-1.5 text-[0.6rem] text-green-400" title="Rating alto">↑</span>;
  if (rating >= 0.8) return <span className="ml-1.5 text-[0.6rem] text-gray-500" title="Rating médio">—</span>;
  return <span className="ml-1.5 text-[0.6rem] text-red-400" title="Rating baixo">↓</span>;
}

function PodiumCard({ player, rank, delay }: { player: LeaderboardEntry; rank: number; delay: number }) {
  const rating = player.average_rating || 0;
  const isFirst = rank === 1;

  return (
    <HudCard
      glow={isFirst}
      delay={delay}
      className={`text-center ${isFirst ? "sm:-mt-4" : "sm:mt-4"}`}
    >
      <div className="py-2">
        <Medal
          size={isFirst ? 28 : 22}
          className={
            rank === 1 ? "text-yellow-400 mx-auto mb-2" :
            rank === 2 ? "text-gray-300 mx-auto mb-2" :
            "text-amber-600 mx-auto mb-2"
          }
        />
        <div className="font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-[0.2em] text-orbital-purple mb-1">
          #{rank}
        </div>
        <div className={`font-[family-name:var(--font-orbitron)] ${isFirst ? "text-sm" : "text-xs"} font-bold tracking-wider text-orbital-text mb-2`}>
          {player.name}
        </div>
        <div className="font-[family-name:var(--font-jetbrains)] text-2xl font-bold text-orbital-purple">
          {rating.toFixed(2)}
        </div>
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim mt-1">
          {player.kills}K / {player.deaths}D
        </div>
      </div>
    </HudCard>
  );
}
