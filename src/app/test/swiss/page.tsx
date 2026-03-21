"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Trophy, Shield, Swords, Check, Clock, Gamepad2,
  Calendar, Users, DollarSign, Layers, ArrowLeft, BarChart3,
} from "lucide-react";
import { HudCard } from "@/components/hud-card";
import type { Tournament, TournamentTeam, BracketMatch, SwissRecord } from "@/lib/tournament";
import { getTeamName, getSwissStandings } from "@/lib/tournament";

// ── Fake data: 16 teams, Swiss Round 3 ──

const FAKE_TEAMS: TournamentTeam[] = [
  { id: 1, name: "DARK KNIGHTS", tag: "DK", seed: 1 },
  { id: 2, name: "PHANTOM SQUAD", tag: "PHS", seed: 2 },
  { id: 3, name: "NIGHT WOLVES", tag: "NW", seed: 3 },
  { id: 4, name: "IRON LEGION", tag: "IL", seed: 4 },
  { id: 5, name: "SHADOW VIPERS", tag: "SV", seed: 5 },
  { id: 6, name: "CYBER HAWKS", tag: "CH", seed: 6 },
  { id: 7, name: "STORM RIDERS", tag: "SR", seed: 7 },
  { id: 8, name: "NOVA FORCE", tag: "NF", seed: 8 },
  { id: 9, name: "APEX TITANS", tag: "AT", seed: 9 },
  { id: 10, name: "BLAZE SQUAD", tag: "BZ", seed: 10 },
  { id: 11, name: "ZERO GRAVITY", tag: "ZG", seed: 11 },
  { id: 12, name: "GHOST PROTOCOL", tag: "GP", seed: 12 },
  { id: 13, name: "THUNDER STRIKE", tag: "TS", seed: 13 },
  { id: 14, name: "OMEGA FORCE", tag: "OF", seed: 14 },
  { id: 15, name: "RAPID FIRE", tag: "RF", seed: 15 },
  { id: 16, name: "ELITE GUARD", tag: "EG", seed: 16 },
];

const R1: BracketMatch[] = [
  { id: "SW-R1-1", round: 1, position: 0, bracket: "swiss", label: "Swiss R1 #1 (0-0)", team1_id: 1, team2_id: 16, team1_from: null, team2_from: null, winner_id: 1, match_id: null, map: "de_mirage", maps: null, status: "finished", num_maps: 1, veto_actions: [] },
  { id: "SW-R1-2", round: 1, position: 1, bracket: "swiss", label: "Swiss R1 #2 (0-0)", team1_id: 2, team2_id: 15, team1_from: null, team2_from: null, winner_id: 2, match_id: null, map: "de_inferno", maps: null, status: "finished", num_maps: 1, veto_actions: [] },
  { id: "SW-R1-3", round: 1, position: 2, bracket: "swiss", label: "Swiss R1 #3 (0-0)", team1_id: 3, team2_id: 14, team1_from: null, team2_from: null, winner_id: 3, match_id: null, map: "de_dust2", maps: null, status: "finished", num_maps: 1, veto_actions: [] },
  { id: "SW-R1-4", round: 1, position: 3, bracket: "swiss", label: "Swiss R1 #4 (0-0)", team1_id: 4, team2_id: 13, team1_from: null, team2_from: null, winner_id: 4, match_id: null, map: "de_nuke", maps: null, status: "finished", num_maps: 1, veto_actions: [] },
  { id: "SW-R1-5", round: 1, position: 4, bracket: "swiss", label: "Swiss R1 #5 (0-0)", team1_id: 5, team2_id: 12, team1_from: null, team2_from: null, winner_id: 5, match_id: null, map: "de_ancient", maps: null, status: "finished", num_maps: 1, veto_actions: [] },
  { id: "SW-R1-6", round: 1, position: 5, bracket: "swiss", label: "Swiss R1 #6 (0-0)", team1_id: 6, team2_id: 11, team1_from: null, team2_from: null, winner_id: 11, match_id: null, map: "de_overpass", maps: null, status: "finished", num_maps: 1, veto_actions: [] },
  { id: "SW-R1-7", round: 1, position: 6, bracket: "swiss", label: "Swiss R1 #7 (0-0)", team1_id: 7, team2_id: 10, team1_from: null, team2_from: null, winner_id: 7, match_id: null, map: "de_anubis", maps: null, status: "finished", num_maps: 1, veto_actions: [] },
  { id: "SW-R1-8", round: 1, position: 7, bracket: "swiss", label: "Swiss R1 #8 (0-0)", team1_id: 8, team2_id: 9, team1_from: null, team2_from: null, winner_id: 9, match_id: null, map: "de_mirage", maps: null, status: "finished", num_maps: 1, veto_actions: [] },
];

