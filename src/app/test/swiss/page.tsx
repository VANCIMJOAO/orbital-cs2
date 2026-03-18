"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  Trophy, Shield, Swords, Check, Clock, Gamepad2, Crown,
  Calendar, Users, MapPin, ChevronRight, Star,
} from "lucide-react";
import { HudCard } from "@/components/hud-card";
import type { Tournament, TournamentTeam, BracketMatch, SwissRecord } from "@/lib/tournament";
import { getTeamName, getSwissStandings } from "@/lib/tournament";

// ── Fake data simulando um campeonato Swiss no Round 3 ──

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

// Round 1: 8 partidas (todas finalizadas)
const ROUND1_MATCHES: BracketMatch[] = [
  { id: "SW-R1-1", round: 1, position: 0, bracket: "swiss", label: "Swiss R1 #1 (0-0)", team1_id: 1, team2_id: 16, team1_from: null, team2_from: null, winner_id: 1, match_id: null, map: "de_mirage", maps: null, status: "finished", num_maps: 1, veto_actions: [] },
  { id: "SW-R1-2", round: 1, position: 1, bracket: "swiss", label: "Swiss R1 #2 (0-0)", team1_id: 2, team2_id: 15, team1_from: null, team2_from: null, winner_id: 2, match_id: null, map: "de_inferno", maps: null, status: "finished", num_maps: 1, veto_actions: [] },
  { id: "SW-R1-3", round: 1, position: 2, bracket: "swiss", label: "Swiss R1 #3 (0-0)", team1_id: 3, team2_id: 14, team1_from: null, team2_from: null, winner_id: 3, match_id: null, map: "de_dust2", maps: null, status: "finished", num_maps: 1, veto_actions: [] },
  { id: "SW-R1-4", round: 1, position: 3, bracket: "swiss", label: "Swiss R1 #4 (0-0)", team1_id: 4, team2_id: 13, team1_from: null, team2_from: null, winner_id: 4, match_id: null, map: "de_nuke", maps: null, status: "finished", num_maps: 1, veto_actions: [] },
  { id: "SW-R1-5", round: 1, position: 4, bracket: "swiss", label: "Swiss R1 #5 (0-0)", team1_id: 5, team2_id: 12, team1_from: null, team2_from: null, winner_id: 5, match_id: null, map: "de_ancient", maps: null, status: "finished", num_maps: 1, veto_actions: [] },
  { id: "SW-R1-6", round: 1, position: 5, bracket: "swiss", label: "Swiss R1 #6 (0-0)", team1_id: 6, team2_id: 11, team1_from: null, team2_from: null, winner_id: 11, match_id: null, map: "de_overpass", maps: null, status: "finished", num_maps: 1, veto_actions: [] },
  { id: "SW-R1-7", round: 1, position: 6, bracket: "swiss", label: "Swiss R1 #7 (0-0)", team1_id: 7, team2_id: 10, team1_from: null, team2_from: null, winner_id: 7, match_id: null, map: "de_anubis", maps: null, status: "finished", num_maps: 1, veto_actions: [] },
  { id: "SW-R1-8", round: 1, position: 7, bracket: "swiss", label: "Swiss R1 #8 (0-0)", team1_id: 8, team2_id: 9, team1_from: null, team2_from: null, winner_id: 9, match_id: null, map: "de_mirage", maps: null, status: "finished", num_maps: 1, veto_actions: [] },
];

