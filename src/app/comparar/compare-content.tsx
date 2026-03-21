"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, ChevronDown, User } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { HudCard } from "@/components/hud-card";
import { LeaderboardEntry } from "@/lib/api";

/* ── Types ── */
interface CompareContentProps {
  initialPlayers: LeaderboardEntry[];
}

interface StatDef {
  label: string;
  key: string;
  getValue: (p: LeaderboardEntry) => number;
  format: (v: number) => string;
  higherIsBetter: boolean;
}

/* ── Stat definitions ── */
const STATS: StatDef[] = [
  {
    label: "RATING",
    key: "rating",
    getValue: (p) => p.average_rating || 0,
    format: (v) => v.toFixed(2),
    higherIsBetter: true,
  },
  {
    label: "K/D",
    key: "kd",
    getValue: (p) => (p.deaths > 0 ? p.kills / p.deaths : p.kills),
    format: (v) => v.toFixed(2),
    higherIsBetter: true,
  },
  {
    label: "HS%",
    key: "hsp",
    getValue: (p) => p.hsp || 0,
    format: (v) => `${Math.round(v)}%`,
    higherIsBetter: true,
  },
  {
    label: "TOTAL KILLS",
    key: "kills",
    getValue: (p) => p.kills,
    format: (v) => v.toLocaleString("pt-BR"),
    higherIsBetter: true,
  },
  {
    label: "TOTAL DEATHS",
    key: "deaths",
    getValue: (p) => p.deaths,
    format: (v) => v.toLocaleString("pt-BR"),
    higherIsBetter: false,
  },
  {
    label: "WINS",
    key: "wins",
    getValue: (p) => p.wins,
    format: (v) => v.toLocaleString("pt-BR"),
    higherIsBetter: true,
  },
  {
    label: "ROUNDS",
    key: "rounds",
    getValue: (p) => p.trp,
    format: (v) => v.toLocaleString("pt-BR"),
    higherIsBetter: true,
  },
  {
    label: "ADR",
    key: "adr",
    getValue: (p) => (p.trp > 0 ? p.total_damage / p.trp : 0),
    format: (v) => v.toFixed(1),
    higherIsBetter: true,
  },
];

/* ── Avatar component ── */
function PlayerAvatar({ steamId, name, size = 80, avatarUrl }: { steamId: string; name: string; size?: number; avatarUrl?: string | null }) {
  const [error, setError] = useState(false);

  if (error || !avatarUrl) {
    return (
      <div
        className="rounded-full bg-orbital-card border-2 border-orbital-border flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <User size={size * 0.5} className="text-orbital-text-dim" />
      </div>
    );
  }

  return (
    <img
      src={avatarUrl}
      alt={name}
      width={size}
      height={size}
      className="rounded-full border-2 border-orbital-border object-cover"
      onError={() => setError(true)}
    />
  );
}

