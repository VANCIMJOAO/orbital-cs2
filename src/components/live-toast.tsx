"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Trophy, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { Match, getStatusType } from "@/lib/api";

interface Toast {
  id: string;
  matchId: number;
  type: "started" | "finished" | "highlight";
  title: string;
  team1: string;
  team2: string;
  score?: string;
  winner?: string;
  href?: string;
}

export function LiveToastProvider() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const knownRef = useRef<Map<number, string>>(new Map());
  const knownClipsRef = useRef<Set<number>>(new Set());
  const clipsInitialized = useRef(false);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Match status polling — only when page is visible
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

    let interval: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      checkMatches();
      interval = setInterval(checkMatches, 30000);
    };

    const stopPolling = () => {
      if (interval) { clearInterval(interval); interval = null; }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        startPolling();
      } else {
        stopPolling();
      }
    };

    // Start immediately if visible
    if (document.visibilityState === "visible") {
      startPolling();
    }

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [removeToast]);

  // Highlight clips polling — only when page is visible
  useEffect(() => {
    const checkHighlights = async () => {
      try {
        const res = await fetch("/api/highlights/all?limit=10");
        if (!res.ok) return;
        const data = await res.json();
        const clips: { id: number; match_id: number; player_name: string; kills_count: number; team1_string: string; team2_string: string }[] = data.clips || [];

        if (!clipsInitialized.current) {
          for (const clip of clips) knownClipsRef.current.add(clip.id);
          clipsInitialized.current = true;
          return;
        }

        for (const clip of clips) {
          if (!knownClipsRef.current.has(clip.id)) {
            knownClipsRef.current.add(clip.id);
            const toast: Toast = {
              id: `highlight-${clip.id}-${Date.now()}`,
              matchId: clip.match_id,
              type: "highlight",
              title: `${clip.player_name || "Player"} — ${clip.kills_count >= 5 ? "ACE" : `${clip.kills_count}K`}`,
              team1: clip.team1_string || "Time 1",
              team2: clip.team2_string || "Time 2",
              href: "/highlights",
            };
            setToasts(prev => [...prev, toast]);
            setTimeout(() => removeToast(toast.id), 10000);
          }
        }
      } catch { /* */ }
    };

    let interval: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      checkHighlights();
      interval = setInterval(checkHighlights, 60000);
    };

    const stopPolling = () => {
      if (interval) { clearInterval(interval); interval = null; }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        startPolling();
      } else {
        stopPolling();
      }
    };

    if (document.visibilityState === "visible") {
      startPolling();
    }

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
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
            <Link href={toast.href || `/partidas/${toast.matchId}`} className="block">
              <div className={`border p-3 backdrop-blur-md ${
                toast.type === "started"
                  ? "bg-orbital-live/10 border-orbital-live/40"
                  : toast.type === "highlight"
                    ? "bg-orbital-purple/10 border-orbital-purple/40"
                    : "bg-orbital-success/10 border-orbital-success/40"
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {toast.type === "started" ? (
                      <Swords size={12} className="text-orbital-live" />
                    ) : toast.type === "highlight" ? (
                      <Sparkles size={12} className="text-orbital-purple" />
                    ) : (
                      <Trophy size={12} className="text-orbital-success" />
                    )}
                    <span className={`font-[family-name:var(--font-russo)] text-[0.65rem] tracking-[0.15em] ${
                      toast.type === "started"
                        ? "text-orbital-live"
                        : toast.type === "highlight"
                          ? "text-orbital-purple"
                          : "text-orbital-success"
                    }`}>
                      {toast.type === "started"
                        ? "PARTIDA INICIADA"
                        : toast.type === "highlight"
                          ? "NOVO HIGHLIGHT"
                          : "PARTIDA FINALIZADA"}
                    </span>
                  </div>
                  <button
                    onClick={(e) => { e.preventDefault(); removeToast(toast.id); }}
                    className="text-orbital-text-dim hover:text-orbital-text p-0.5"
                  >
                    <X size={10} />
                  </button>
                </div>
                {toast.type === "highlight" ? (
                  <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text">
                    {toast.title}
                    <div className="text-[0.6rem] text-orbital-text-dim mt-0.5">
                      {toast.team1} vs {toast.team2}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text">
                      {toast.team1} <span className="text-orbital-text-dim">vs</span> {toast.team2}
                    </div>
                    {toast.score && (
                      <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim mt-0.5">
                        {toast.score}{toast.winner && ` — ${toast.winner} venceu`}
                      </div>
                    )}
                  </>
                )}
              </div>
            </Link>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