const R2: BracketMatch[] = [
  { id: "SW-R2-1", round: 2, position: 0, bracket: "swiss", label: "Swiss R2 #1 (1-0)", team1_id: 1, team2_id: 5, team1_from: null, team2_from: null, winner_id: 1, match_id: null, map: "de_inferno", maps: null, status: "finished", num_maps: 1, veto_actions: [] },
  { id: "SW-R2-2", round: 2, position: 1, bracket: "swiss", label: "Swiss R2 #2 (1-0)", team1_id: 2, team2_id: 7, team1_from: null, team2_from: null, winner_id: 2, match_id: null, map: "de_nuke", maps: null, status: "finished", num_maps: 1, veto_actions: [] },
  { id: "SW-R2-3", round: 2, position: 2, bracket: "swiss", label: "Swiss R2 #3 (1-0)", team1_id: 3, team2_id: 9, team1_from: null, team2_from: null, winner_id: 9, match_id: null, map: "de_dust2", maps: null, status: "finished", num_maps: 1, veto_actions: [] },
  { id: "SW-R2-4", round: 2, position: 3, bracket: "swiss", label: "Swiss R2 #4 (1-0)", team1_id: 4, team2_id: 11, team1_from: null, team2_from: null, winner_id: 4, match_id: null, map: "de_ancient", maps: null, status: "finished", num_maps: 1, veto_actions: [] },
  { id: "SW-R2-5", round: 2, position: 4, bracket: "swiss", label: "Swiss R2 #5 (0-1)", team1_id: 6, team2_id: 10, team1_from: null, team2_from: null, winner_id: 6, match_id: null, map: "de_mirage", maps: null, status: "finished", num_maps: 1, veto_actions: [] },
  { id: "SW-R2-6", round: 2, position: 5, bracket: "swiss", label: "Swiss R2 #6 (0-1)", team1_id: 8, team2_id: 12, team1_from: null, team2_from: null, winner_id: 8, match_id: null, map: "de_overpass", maps: null, status: "finished", num_maps: 1, veto_actions: [] },
  { id: "SW-R2-7", round: 2, position: 6, bracket: "swiss", label: "Swiss R2 #7 (0-1)", team1_id: 13, team2_id: 15, team1_from: null, team2_from: null, winner_id: 15, match_id: null, map: "de_anubis", maps: null, status: "finished", num_maps: 1, veto_actions: [] },
  { id: "SW-R2-8", round: 2, position: 7, bracket: "swiss", label: "Swiss R2 #8 (0-1)", team1_id: 14, team2_id: 16, team1_from: null, team2_from: null, winner_id: 14, match_id: null, map: "de_inferno", maps: null, status: "finished", num_maps: 1, veto_actions: [] },
];

