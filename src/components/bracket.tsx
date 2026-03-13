"use client";

import { Shield, Check, Swords, Trophy } from "lucide-react";
import Link from "next/link";
import { Tournament, BracketMatch, getTeamName } from "@/lib/tournament";

// ── Shared Types ──
export type MapScoresMap = Record<number, { team1_score: number; team2_score: number; map_name: string }[]>;

interface AdminActions {
  isAdmin: boolean;
  onSetWinner: (matchId: string, winnerId: number) => void;
  onStartVeto: (match: BracketMatch) => void;
}

// ── Team Row ──
function BracketTeamRow({ name, teamId, isWinner, isLoser, score, isLive }: {
  name: string;
  teamId: number | null;
  isWinner: boolean;
  isLoser?: boolean;
  score?: number;
  isLive?: boolean;
}) {
  const isTBD = !teamId || name === "TBD" || name === "A definir";
  return (
    <div className={`flex items-center gap-2 px-2.5 py-1.5 transition-colors ${
      isWinner ? "bg-orbital-success/10 border-l-2 border-orbital-success" : isLoser ? "bg-[#0A0A0A] opacity-40" : "bg-[#0A0A0A]"
    }`}>
      <Shield size={10} className={isWinner ? "text-orbital-success" : isTBD ? "text-orbital-text-dim/30" : "text-orbital-text-dim"} />
      <span className={`truncate text-[0.65rem] font-[family-name:var(--font-jetbrains)] ${
        isTBD ? "text-orbital-text-dim/30 italic" : isWinner ? "text-orbital-success font-bold" : isLoser ? "text-orbital-text-dim" : "text-orbital-text"
      }`}>
        {name}
      </span>
      <div className="flex items-center gap-1.5 ml-auto">
        {isLive && (
          <span className="flex items-center gap-1 text-orbital-live text-[0.4rem] font-[family-name:var(--font-orbitron)]">
            <span className="w-1.5 h-1.5 rounded-full bg-orbital-live animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
            LIVE
          </span>
        )}
        {isWinner && <Check size={10} className="text-orbital-success" />}
        {score !== undefined && (
          <span className={`font-[family-name:var(--font-jetbrains)] text-[0.6rem] font-bold ${
            isWinner ? "text-orbital-success" : "text-orbital-text-dim"
          }`}>{score}</span>
        )}
      </div>
    </div>
  );
}

