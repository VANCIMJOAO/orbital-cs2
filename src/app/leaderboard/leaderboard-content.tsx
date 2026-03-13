"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Trophy, Target, Skull, Crosshair, Medal, Filter, Download } from "lucide-react";
import Link from "next/link";
import { HudCard } from "@/components/hud-card";
import { LeaderboardEntry, Season } from "@/lib/api";

export function LeaderboardContent() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string>("");
  const [loading, setLoading] = useState(true);

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
    fetchLeaderboard();
    fetch("/api/seasons")
      .then(r => r.json())
      .then(d => setSeasons(d.seasons || []))
      .catch(() => {});
  }, [fetchLeaderboard]);

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

  const sorted = [...leaderboard].sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));

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
            {/* CSV Export */}
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
          {sorted.length >= 3 && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              {/* 2nd */}
              <PodiumCard player={sorted[1]} rank={2} delay={0.2} />
              {/* 1st */}
              <PodiumCard player={sorted[0]} rank={1} delay={0.1} />
              {/* 3rd */}
              <PodiumCard player={sorted[2]} rank={3} delay={0.3} />
            </div>
          )}

          {/* Full Table */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-orbital-card border border-orbital-border overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Jogador</th>
                    <th><Target size={10} className="inline" /> K</th>
                    <th><Skull size={10} className="inline" /> D</th>
                    <th>K/D</th>
                    <th><Crosshair size={10} className="inline" /> HS%</th>
                    <th>Wins</th>
                    <th>Rounds</th>
                    <th>Rating</th>
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
        <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-purple mb-1">
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