/* ── Searchable Dropdown ── */
function PlayerSelect({
  players,
  selected,
  onSelect,
  placeholder,
  otherSelected,
}: {
  players: LeaderboardEntry[];
  selected: LeaderboardEntry | null;
  onSelect: (p: LeaderboardEntry | null) => void;
  placeholder: string;
  otherSelected: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return players.filter(
      (p) =>
        p.steamId !== otherSelected &&
        p.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [players, otherSelected, search]);

  return (
    <div className="relative w-full">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-[#0A0A0A] border border-orbital-border hover:border-orbital-purple/50 transition-colors"
      >
        <span
          className={`font-[family-name:var(--font-orbitron)] text-xs tracking-wider truncate ${
            selected ? "text-orbital-text" : "text-orbital-text-dim"
          }`}
        >
          {selected ? selected.name : placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`text-orbital-purple transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#0A0A0A] border border-orbital-border max-h-60 overflow-hidden flex flex-col"
          >
            <div className="p-2 border-b border-orbital-border">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar jogador..."
                autoFocus
                className="w-full bg-transparent font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text placeholder:text-orbital-text-dim outline-none px-2 py-1"
              />
            </div>
            <div className="overflow-y-auto max-h-48 scrollbar-thin">
              {selected && (
                <button
                  onClick={() => {
                    onSelect(null);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="w-full text-left px-4 py-2 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim hover:bg-orbital-purple/10 transition-colors"
                >
                  Limpar
                </button>
              )}
              {filtered.map((p) => (
                <button
                  key={p.steamId}
                  onClick={() => {
                    onSelect(p);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="w-full text-left px-4 py-2 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text hover:bg-orbital-purple/10 transition-colors flex items-center justify-between"
                >
                  <span className="truncate">{p.name}</span>
                  <span className="text-orbital-text-dim ml-2 flex-shrink-0">
                    {(p.average_rating || 0).toFixed(2)}
                  </span>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="px-4 py-3 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim text-center">
                  Nenhum jogador encontrado
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Stat comparison bar ── */
function StatBar({
  stat,
  p1,
  p2,
  index,
}: {
  stat: StatDef;
  p1: LeaderboardEntry;
  p2: LeaderboardEntry;
  index: number;
}) {
  const v1 = stat.getValue(p1);
  const v2 = stat.getValue(p2);
  const max = Math.max(v1, v2, 0.01);
  const pct1 = (v1 / max) * 100;
  const pct2 = (v2 / max) * 100;

  const p1Wins = stat.higherIsBetter ? v1 > v2 : v1 < v2;
  const p2Wins = stat.higherIsBetter ? v2 > v1 : v2 < v1;
  const tied = v1 === v2;

  return (
    <motion.div
      initial={{ opacity: 0, x: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.1 * index }}
      className="py-3"
    >
      {/* Stat label centered */}
      <div className="text-center mb-2">
        <span className="font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-[0.2em] text-orbital-text-dim uppercase">
          {stat.label}
        </span>
      </div>

      {/* Values and bars */}
      <div className="flex items-center gap-3">
        {/* P1 value */}
        <div className="w-16 sm:w-20 text-right flex-shrink-0">
          <span
            className={`font-[family-name:var(--font-jetbrains)] text-sm sm:text-base font-bold ${
              p1Wins ? "text-purple-400" : tied ? "text-orbital-text" : "text-orbital-text-dim"
            }`}
          >
            {stat.format(v1)}
          </span>
        </div>

        {/* Bars */}
        <div className="flex-1 flex items-center gap-1">
          {/* P1 bar (grows right to left) */}
          <div className="flex-1 h-5 sm:h-6 bg-[#111] rounded-sm overflow-hidden flex justify-end">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct1}%` }}
              transition={{ duration: 0.8, delay: 0.1 * index, ease: "easeOut" }}
              className={`h-full rounded-sm ${
                p1Wins
                  ? "bg-gradient-to-r from-purple-600/40 to-purple-500/80"
                  : "bg-gradient-to-r from-purple-900/20 to-purple-700/40"
              }`}
            />
          </div>

          {/* Divider */}
          <div className="w-px h-5 sm:h-6 bg-orbital-border flex-shrink-0" />

          {/* P2 bar (grows left to right) */}
          <div className="flex-1 h-5 sm:h-6 bg-[#111] rounded-sm overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct2}%` }}
              transition={{ duration: 0.8, delay: 0.1 * index, ease: "easeOut" }}
              className={`h-full rounded-sm ${
                p2Wins
                  ? "bg-gradient-to-l from-red-600/40 to-red-500/80"
                  : "bg-gradient-to-l from-red-900/20 to-red-700/40"
              }`}
            />
          </div>
        </div>

        {/* P2 value */}
        <div className="w-16 sm:w-20 text-left flex-shrink-0">
          <span
            className={`font-[family-name:var(--font-jetbrains)] text-sm sm:text-base font-bold ${
              p2Wins ? "text-red-400" : tied ? "text-orbital-text" : "text-orbital-text-dim"
            }`}
          >
            {stat.format(v2)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Player Card ── */
function PlayerCard({
  player,
  side,
  delay,
  avatarUrl,
}: {
  player: LeaderboardEntry;
  side: "left" | "right";
  delay: number;
  avatarUrl?: string | null;
}) {
  const accentColor = side === "left" ? "purple" : "red";
  const borderColor = side === "left" ? "border-purple-500/40" : "border-red-500/40";
  const glowClass = side === "left" ? "shadow-[0_0_30px_rgba(168,85,247,0.15)]" : "shadow-[0_0_30px_rgba(239,68,68,0.15)]";

  return (
    <motion.div
      initial={{ opacity: 0, x: side === "left" ? -40 : 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay }}
      className={`flex flex-col items-center text-center ${glowClass}`}
    >
      <div className={`relative mb-3 rounded-full border-2 ${borderColor} p-1`}>
        <PlayerAvatar steamId={player.steamId} name={player.name} size={80} avatarUrl={avatarUrl} />
        {/* Glow ring */}
        <div
          className={`absolute inset-0 rounded-full ${
            side === "left"
              ? "shadow-[0_0_20px_rgba(168,85,247,0.3)]"
              : "shadow-[0_0_20px_rgba(239,68,68,0.3)]"
          }`}
        />
      </div>

      <Link
        href={`/perfil/${player.steamId}`}
        className={`font-[family-name:var(--font-orbitron)] text-sm sm:text-lg font-bold tracking-wider hover:opacity-80 transition-opacity ${
          side === "left" ? "text-purple-400" : "text-red-400"
        }`}
      >
        {player.name.toUpperCase()}
      </Link>

      <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim mt-1">
        {player.kills}K / {player.deaths}D / {player.assists}A
      </div>

      {/* Mini stats */}
      <div className="flex items-center gap-3 mt-2">
        <div className="text-center">
          <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-text-dim uppercase">
            Rating
          </div>
          <div
            className={`font-[family-name:var(--font-jetbrains)] text-lg font-bold ${
              side === "left" ? "text-purple-400" : "text-red-400"
            }`}
          >
            {(player.average_rating || 0).toFixed(2)}
          </div>
        </div>
        <div className={`w-px h-6 ${side === "left" ? "bg-purple-500/30" : "bg-red-500/30"}`} />
        <div className="text-center">
          <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-text-dim uppercase">
            Maps
          </div>
          <div
            className={`font-[family-name:var(--font-jetbrains)] text-lg font-bold ${
              side === "left" ? "text-purple-400" : "text-red-400"
            }`}
          >
            {player.total_maps}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Score summary ── */
function ScoreSummary({ p1, p2 }: { p1: LeaderboardEntry; p2: LeaderboardEntry }) {
  let p1Score = 0;
  let p2Score = 0;

  for (const stat of STATS) {
    const v1 = stat.getValue(p1);
    const v2 = stat.getValue(p2);
    if (stat.higherIsBetter) {
      if (v1 > v2) p1Score++;
      else if (v2 > v1) p2Score++;
    } else {
      if (v1 < v2) p1Score++;
      else if (v2 < v1) p2Score++;
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="flex items-center justify-center gap-4 sm:gap-6 mt-2"
    >
      <span
        className={`font-[family-name:var(--font-jetbrains)] text-3xl sm:text-4xl font-bold ${
          p1Score > p2Score ? "text-purple-400" : "text-purple-400/40"
        }`}
      >
        {p1Score}
      </span>
      <span className="font-[family-name:var(--font-orbitron)] text-xs text-orbital-text-dim tracking-widest">
        STATS WON
      </span>
      <span
        className={`font-[family-name:var(--font-jetbrains)] text-3xl sm:text-4xl font-bold ${
          p2Score > p1Score ? "text-red-400" : "text-red-400/40"
        }`}
      >
        {p2Score}
      </span>
    </motion.div>
  );
}

/* ── Main Component ── */
export function CompareContent({ initialPlayers }: CompareContentProps) {
  const searchParams = useSearchParams();
  const [player1, setPlayer1] = useState<LeaderboardEntry | null>(null);
  const [player2, setPlayer2] = useState<LeaderboardEntry | null>(null);
  const [avatars, setAvatars] = useState<Record<string, string>>({});

  const sorted = useMemo(
    () => [...initialPlayers].sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0)),
    [initialPlayers]
  );

  // Pré-selecionar jogadores via query params (?p1=steamId&p2=steamId)
  useEffect(() => {
    const p1Id = searchParams.get("p1");
    const p2Id = searchParams.get("p2");
    if (p1Id && !player1) {
      const found = initialPlayers.find(p => p.steamId === p1Id);
      if (found) setPlayer1(found);
    }
    if (p2Id && !player2) {
      const found = initialPlayers.find(p => p.steamId === p2Id);
      if (found) setPlayer2(found);
    }
  }, [searchParams, initialPlayers]);

  // Fetch avatars when players are selected
  useEffect(() => {
    const ids = [player1?.steamId, player2?.steamId].filter((id): id is string => !!id && !avatars[id]);
    ids.forEach(steamId => {
      fetch(`/api/steam/avatar/${steamId}`)
        .then(r => r.json())
        .then(d => {
          if (d?.avatar) setAvatars(prev => ({ ...prev, [steamId]: d.avatar }));
        })
        .catch(() => {});
    });
  }, [player1?.steamId, player2?.steamId]);

  const bothSelected = player1 !== null && player2 !== null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="py-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <Swords size={20} className="text-orbital-purple" />
          <h1 className="font-[family-name:var(--font-orbitron)] text-xl font-bold tracking-wider text-orbital-text">
            COMPARAR JOGADORES
          </h1>
        </div>
        <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
          Selecione dois jogadores para comparar suas estatísticas
        </p>
      </motion.div>

      {/* Player Selection */}
      <HudCard label="SELECIONAR" className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
          <PlayerSelect
            players={sorted}
            selected={player1}
            onSelect={setPlayer1}
            placeholder="Jogador 1"
            otherSelected={player2?.steamId || null}
          />

          <div className="flex items-center justify-center">
            <div className="font-[family-name:var(--font-orbitron)] text-xl sm:text-2xl font-bold text-orbital-purple/60">
              VS
            </div>
          </div>

          <PlayerSelect
            players={sorted}
            selected={player2}
            onSelect={setPlayer2}
            placeholder="Jogador 2"
            otherSelected={player1?.steamId || null}
          />
        </div>
      </HudCard>

      {/* Comparison View */}
      <AnimatePresence mode="wait">
        {bothSelected ? (
          <motion.div
            key={`${player1.steamId}-${player2.steamId}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Fight Card Header */}
            <HudCard glow className="mb-6 overflow-hidden">
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-[0.03]">
                <div
                  className="w-full h-full"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(168,85,247,0.3) 20px, rgba(168,85,247,0.3) 21px)",
                  }}
                />
              </div>

              <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-8 py-4 sm:py-6">
                {/* Player 1 */}
                <PlayerCard player={player1} side="left" delay={0.1} avatarUrl={avatars[player1.steamId]} />

                {/* VS Center */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.2, type: "spring", stiffness: 200 }}
                  className="flex flex-col items-center"
                >
                  {/* Glowing VS */}
                  <div className="relative">
                    <span className="font-[family-name:var(--font-orbitron)] text-3xl sm:text-5xl font-black text-orbital-purple drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]">
                      VS
                    </span>
                    {/* Pulse ring */}
                    <motion.div
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-orbital-purple/30" />
                    </motion.div>
                  </div>

                  {/* Decorative line */}
                  <div className="hidden sm:block w-px h-8 bg-gradient-to-b from-orbital-purple/50 to-transparent mt-2" />
                </motion.div>

                {/* Player 2 */}
                <PlayerCard player={player2} side="right" delay={0.15} avatarUrl={avatars[player2.steamId]} />
              </div>

              {/* Score summary */}
              <div className="relative border-t border-orbital-border pt-4 mt-2">
                <ScoreSummary p1={player1} p2={player2} />
              </div>
            </HudCard>

            {/* Stat Bars */}
            <HudCard label="ESTATÍSTICAS">
              <div className="divide-y divide-orbital-border/30">
                {STATS.map((stat, i) => (
                  <StatBar key={stat.key} stat={stat} p1={player1} p2={player2} index={i} />
                ))}
              </div>
            </HudCard>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <HudCard className="text-center py-16">
              <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <Swords size={48} className="text-orbital-border mx-auto mb-4" />
              </motion.div>
              <p className="font-[family-name:var(--font-orbitron)] text-sm text-orbital-text-dim tracking-wider mb-2">
                AGUARDANDO JOGADORES
              </p>
              <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim/60">
                Selecione dois jogadores acima para iniciar a comparação
              </p>

              {/* Decorative scan line */}
              <motion.div
                animate={{ y: [0, 100, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-orbital-purple/20 to-transparent"
              />
            </HudCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
