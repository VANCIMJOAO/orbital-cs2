"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Trophy, X } from "lucide-react";
import Link from "next/link";
import { Match, getStatusType } from "@/lib/api";

interface Toast {
  id: string;
  matchId: number;
  type: "started" | "finished";
  title: string;
  team1: string;
  team2: string;
  score?: string;
  winner?: string;
}

export function LiveToastProvider() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const knownRef = useRef<Map<number, string>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const checkMatches = async () => {
      try {
        const res = await fetch("/api/matches");
        const data = await res.json();
        const matches: Match[] = data.matches || [];

        for (const match of matches) {
          const status = getStatusType(match);
          const prevStatus = knownRef.current.get(match.id);

          if (!prevStatus) {
            knownRef.current.set(match.id, status);
            continue;
          }

          if (prevStatus !== status) {
            knownRef.current.set(match.id, status);

            if (status === "live" && prevStatus === "upcoming") {
              const toast: Toast = {
                id: `${match.id}-live-${Date.now()}`,
                matchId: match.id,
                type: "started",
                title: match.title || `Match #${match.id}`,
                team1: match.team1_string,
                team2: match.team2_string,
              };
              setToasts(prev => [...prev, toast]);
              setTimeout(() => removeToast(toast.id), 8000);
            }

            if (status === "finished" && prevStatus === "live") {
              const winnerName = match.winner === match.team1_id
                ? match.team1_string
                : match.winner === match.team2_id
                  ? match.team2_string
                  : null;
              const toast: Toast = {
                id: `${match.id}-finish-${Date.now()}`,
                matchId: match.id,
                type: "finished",
                title: match.title || `Match #${match.id}`,
                team1: match.team1_string,
                team2: match.team2_string,
                score: `${match.team1_score} - ${match.team2_score}`,
                winner: winnerName || undefined,
              };
              setToasts(prev => [...prev, toast]);
              setTimeout(() => removeToast(toast.id), 10000);
            }
          }
        }
      } catch { /* */ }
    };

    checkMatches();
    const interval = setInterval(checkMatches, 15000);
    return () => clearInterval(interval);
  }, [removeToast]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <Link href={`/partidas/${toast.matchId}`} className="block">
              <div className={`border p-3 backdrop-blur-md ${
                toast.type === "started"
                  ? "bg-orbital-live/10 border-orbital-live/40"
                  : "bg-orbital-success/10 border-orbital-success/40"
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {toast.type === "started" ? (
                      <Swords size={12} className="text-orbital-live" />
                    ) : (
                      <Trophy size={12} className="text-orbital-success" />
                    )}
                    <span className={`font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] ${
                      toast.type === "started" ? "text-orbital-live" : "text-orbital-success"
                    }`}>
                      {toast.type === "started" ? "PARTIDA INICIADA" : "PARTIDA FINALIZADA"}
                    </span>
                  </div>
                  <button
                    onClick={(e) => { e.preventDefault(); removeToast(toast.id); }}
                    className="text-orbital-text-dim hover:text-orbital-text p-0.5"
                  >
                    <X size={10} />
                  </button>
                </div>
                <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text">
                  {toast.team1} <span className="text-orbital-text-dim">vs</span> {toast.team2}
                </div>
                {toast.score && (
                  <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim mt-0.5">
                    {toast.score}{toast.winner && ` — ${toast.winner} venceu`}
                  </div>
                )}
              </div>
            </Link>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