// ── Match Card ──
export function BracketMatchCard({
  match,
  tournament,
  isGrandFinal,
  mapScoresMap,
  admin,
}: {
  match: BracketMatch;
  tournament: Tournament;
  isGrandFinal?: boolean;
  mapScoresMap?: MapScoresMap;
  admin?: AdminActions;
}) {
  const team1 = getTeamName(tournament, match.team1_id);
  const team2 = getTeamName(tournament, match.team2_id);
  const isLive = match.status === "live";
  const isDone = match.status === "finished";
  const hasLink = match.match_id != null;
  const isReady = match.team1_id && match.team2_id && match.status === "pending";

  const scores = match.match_id ? mapScoresMap?.[match.match_id] : undefined;
  const t1Score = scores?.[0]?.team1_score;
  const t2Score = scores?.[0]?.team2_score;

  const content = (
    <div className={`border p-3 transition-all ${hasLink ? "cursor-pointer hover:border-orbital-purple/40" : ""} ${
      isGrandFinal
        ? "bg-amber-500/5 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.08)]"
        : isLive
          ? "bg-orbital-card border-orbital-live/40"
          : isDone
            ? "bg-orbital-card border-orbital-success/20"
            : "bg-orbital-card border-orbital-border"
    }`}>
      {/* Label row */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-[0.15em] text-orbital-text-dim">
          {match.label}
        </span>
        {isLive && (
          <span className="flex items-center gap-1 font-[family-name:var(--font-orbitron)] text-[0.45rem] text-orbital-live animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-orbital-live shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
            LIVE
          </span>
        )}
        {match.map && (
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-purple">
            {match.map.replace("de_", "").toUpperCase()}
          </span>
        )}
        {match.maps && (
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-purple">
            {match.maps.map(m => m.replace("de_", "").toUpperCase()).join(" / ")}
          </span>
        )}
      </div>

      {/* Teams */}
      <div className="space-y-1">
        <BracketTeamRow
          name={team1}
          teamId={match.team1_id}
          score={t1Score}
          isWinner={isDone && match.winner_id === match.team1_id}
          isLoser={isDone && match.winner_id !== null && match.winner_id !== match.team1_id}
          isLive={isLive}
        />
        <BracketTeamRow
          name={team2}
          teamId={match.team2_id}
          score={t2Score}
          isWinner={isDone && match.winner_id === match.team2_id}
          isLoser={isDone && match.winner_id !== null && match.winner_id !== match.team2_id}
        />
      </div>

      {/* Admin actions */}
      {admin?.isAdmin && (
        <div className="mt-2 flex gap-1">
          {isReady && match.status === "pending" && (
            <button
              onClick={() => admin.onStartVeto(match)}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 transition-all font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-wider text-orbital-purple"
            >
              <Swords size={10} /> VETO
            </button>
          )}
          {isLive && match.team1_id && match.team2_id && (
            <>
              <button
                onClick={() => admin.onSetWinner(match.id, match.team1_id!)}
                className="flex-1 px-2 py-1.5 border border-orbital-border hover:border-orbital-success/50 hover:bg-orbital-success/10 transition-all font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-text-dim hover:text-orbital-success truncate"
              >
                {team1} W
              </button>
              <button
                onClick={() => admin.onSetWinner(match.id, match.team2_id!)}
                className="flex-1 px-2 py-1.5 border border-orbital-border hover:border-orbital-success/50 hover:bg-orbital-success/10 transition-all font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-text-dim hover:text-orbital-success truncate"
              >
                {team2} W
              </button>
            </>
          )}
          {match.match_id && (
            <Link
              href={`/partidas/${match.match_id}`}
              className="px-2 py-1.5 border border-orbital-border hover:border-orbital-purple/30 transition-all font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-text-dim hover:text-orbital-purple"
            >
              #{match.match_id}
            </Link>
          )}
        </div>
      )}

      {/* Match link (non-admin) */}
      {!admin?.isAdmin && hasLink && (
        <div className="mt-2 text-center">
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-purple/60">
            #{match.match_id}
          </span>
        </div>
      )}
    </div>
  );

  if (hasLink && !admin?.isAdmin) {
    return <Link href={`/partidas/${match.match_id}`} className="block">{content}</Link>;
  }
  return content;
}

// ── Bracket Section (groups matches by round) ──
export function BracketSection({
  matches,
  tournament,
  mapScoresMap,
  admin,
  isWinnerBracket,
}: {
  matches: BracketMatch[];
  tournament: Tournament;
  mapScoresMap?: MapScoresMap;
  admin?: AdminActions;
  isWinnerBracket?: boolean;
}) {
  const rounds = new Map<number, BracketMatch[]>();
  matches.forEach(m => {
    const list = rounds.get(m.round) || [];
    list.push(m);
    rounds.set(m.round, list);
  });
  const sortedRounds = Array.from(rounds.entries()).sort((a, b) => a[0] - b[0]);

  return (
    <div className="relative">
      <div className="flex gap-4 sm:gap-6 overflow-x-auto py-4 px-2 pb-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-orbital-purple/30">
        {sortedRounds.map(([round, roundMatches], idx) => (
          <div key={round} className="flex items-center">
            <div className="flex flex-col gap-4 min-w-[180px] sm:min-w-[220px]">
              <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-text-dim text-center mb-2">
                {isWinnerBracket
                  ? round === 1 ? "QUARTAS" : round === 2 ? "SEMIFINAL" : "FINAL"
                  : `RODADA ${round}`
                }
              </div>
              {roundMatches.map(match => (
                <BracketMatchCard
                  key={match.id}
                  match={match}
                  tournament={tournament}
                  mapScoresMap={mapScoresMap}
                  admin={admin}
                />
              ))}
            </div>
            {/* Connector between rounds */}
            {idx < sortedRounds.length - 1 && (
              <div className="flex items-center justify-center px-1 shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" className={isWinnerBracket ? "text-orbital-purple/25" : "text-orbital-danger/25"}>
                  <line x1="0" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="1" />
                  <path d="M16,8 L22,12 L16,16" fill="none" stroke="currentColor" strokeWidth="1" />
                </svg>
              </div>
            )}
          </div>
        ))}
        <div className="min-w-[1px] shrink-0" />
      </div>
      {/* Scroll indicator for mobile */}
      <div className="sm:hidden flex justify-center gap-1 mt-1">
        <div className="w-8 h-0.5 bg-orbital-purple/40 rounded-full" />
        <div className="w-2 h-0.5 bg-orbital-purple/20 rounded-full" />
        <div className="w-2 h-0.5 bg-orbital-purple/20 rounded-full" />
      </div>
    </div>
  );
}

// ── Full Bracket (Winner + Lower + Grand Final) ──
export function FullBracket({
  tournament,
  mapScoresMap,
  admin,
}: {
  tournament: Tournament;
  mapScoresMap?: MapScoresMap;
  admin?: AdminActions;
}) {
  const winnerMatches = tournament.matches.filter(m => m.bracket === "winner");
  const lowerMatches = tournament.matches.filter(m => m.bracket === "lower");
  const grandFinal = tournament.matches.find(m => m.bracket === "grand_final");

  return (
    <div className="space-y-6">
      {/* Winner Bracket */}
      {winnerMatches.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-[1px] w-4 bg-orbital-purple/40" />
            <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-purple">WINNER BRACKET</span>
            <div className="h-[1px] flex-1 bg-orbital-purple/20" />
          </div>
          <BracketSection
            matches={winnerMatches}
            tournament={tournament}
            mapScoresMap={mapScoresMap}
            admin={admin}
            isWinnerBracket
          />
        </div>
      )}

      {/* Lower Bracket */}
      {lowerMatches.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-[1px] w-4 bg-orbital-danger/40" />
            <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-danger/80">LOWER BRACKET</span>
            <div className="h-[1px] flex-1 bg-orbital-danger/15" />
          </div>
          <BracketSection
            matches={lowerMatches}
            tournament={tournament}
            mapScoresMap={mapScoresMap}
            admin={admin}
          />
        </div>
      )}

      {/* Grand Final */}
      {grandFinal && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={12} className="text-amber-500" />
            <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-amber-500">GRAND FINAL — BO3</span>
            <div className="h-[1px] flex-1 bg-amber-500/30" />
          </div>
          <div className="flex justify-center">
            <div className="w-full max-w-[300px]">
              <BracketMatchCard
                match={grandFinal}
                tournament={tournament}
                isGrandFinal
                mapScoresMap={mapScoresMap}
                admin={admin}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