// Round 2: 1-0 vs 1-0 (4 matches) + 0-1 vs 0-1 (4 matches) — all finished
const ROUND2_MATCHES: BracketMatch[] = [
  // 1-0 pool
  { id: "SW-R2-1", round: 2, position: 0, bracket: "swiss", label: "Swiss R2 #1 (1-0)", team1_id: 1, team2_id: 5, team1_from: null, team2_from: null, winner_id: 1, match_id: null, map: "de_inferno", maps: null, status: "finished", num_maps: 1, veto_actions: [] },
  { id: "SW-R2-2", round: 2, position: 1, bracket: "swiss", label: "Swiss R2 #2 (1-0)", team1_id: 2, team2_id: 7, team1_from: null, team2_from: null, winner_id: 2, match_id: null, map: "de_nuke", maps: null, status: "finished", num_maps: 1, veto_actions: [] },
  { id: "SW-R2-3", round: 2, position: 2, bracket: "swiss", label: "Swiss R2 #3 (1-0)", team1_id: 3, team2_id: 9, team1_from: null, team2_from: null, winner_id: 9, match_id: null, map: "de_dust2", maps: null, status: "finished", num_maps: 1, veto_actions: [] },
  { id: "SW-R2-4", round: 2, position: 3, bracket: "swiss", label: "Swiss R2 #4 (1-0)", team1_id: 4, team2_id: 11, team1_from: null, team2_from: null, winner_id: 4, match_id: null, map: "de_ancient", maps: null, status: "finished", num_maps: 1, veto_actions: [] },
  // 0-1 pool
  { id: "SW-R2-5", round: 2, position: 4, bracket: "swiss", label: "Swiss R2 #5 (0-1)", team1_id: 6, team2_id: 10, team1_from: null, team2_from: null, winner_id: 6, match_id: null, map: "de_mirage", maps: null, status: "finished", num_maps: 1, veto_actions: [] },
  { id: "SW-R2-6", round: 2, position: 5, bracket: "swiss", label: "Swiss R2 #6 (0-1)", team1_id: 8, team2_id: 12, team1_from: null, team2_from: null, winner_id: 8, match_id: null, map: "de_overpass", maps: null, status: "finished", num_maps: 1, veto_actions: [] },
  { id: "SW-R2-7", round: 2, position: 6, bracket: "swiss", label: "Swiss R2 #7 (0-1)", team1_id: 13, team2_id: 15, team1_from: null, team2_from: null, winner_id: 15, match_id: null, map: "de_anubis", maps: null, status: "finished", num_maps: 1, veto_actions: [] },
  { id: "SW-R2-8", round: 2, position: 7, bracket: "swiss", label: "Swiss R2 #8 (0-1)", team1_id: 14, team2_id: 16, team1_from: null, team2_from: null, winner_id: 14, match_id: null, map: "de_inferno", maps: null, status: "finished", num_maps: 1, veto_actions: [] },
];

// Round 3: 2-0 vs 2-0 (BO3 advance), 1-1 vs 1-1, 0-2 vs 0-2 (BO3 elim)
// Mix: some finished, some live, some pending
const ROUND3_MATCHES: BracketMatch[] = [
  // 2-0 pool (BO3 — advance match)
  { id: "SW-R3-1", round: 3, position: 0, bracket: "swiss", label: "Swiss R3 #1 (2-0)", team1_id: 1, team2_id: 2, team1_from: null, team2_from: null, winner_id: 1, match_id: null, map: null, maps: ["de_inferno", "de_mirage"], status: "finished", num_maps: 3, veto_actions: [] },
  { id: "SW-R3-2", round: 3, position: 1, bracket: "swiss", label: "Swiss R3 #2 (2-0)", team1_id: 4, team2_id: 9, team1_from: null, team2_from: null, winner_id: null, match_id: null, faceit_match_id: "1-abc123", map: null, maps: null, status: "live", num_maps: 3, veto_actions: [] },
  // 1-1 pool
  { id: "SW-R3-3", round: 3, position: 2, bracket: "swiss", label: "Swiss R3 #3 (1-1)", team1_id: 5, team2_id: 6, team1_from: null, team2_from: null, winner_id: 5, match_id: null, map: "de_dust2", maps: null, status: "finished", num_maps: 1, veto_actions: [] },
  { id: "SW-R3-4", round: 3, position: 3, bracket: "swiss", label: "Swiss R3 #4 (1-1)", team1_id: 3, team2_id: 8, team1_from: null, team2_from: null, winner_id: null, match_id: null, map: null, maps: null, status: "pending", num_maps: 1, veto_actions: [] },
  { id: "SW-R3-5", round: 3, position: 4, bracket: "swiss", label: "Swiss R3 #5 (1-1)", team1_id: 11, team2_id: 14, team1_from: null, team2_from: null, winner_id: null, match_id: null, map: null, maps: null, status: "pending", num_maps: 1, veto_actions: [] },
  { id: "SW-R3-6", round: 3, position: 5, bracket: "swiss", label: "Swiss R3 #6 (1-1)", team1_id: 7, team2_id: 15, team1_from: null, team2_from: null, winner_id: null, match_id: null, map: null, maps: null, status: "pending", num_maps: 1, veto_actions: [] },
  // 0-2 pool (BO3 — elimination match)
  { id: "SW-R3-7", round: 3, position: 6, bracket: "swiss", label: "Swiss R3 #7 (0-2)", team1_id: 10, team2_id: 13, team1_from: null, team2_from: null, winner_id: null, match_id: null, map: null, maps: null, status: "pending", num_maps: 3, veto_actions: [] },
  { id: "SW-R3-8", round: 3, position: 7, bracket: "swiss", label: "Swiss R3 #8 (0-2)", team1_id: 12, team2_id: 16, team1_from: null, team2_from: null, winner_id: null, match_id: null, map: null, maps: null, status: "pending", num_maps: 3, veto_actions: [] },
];