const R3: BracketMatch[] = [
  { id: "SW-R3-1", round: 3, position: 0, bracket: "swiss", label: "Swiss R3 #1 (2-0)", team1_id: 1, team2_id: 2, team1_from: null, team2_from: null, winner_id: 1, match_id: null, map: null, maps: ["de_inferno", "de_mirage"], status: "finished", num_maps: 3, veto_actions: [] },
  { id: "SW-R3-2", round: 3, position: 1, bracket: "swiss", label: "Swiss R3 #2 (2-0)", team1_id: 4, team2_id: 9, team1_from: null, team2_from: null, winner_id: null, match_id: null, faceit_match_id: "1-abc123", map: null, maps: null, status: "live", num_maps: 3, veto_actions: [] },
  { id: "SW-R3-3", round: 3, position: 2, bracket: "swiss", label: "Swiss R3 #3 (1-1)", team1_id: 5, team2_id: 6, team1_from: null, team2_from: null, winner_id: 5, match_id: null, map: "de_dust2", maps: null, status: "finished", num_maps: 1, veto_actions: [] },
  { id: "SW-R3-4", round: 3, position: 3, bracket: "swiss", label: "Swiss R3 #4 (1-1)", team1_id: 3, team2_id: 8, team1_from: null, team2_from: null, winner_id: null, match_id: null, map: null, maps: null, status: "pending", num_maps: 1, veto_actions: [] },
  { id: "SW-R3-5", round: 3, position: 4, bracket: "swiss", label: "Swiss R3 #5 (1-1)", team1_id: 11, team2_id: 14, team1_from: null, team2_from: null, winner_id: null, match_id: null, map: null, maps: null, status: "pending", num_maps: 1, veto_actions: [] },
  { id: "SW-R3-6", round: 3, position: 5, bracket: "swiss", label: "Swiss R3 #6 (1-1)", team1_id: 7, team2_id: 15, team1_from: null, team2_from: null, winner_id: null, match_id: null, map: null, maps: null, status: "pending", num_maps: 1, veto_actions: [] },
  { id: "SW-R3-7", round: 3, position: 6, bracket: "swiss", label: "Swiss R3 #7 (0-2)", team1_id: 10, team2_id: 13, team1_from: null, team2_from: null, winner_id: null, match_id: null, map: null, maps: null, status: "pending", num_maps: 3, veto_actions: [] },
  { id: "SW-R3-8", round: 3, position: 7, bracket: "swiss", label: "Swiss R3 #8 (0-2)", team1_id: 12, team2_id: 16, team1_from: null, team2_from: null, winner_id: null, match_id: null, map: null, maps: null, status: "pending", num_maps: 3, veto_actions: [] },
];

const RECORDS: SwissRecord[] = [
  { team_id: 1, wins: 3, losses: 0, buchholz: 5, opponents: [16, 5, 2] },
  { team_id: 4, wins: 2, losses: 0, buchholz: 4, opponents: [13, 11] },
  { team_id: 9, wins: 2, losses: 0, buchholz: 3, opponents: [8, 3] },
  { team_id: 2, wins: 2, losses: 1, buchholz: 5, opponents: [15, 7, 1] },
  { team_id: 5, wins: 2, losses: 1, buchholz: 3, opponents: [12, 1, 6] },
  { team_id: 3, wins: 1, losses: 1, buchholz: 3, opponents: [14, 9] },
  { team_id: 11, wins: 1, losses: 1, buchholz: 2, opponents: [6, 4] },
  { team_id: 6, wins: 1, losses: 1, buchholz: 2, opponents: [11, 10] },
  { team_id: 8, wins: 1, losses: 1, buchholz: 1, opponents: [9, 12] },
  { team_id: 7, wins: 1, losses: 1, buchholz: 2, opponents: [10, 2] },
  { team_id: 14, wins: 1, losses: 1, buchholz: 1, opponents: [3, 16] },
  { team_id: 15, wins: 1, losses: 1, buchholz: 1, opponents: [2, 13] },
  { team_id: 10, wins: 0, losses: 2, buchholz: 2, opponents: [7, 6] },
  { team_id: 13, wins: 0, losses: 2, buchholz: 2, opponents: [4, 15] },
  { team_id: 12, wins: 0, losses: 2, buchholz: 1, opponents: [5, 8] },
  { team_id: 16, wins: 0, losses: 2, buchholz: 2, opponents: [1, 14] },
];

