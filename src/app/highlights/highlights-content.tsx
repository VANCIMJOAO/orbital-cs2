"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, Swords, Play } from "lucide-react";
import Link from "next/link";
import { HudCard } from "@/components/hud-card";
import type { HighlightClip } from "@/lib/api";

export function HighlightsContent() {
  const [clips, setClips] = useState<HighlightClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 30;

  const fetchClips = useCallback(async (offset = 0, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const res = await fetch(`/api/highlights/all?limit=${PAGE_SIZE}&offset=${offset}`);
      const data = await res.json();
      const newClips = data.clips || [];
      if (append) {
        setClips(prev => [...prev, ...newClips]);
      } else {
        setClips(newClips);
      }
      setHasMore(newClips.length >= PAGE_SIZE);
    } catch {
      if (!append) setClips([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchClips();
  }, [fetchClips]);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchClips(clips.length, true);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 pt-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <Sparkles size={18} className="text-orbital-purple" />
          <h1 className="font-[family-name:var(--font-orbitron)] text-sm tracking-[0.3em] text-orbital-text">
            HIGHLIGHTS
          </h1>
        </div>
        <div className="h-[1px] bg-gradient-to-r from-orbital-purple/50 to-transparent mb-2" />
        <p className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">
          Melhores momentos de todas as partidas
        </p>
      </motion.div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="text-orbital-purple animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && clips.length === 0 && (
        <HudCard className="text-center py-12">
          <Sparkles size={24} className="text-orbital-border mx-auto mb-3" />
          <p className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] text-orbital-text-dim">
            Nenhum highlight disponível ainda
          </p>
        </HudCard>
      )}

      {/* Clips grid */}
      {!loading && clips.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {clips.map((clip, i) => (
            <motion.div
              key={clip.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i < PAGE_SIZE ? 0.05 * i : 0 }}
              className="bg-orbital-card border border-orbital-border overflow-hidden group hover:border-orbital-purple/30 transition-colors"
            >
              {/* Video with auto-generated thumbnail (ignore server thumb — it's the same generic intro for all clips) */}
              <VideoPlayer
                src={`/api/highlights-proxy/${clip.video_file}`}
                clipId={clip.id}
              />

              {/* Info bar */}
              <div className="p-2.5">
                {/* Player + kills */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] text-orbital-purple shrink-0">
                    #{clip.rank}
                  </span>
                  <Link
                    href={`/perfil/${clip.steam_id}`}
                    className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text hover:text-orbital-purple transition-colors truncate"
                  >
                    {clip.player_name || "Player"}
                  </Link>
                  {clip.kills_count >= 2 && (
                    <span className="font-[family-name:var(--font-orbitron)] text-[0.45rem] text-orbital-purple bg-orbital-purple/10 px-1.5 py-0.5 shrink-0">
                      {clip.kills_count >= 5 ? "ACE" : `${clip.kills_count}K`}
                    </span>
                  )}
                  {clip.round_number && (
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.45rem] text-orbital-text-dim shrink-0 ml-auto">
                      R{clip.round_number}
                    </span>
                  )}
                </div>

                {/* Match link */}
                <Link
                  href={`/partidas/${clip.match_id}`}
                  className="flex items-center gap-1.5 group/match"
                >
                  <Swords size={9} className="text-orbital-text-dim group-hover/match:text-orbital-purple transition-colors shrink-0" />
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim group-hover/match:text-orbital-purple transition-colors truncate">
                    {clip.team1_string || "Time 1"} vs {clip.team2_string || "Time 2"}
                  </span>
                </Link>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Load more */}
      {!loading && hasMore && clips.length > 0 && (
        <div className="mt-8 text-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 hover:bg-orbital-purple/20 transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-purple disabled:opacity-50"
          >
            {loadingMore ? <Loader2 size={14} className="animate-spin" /> : null}
            {loadingMore ? "CARREGANDO..." : "CARREGAR MAIS"}
          </button>
        </div>
      )}

      {/* Total count */}
      {!loading && clips.length > 0 && (
        <div className="mt-4 text-center">
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
            {clips.length} highlight{clips.length !== 1 ? "s" : ""} carregado{clips.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}
    </div>
  );
}

// Video player with unique thumbnail per clip
function VideoPlayer({ src, clipId }: { src: string; clipId: number }) {
  const [playing, setPlaying] = useState(false);
  const [thumbReady, setThumbReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Each clip gets a slightly different seek time so thumbnails are unique
  const seekTime = 12 + (clipId % 5);

  useEffect(() => {
    if (playing) return;
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;

    const onLoadedData = () => {
      if (cancelled) return;
      video.currentTime = Math.min(seekTime, video.duration * 0.5);
    };

    const onSeeked = () => {
      if (cancelled) return;
      setThumbReady(true);
    };

    // Try to trigger seek if video already has data
    if (video.readyState >= 2) {
      video.currentTime = Math.min(seekTime, video.duration * 0.5);
    }

    video.addEventListener("loadeddata", onLoadedData);
    video.addEventListener("seeked", onSeeked);

    return () => {
      cancelled = true;
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("seeked", onSeeked);
    };
  }, [playing, src, seekTime]);

  if (playing) {
    return (
      <video
        controls
        autoPlay
        className="w-full aspect-video bg-black"
      >
        <source src={src} type="video/mp4" />
      </video>
    );
  }

  return (
    <div
      onClick={() => setPlaying(true)}
      className="relative w-full aspect-video bg-black group/play cursor-pointer overflow-hidden"
    >
      <video
        ref={videoRef}
        muted
        playsInline
        preload="auto"
        crossOrigin="anonymous"
        className={`w-full h-full object-cover pointer-events-none ${thumbReady ? "" : "opacity-0"}`}
        src={`${src}#t=${seekTime}`}
      />
      {!thumbReady && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 size={20} className="text-orbital-purple/40 animate-spin" />
        </div>
      )}
      {/* Play overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover/play:bg-black/10 transition-colors">
        <div className="w-12 h-12 rounded-full bg-orbital-purple/80 flex items-center justify-center group-hover/play:bg-orbital-purple group-hover/play:scale-110 transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)]">
          <Play size={20} className="text-white ml-0.5" fill="white" />
        </div>
      </div>
    </div>
  );
}