const FAKE_RECORDS: SwissRecord[] = [
  // 3-0 (advanced)
  { team_id: 1, wins: 3, losses: 0, buchholz: 5, opponents: [16, 5, 2] },
  // 2-0
  { team_id: 4, wins: 2, losses: 0, buchholz: 4, opponents: [13, 11] },
  { team_id: 9, wins: 2, losses: 0, buchholz: 3, opponents: [8, 3] },
  // 2-1
  { team_id: 2, wins: 2, losses: 1, buchholz: 5, opponents: [15, 7, 1] },
  { team_id: 5, wins: 2, losses: 1, buchholz: 3, opponents: [12, 1, 6] },
  // 1-1
  { team_id: 3, wins: 1, losses: 1, buchholz: 3, opponents: [14, 9] },
  { team_id: 11, wins: 1, losses: 1, buchholz: 2, opponents: [6, 4] },
  { team_id: 6, wins: 1, losses: 1, buchholz: 2, opponents: [11, 10] },
  { team_id: 8, wins: 1, losses: 1, buchholz: 1, opponents: [9, 12] },
  { team_id: 7, wins: 1, losses: 1, buchholz: 2, opponents: [10, 2] },
  { team_id: 14, wins: 1, losses: 1, buchholz: 1, opponents: [3, 16] },
  { team_id: 15, wins: 1, losses: 1, buchholz: 1, opponents: [2, 13] },
  // 0-2
  { team_id: 10, wins: 0, losses: 2, buchholz: 2, opponents: [7, 6] },
  { team_id: 13, wins: 0, losses: 2, buchholz: 2, opponents: [4, 15] },
  { team_id: 12, wins: 0, losses: 2, buchholz: 1, opponents: [5, 8] },
  { team_id: 16, wins: 0, losses: 2, buchholz: 2, opponents: [1, 14] },
];

const FAKE_TOURNAMENT: Tournament = {
  id: "test-swiss-1",
  name: "ORBITAL ROXA CUP #2 — ONLINE",
  season_id: null,
  server_id: null,
  format: "swiss",
  mode: "online",
  faceit_championship_id: "test-123",
  teams: FAKE_TEAMS,
  matches: [...ROUND1_MATCHES, ...ROUND2_MATCHES, ...ROUND3_MATCHES],
  map_pool: ["de_ancient", "de_anubis", "de_dust2", "de_inferno", "de_mirage", "de_nuke", "de_overpass"],
  players_per_team: 5,
  created_at: "2026-03-15T00:00:00Z",
  status: "active",
  current_match_id: null,
  swiss_records: FAKE_RECORDS,
  swiss_round: 3,
  swiss_advance_wins: 3,
  swiss_eliminate_losses: 3,
  start_date: "2026-03-20",
  end_date: "2026-03-25",
  prize_pool: "R$ 2.000",
  description: "Campeonato online com anti-cheat Faceit",
};

// ══════════════════════════════════
// PAGE COMPONENT
// ══════════════════════════════════