const TOURNAMENT: Tournament = {
  id: "test-swiss-1",
  name: "ORBITAL ROXA CUP #2",
  season_id: null,
  server_id: null,
  format: "swiss",
  mode: "online",
  faceit_championship_id: "test-123",
  teams: FAKE_TEAMS,
  matches: [...R1, ...R2, ...R3],
  map_pool: ["de_ancient", "de_anubis", "de_dust2", "de_inferno", "de_mirage", "de_nuke", "de_overpass"],
  players_per_team: 5,
  created_at: "2026-03-15T00:00:00Z",
  status: "active",
  current_match_id: null,
  swiss_records: RECORDS,
  swiss_round: 3,
  swiss_advance_wins: 3,
  swiss_eliminate_losses: 3,
  start_date: "2026-03-20",
  end_date: "2026-03-25",
  prize_pool: "R$ 2.000",
  description: "Campeonato online com anti-cheat Faceit",
};

// ══════════════════════════════════
// TABS
// ══════════════════════════════════

type TabId = "overview" | "partidas" | "ranking";
const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "OVERVIEW" },
  { id: "partidas", label: "PARTIDAS" },
  { id: "ranking", label: "RANKING" },
];

export default function TestSwissPage() {
  const tournament = TOURNAMENT;
  const standings = getSwissStandings(tournament);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const currentRound = tournament.swiss_round || 1;
  const totalRounds = Math.max(currentRound, ...tournament.matches.map(m => m.round));
  const liveCount = tournament.matches.filter(m => m.status === "live").length;
  const finishedCount = tournament.matches.filter(m => m.status === "finished").length;

  return (
    <div className="min-h-screen pb-20">
      {/* ════════════════ HERO BANNER ════════════════ */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://i.imgur.com/0irj00x.jpeg" alt="" className="w-full h-full object-cover opacity-15" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/80 to-[#0A0A0A]" />
        </div>
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#FF5500]/40 to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Status */}
            <div className="flex items-center gap-3 mb-4">
              <Link href="/campeonatos" className="text-orbital-text-dim hover:text-orbital-purple transition-colors">
                <ArrowLeft size={16} />
              </Link>
              <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] px-3 py-1 border text-[#EF4444] border-[#EF4444]/30 uppercase">
                AO VIVO
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 border border-[#FF5500]/30 font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-[#FF5500]">
                <Gamepad2 size={10} /> ONLINE — FACEIT
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 border border-orbital-border font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-orbital-text-dim">
                SWISS
              </span>
              {liveCount > 0 && (
                <span className="flex items-center gap-1.5 font-[family-name:var(--font-orbitron)] text-[0.5rem] text-[#EF4444]">
                  <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                  {liveCount} AO VIVO
                </span>
              )}
            </div>

            {/* Title */}
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 border border-[#FF5500]/30 bg-[#FF5500]/10 flex items-center justify-center shrink-0">
                <Trophy size={24} className="text-[#FF5500]" />
              </div>
              <div>
                <h1 className="font-[family-name:var(--font-orbitron)] text-2xl sm:text-3xl font-bold tracking-wider text-orbital-text">
                  {tournament.name}
                </h1>
                <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim mt-0.5">
                  {finishedCount}/{tournament.matches.length} partidas • Round {currentRound} de 5
                </p>
              </div>
            </div>

            {/* Round progress */}
            <div className="flex items-center gap-2 mb-4">
              {Array.from({ length: 5 }, (_, i) => i + 1).map(r => (
                <div
                  key={r}
                  className={`flex items-center gap-1 px-3 py-1.5 border font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider transition-all ${
                    r < currentRound
                      ? "bg-green-500/10 border-green-500/30 text-green-400"
                      : r === currentRound
                      ? "bg-[#FF5500]/15 border-[#FF5500]/40 text-[#FF5500]"
                      : "bg-transparent border-orbital-border/30 text-orbital-text-dim/30"
                  }`}
                >
                  {r < currentRound ? <Check size={10} /> : r === currentRound ? <Swords size={10} /> : null}
                  ROUND {r}
                </div>
              ))}
            </div>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-2">
              {tournament.start_date && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-orbital-border">
                  <Calendar size={12} className="text-[#FF5500]" />
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">
                    {tournament.start_date} — {tournament.end_date}
                  </span>
                </div>
              )}
              {tournament.prize_pool && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-orbital-border">
                  <DollarSign size={12} className="text-[#FF5500]" />
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">{tournament.prize_pool}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-orbital-border">
                <Users size={12} className="text-[#FF5500]" />
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">{tournament.teams.length} Times</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-orbital-border">
                <Shield size={12} className="text-[#FF5500]" />
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">Anti-cheat Faceit</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-orbital-border">
                <Layers size={12} className="text-[#FF5500]" />
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">{tournament.map_pool.length} Mapas</span>
              </div>
            </div>
          </motion.div>
        </div>
        <div className="h-[1px] bg-gradient-to-r from-transparent via-[#FF5500]/30 to-transparent" />
      </div>

      {/* ════════════════ TAB NAVIGATION ════════════════ */}
      <div className="sticky top-0 z-30 bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-orbital-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-0 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-5 py-3 font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.2em] transition-colors whitespace-nowrap ${
                  activeTab === tab.id ? "text-[#FF5500]" : "text-orbital-text-dim hover:text-orbital-text"
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="swissTab"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#FF5500]"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════ CONTENT ════════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
        <AnimatePresence mode="wait">
          {/* ═══ OVERVIEW ═══ */}
          {activeTab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              {/* Classificação */}
              <HudCard className="p-5" label="CLASSIFICAÇÃO">
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-orbital-border">
                        <th className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-text-dim py-2 px-2 w-8">#</th>
                        <th className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-text-dim py-2 px-2">TIME</th>
                        <th className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-text-dim py-2 px-2 text-center">V</th>
                        <th className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-text-dim py-2 px-2 text-center">D</th>
                        <th className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-text-dim py-2 px-2 text-center">BUCH.</th>
                        <th className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-text-dim py-2 px-2 text-center">STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((s, i) => (
                        <tr
                          key={s.team_id}
                          className={`border-b border-orbital-border/30 transition-colors hover:bg-white/[0.02] ${
                            s.status === "advanced" ? "bg-green-500/5" : s.status === "eliminated" ? "bg-red-500/5 opacity-40" : ""
                          }`}
                        >
                          <td className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim py-2.5 px-2">{i + 1}</td>
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-2">
                              <Shield size={14} className="text-orbital-text-dim/30 shrink-0" />
                              <span className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] text-orbital-text">{s.name}</span>
                              <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim/30">[{s.tag}]</span>
                            </div>
                          </td>
                          <td className="text-center py-2.5 px-2 font-[family-name:var(--font-jetbrains)] text-[0.7rem] text-green-400">{s.wins}</td>
                          <td className="text-center py-2.5 px-2 font-[family-name:var(--font-jetbrains)] text-[0.7rem] text-red-400/70">{s.losses}</td>
                          <td className="text-center py-2.5 px-2 font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">{s.buchholz}</td>
                          <td className="text-center py-2.5 px-2">
                            <span className={`font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider px-2.5 py-1 border ${
                              s.status === "advanced" ? "text-green-400 border-green-400/30 bg-green-400/5" :
                              s.status === "eliminated" ? "text-red-400/60 border-red-400/20" :
                              "text-orbital-text-dim border-orbital-border"
                            }`}>
                              {s.status === "advanced" ? "AVANÇOU" : s.status === "eliminated" ? "ELIMINADO" : `${s.wins}-${s.losses}`}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </HudCard>

              {/* Times */}
              <HudCard className="p-5" label="TIMES PARTICIPANTES">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-2">
                  {tournament.teams.map((team, i) => {
                    const record = standings.find(s => s.team_id === team.id);
                    return (
                      <motion.div
                        key={team.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className={`flex items-center gap-3 p-3 border transition-colors ${
                          record?.status === "advanced" ? "bg-green-500/5 border-green-500/20" :
                          record?.status === "eliminated" ? "bg-red-500/5 border-red-500/10 opacity-40" :
                          "bg-white/[0.02] border-orbital-border hover:border-orbital-purple/30"
                        }`}
                      >
                        <Shield size={18} className="text-orbital-text-dim/40 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text truncate">{team.name}</div>
                          {record && (
                            <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider mt-0.5">
                              <span className="text-green-400">{record.wins}</span>
                              <span className="text-orbital-text-dim/20">-</span>
                              <span className="text-red-400/70">{record.losses}</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </HudCard>
            </motion.div>
          )}

          {/* ═══ PARTIDAS ═══ */}
          {activeTab === "partidas" && (
            <motion.div key="partidas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
              {Array.from({ length: totalRounds }, (_, i) => totalRounds - i).map(round => {
                const roundMatches = tournament.matches.filter(m => m.bracket === "swiss" && m.round === round);
                if (roundMatches.length === 0) return null;

                const allDone = roundMatches.every(m => m.status === "finished");
                const hasLive = roundMatches.some(m => m.status === "live");

                const pools = new Map<string, BracketMatch[]>();
                for (const m of roundMatches) {
                  const label = m.label.match(/\(([^)]+)\)/)?.[1] || "?";
                  if (!pools.has(label)) pools.set(label, []);
                  pools.get(label)!.push(m);
                }

                return (
                  <HudCard key={round} className="p-5" label={`ROUND ${round}`}>
                    <div className="flex items-center gap-3 mb-4 mt-1">
                      {hasLive && (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/30 font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-red-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> AO VIVO
                        </span>
                      )}
                      {allDone && (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 border border-green-500/20 font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-green-400/60">
                          <Check size={8} /> CONCLUÍDO
                        </span>
                      )}
                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim/40">
                        {roundMatches.filter(m => m.status === "finished").length}/{roundMatches.length} partidas
                      </span>
                    </div>

                    {Array.from(pools.entries()).map(([poolLabel, poolMatches]) => (
                      <div key={poolLabel} className="mb-4 last:mb-0">
                        <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-text-dim/40 mb-2 flex items-center gap-2">
                          <span className={`px-2 py-0.5 border ${
                            poolLabel.startsWith("2-0") || poolLabel.startsWith("3") ? "border-green-400/20 text-green-400/60" :
                            poolLabel.startsWith("0-2") || poolLabel.startsWith("0-3") ? "border-red-400/20 text-red-400/40" :
                            "border-orbital-border text-orbital-text-dim/40"
                          }`}>{poolLabel}</span>
                          {poolMatches[0].num_maps > 1 && <span className="text-[#FF5500]/50">BO3</span>}
                          {poolLabel === "2-0" && <span className="text-green-400/40">PARTIDA DE AVANÇO</span>}
                          {poolLabel === "0-2" && <span className="text-red-400/40">PARTIDA DE ELIMINAÇÃO</span>}
                        </div>

                        <div className="space-y-1.5">
                          {poolMatches.map(m => {
                            const t1 = getTeamName(tournament, m.team1_id);
                            const t2 = getTeamName(tournament, m.team2_id);
                            const isLive = m.status === "live";
                            const isDone = m.status === "finished";

                            return (
                              <div key={m.id} className={`flex items-center gap-3 px-4 py-3 border transition-colors ${
                                isLive ? "border-red-500/30 bg-red-500/5" : isDone ? "border-orbital-border/30 bg-orbital-card" : "border-orbital-border bg-[#0A0A0A]"
                              }`}>
                                <div className="flex-1 flex items-center gap-2 min-w-0 justify-end">
                                  <span className={`font-[family-name:var(--font-jetbrains)] text-xs truncate ${isDone && m.winner_id === m.team1_id ? "text-green-400" : "text-orbital-text"}`}>{t1}</span>
                                  <Shield size={14} className="text-orbital-text-dim/20 shrink-0" />
                                </div>
                                <div className="font-[family-name:var(--font-orbitron)] text-xs shrink-0 w-16 text-center">
                                  {isDone ? (
                                    <span className="text-orbital-text-dim/30 text-[0.5rem]">
                                      {m.winner_id === m.team1_id ? <><span className="text-green-400">W</span> — L</> : <>L — <span className="text-green-400">W</span></>}
                                    </span>
                                  ) : isLive ? (
                                    <span className="text-red-400 text-[0.55rem] flex items-center justify-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE
                                    </span>
                                  ) : (
                                    <span className="text-orbital-text-dim/20 text-[0.5rem]">VS</span>
                                  )}
                                </div>
                                <div className="flex-1 flex items-center gap-2 min-w-0">
                                  <Shield size={14} className="text-orbital-text-dim/20 shrink-0" />
                                  <span className={`font-[family-name:var(--font-jetbrains)] text-xs truncate ${isDone && m.winner_id === m.team2_id ? "text-green-400" : "text-orbital-text"}`}>{t2}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {m.map && <span className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-text-dim/40">{m.map.replace("de_", "")}</span>}
                                  {m.num_maps > 1 && <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] text-[#FF5500]/40 border border-[#FF5500]/20 px-1.5 py-0.5">BO3</span>}
                                  {m.faceit_match_id && <Gamepad2 size={10} className="text-[#FF5500]/30" />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </HudCard>
                );
              })}
            </motion.div>
          )}

          {/* ═══ RANKING ═══ */}
          {activeTab === "ranking" && (
            <motion.div key="ranking" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <HudCard className="p-5" label="RANKING DE TIMES">
                <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim/40 mt-2 mb-4">
                  Ranking baseado no record Swiss. Buchholz = soma das vitórias dos adversários (tiebreaker).
                </p>
                <div className="space-y-2">
                  {standings.map((s, i) => (
                    <div
                      key={s.team_id}
                      className={`flex items-center gap-4 px-4 py-3 border transition-colors ${
                        s.status === "advanced" ? "border-green-500/20 bg-green-500/5" :
                        s.status === "eliminated" ? "border-red-500/10 bg-red-500/5 opacity-40" :
                        "border-orbital-border bg-orbital-card hover:bg-white/[0.02]"
                      }`}
                    >
                      <span className="font-[family-name:var(--font-orbitron)] text-sm text-orbital-text-dim w-6 text-center">{i + 1}</span>
                      <Shield size={18} className="text-orbital-text-dim/30 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text">{s.name}</span>
                      </div>
                      <div className="font-[family-name:var(--font-orbitron)] text-lg shrink-0">
                        <span className="text-green-400">{s.wins}</span>
                        <span className="text-orbital-text-dim/20 mx-1">—</span>
                        <span className="text-red-400/70">{s.losses}</span>
                      </div>
                      <div className="text-center shrink-0 w-16">
                        <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim/40">Buchholz</div>
                        <div className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text-dim">{s.buchholz}</div>
                      </div>
                      <span className={`font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider px-3 py-1 border shrink-0 ${
                        s.status === "advanced" ? "text-green-400 border-green-400/30 bg-green-400/5" :
                        s.status === "eliminated" ? "text-red-400/60 border-red-400/20" :
                        "text-orbital-text-dim border-orbital-border"
                      }`}>
                        {s.status === "advanced" ? "AVANÇOU" : s.status === "eliminated" ? "ELIMINADO" : "ATIVO"}
                      </span>
                    </div>
                  ))}
                </div>
              </HudCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="text-center mt-8">
        <p className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim/30">
          Página de teste — dados fictícios
        </p>
      </div>
    </div>
  );
}