export default function TestSwissPage() {
  const tournament = FAKE_TOURNAMENT;
  const standings = getSwissStandings(tournament);
  const currentRound = tournament.swiss_round || 1;
  const totalRounds = Math.max(currentRound, ...tournament.matches.map(m => m.round));

  return (
    <div className="min-h-screen px-4 py-8 max-w-5xl mx-auto">
      {/* ═══ HERO BANNER ═══ */}
      <div className="relative bg-gradient-to-br from-[#0A0A0A] via-[#111] to-[#0A0A0A] border border-orbital-border overflow-hidden mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-[#FF5500]/5 via-transparent to-orbital-purple/5" />
        <div className="relative p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-3">
            <Gamepad2 size={14} className="text-[#FF5500]" />
            <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-[#FF5500]">
              ONLINE — FACEIT
            </span>
            <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-text-dim/40 ml-2">
              SWISS SYSTEM
            </span>
          </div>
          <h1 className="font-[family-name:var(--font-orbitron)] text-xl sm:text-2xl tracking-wider text-orbital-text mb-2">
            {tournament.name}
          </h1>
          <div className="flex flex-wrap items-center gap-4 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
            <span className="flex items-center gap-1.5">
              <Users size={12} /> {tournament.teams.length} times
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar size={12} /> {tournament.start_date} — {tournament.end_date}
            </span>
            {tournament.prize_pool && (
              <span className="flex items-center gap-1.5">
                <Trophy size={12} className="text-yellow-500/60" /> {tournament.prize_pool}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Shield size={12} className="text-[#FF5500]/60" /> Anti-cheat obrigatório
            </span>
          </div>
          {/* Round indicator */}
          <div className="flex items-center gap-2 mt-4">
            {Array.from({ length: 5 }, (_, i) => i + 1).map(r => (
              <div
                key={r}
                className={`flex items-center gap-1 px-2.5 py-1 border font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-wider ${
                  r < currentRound
                    ? "bg-green-500/10 border-green-500/30 text-green-400"
                    : r === currentRound
                    ? "bg-[#FF5500]/15 border-[#FF5500]/40 text-[#FF5500]"
                    : "bg-transparent border-orbital-border/30 text-orbital-text-dim/30"
                }`}
              >
                {r < currentRound ? <Check size={8} /> : r === currentRound ? <Swords size={8} /> : null}
                R{r}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ STANDINGS TABLE ═══ */}
      <HudCard className="p-5 mb-6" label="CLASSIFICAÇÃO">
        <div className="overflow-x-auto mt-2">
          <table className="w-full font-[family-name:var(--font-jetbrains)] text-xs">
            <thead>
              <tr className="text-orbital-text-dim/50 border-b border-orbital-border text-[0.55rem]">
                <th className="text-left py-2.5 px-3 w-8">#</th>
                <th className="text-left py-2.5 px-3">Time</th>
                <th className="text-center py-2.5 px-3 w-20">Record</th>
                <th className="text-center py-2.5 px-3 w-16">Buchholz</th>
                <th className="text-center py-2.5 px-3 w-24">Status</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, i) => (
                <tr
                  key={s.team_id}
                  className={`border-b border-orbital-border/20 transition-colors ${
                    s.status === "advanced"
                      ? "bg-green-500/5"
                      : s.status === "eliminated"
                      ? "bg-red-500/5 opacity-40"
                      : "hover:bg-white/[0.02]"
                  }`}
                >
                  <td className="py-3 px-3 text-orbital-text-dim">{i + 1}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <Shield size={14} className="text-orbital-text-dim/30 shrink-0" />
                      <span className="text-orbital-text font-medium">{s.name}</span>
                      <span className="text-orbital-text-dim/30 text-[0.5rem]">[{s.tag}]</span>
                    </div>
                  </td>
                  <td className="text-center py-3 px-3">
                    <span className="font-[family-name:var(--font-orbitron)] text-sm">
                      <span className="text-green-400">{s.wins}</span>
                      <span className="text-orbital-text-dim/20 mx-0.5">—</span>
                      <span className="text-red-400/70">{s.losses}</span>
                    </span>
                  </td>
                  <td className="text-center py-3 px-3 text-orbital-text-dim">{s.buchholz}</td>
                  <td className="text-center py-3 px-3">
                    <span
                      className={`font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-wider px-2.5 py-1 border ${
                        s.status === "advanced"
                          ? "text-green-400 border-green-400/30 bg-green-400/5"
                          : s.status === "eliminated"
                          ? "text-red-400/60 border-red-400/20"
                          : "text-orbital-text-dim border-orbital-border"
                      }`}
                    >
                      {s.status === "advanced" ? "AVANÇOU" : s.status === "eliminated" ? "ELIMINADO" : `${s.wins}-${s.losses}`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </HudCard>

      {/* ═══ MATCHES BY ROUND ═══ */}
      {Array.from({ length: totalRounds }, (_, i) => totalRounds - i).map(round => {
        const roundMatches = tournament.matches.filter(m => m.bracket === "swiss" && m.round === round);
        if (roundMatches.length === 0) return null;

        const allDone = roundMatches.every(m => m.status === "finished");
        const hasLive = roundMatches.some(m => m.status === "live");
        const hasPending = roundMatches.some(m => m.status === "pending");

        // Group by W-L pool
        const pools = new Map<string, BracketMatch[]>();
        for (const m of roundMatches) {
          const label = m.label.match(/\(([^)]+)\)/)?.[1] || "?";
          if (!pools.has(label)) pools.set(label, []);
          pools.get(label)!.push(m);
        }

        return (
          <HudCard key={round} className="p-5 mb-4" label={`ROUND ${round}`}>
            <div className="flex items-center gap-3 mb-4 mt-1">
              {hasLive && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/30 font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-wider text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  AO VIVO
                </span>
              )}
              {allDone && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 border border-green-500/20 font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-wider text-green-400/60">
                  <Check size={8} /> CONCLUÍDO
                </span>
              )}
              {hasPending && !hasLive && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/20 font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-wider text-yellow-500/60">
                  <Clock size={8} /> AGUARDANDO
                </span>
              )}
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim/40">
                {roundMatches.filter(m => m.status === "finished").length}/{roundMatches.length} partidas
              </span>
            </div>

            {Array.from(pools.entries()).map(([poolLabel, poolMatches]) => (
              <div key={poolLabel} className="mb-4 last:mb-0">
                <div className="font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-[0.2em] text-orbital-text-dim/40 mb-2 flex items-center gap-2">
                  <span className={`px-2 py-0.5 border ${
                    poolLabel === "2-0" || poolLabel === "3-0" ? "border-green-400/20 text-green-400/60" :
                    poolLabel === "0-2" || poolLabel === "0-3" ? "border-red-400/20 text-red-400/40" :
                    "border-orbital-border text-orbital-text-dim/40"
                  }`}>
                    {poolLabel}
                  </span>
                  {poolMatches[0].num_maps > 1 && (
                    <span className="text-[#FF5500]/50">BO3</span>
                  )}
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
                      <div
                        key={m.id}
                        className={`flex items-center gap-3 px-4 py-3 border transition-colors ${
                          isLive
                            ? "border-red-500/30 bg-red-500/5"
                            : isDone
                            ? "border-orbital-border/30 bg-orbital-card"
                            : "border-orbital-border bg-[#0A0A0A]"
                        }`}
                      >
                        {/* Team 1 */}
                        <div className="flex-1 flex items-center gap-2 min-w-0 justify-end">
                          <span className={`font-[family-name:var(--font-jetbrains)] text-xs truncate ${
                            isDone && m.winner_id === m.team1_id ? "text-green-400" : "text-orbital-text"
                          }`}>
                            {t1}
                          </span>
                          <Shield size={14} className="text-orbital-text-dim/20 shrink-0" />
                        </div>

                        {/* Score / VS */}
                        <div className="font-[family-name:var(--font-orbitron)] text-xs shrink-0 w-16 text-center">
                          {isDone ? (
                            <span className="text-orbital-text-dim/30 text-[0.5rem]">
                              {m.winner_id === m.team1_id ? (
                                <><span className="text-green-400">W</span> — L</>
                              ) : (
                                <>L — <span className="text-green-400">W</span></>
                              )}
                            </span>
                          ) : isLive ? (
                            <span className="text-red-400 text-[0.55rem] flex items-center justify-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                              LIVE
                            </span>
                          ) : (
                            <span className="text-orbital-text-dim/20 text-[0.5rem]">VS</span>
                          )}
                        </div>

                        {/* Team 2 */}
                        <div className="flex-1 flex items-center gap-2 min-w-0">
                          <Shield size={14} className="text-orbital-text-dim/20 shrink-0" />
                          <span className={`font-[family-name:var(--font-jetbrains)] text-xs truncate ${
                            isDone && m.winner_id === m.team2_id ? "text-green-400" : "text-orbital-text"
                          }`}>
                            {t2}
                          </span>
                        </div>

                        {/* Map + BO */}
                        <div className="flex items-center gap-2 shrink-0">
                          {m.map && (
                            <span className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-text-dim/40">
                              {m.map.replace("de_", "")}
                            </span>
                          )}
                          {m.num_maps > 1 && (
                            <span className="font-[family-name:var(--font-orbitron)] text-[0.4rem] text-[#FF5500]/40 border border-[#FF5500]/20 px-1.5 py-0.5">
                              BO3
                            </span>
                          )}
                          {m.faceit_match_id && (
                            <Gamepad2 size={10} className="text-[#FF5500]/30" />
                          )}
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

      {/* ═══ INFO BOX ═══ */}
      <HudCard className="p-5 mt-6">
        <div className="font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-[0.2em] text-orbital-text-dim/40 mb-3">
          SOBRE O FORMATO SWISS
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
          <div className="space-y-1">
            <div className="text-green-400 font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider">3 VITÓRIAS</div>
            <p>Time avança para a próxima fase</p>
          </div>
          <div className="space-y-1">
            <div className="text-red-400 font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider">3 DERROTAS</div>
            <p>Time é eliminado do campeonato</p>
          </div>
          <div className="space-y-1">
            <div className="text-[#FF5500] font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider">PARTIDAS DECISIVAS</div>
            <p>Partidas 2-0 vs 2-0 e 0-2 vs 0-2 são BO3</p>
          </div>
        </div>
      </HudCard>

      {/* Footer */}
      <div className="text-center mt-8">
        <p className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim/30">
          Página de teste — dados fictícios
        </p>
      </div>
    </div>
  );
}
