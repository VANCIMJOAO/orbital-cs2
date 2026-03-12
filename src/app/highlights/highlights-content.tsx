"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, Swords, Play } from "lucide-react";
import Link from "next/link";
import { HudCard } from "@/components/hud-card";

interface HighlightClip {
  id: number;
  match_id: number;
  map_number: number;
  rank: number;
  player_name: string;
  steam_id: string;
  kills_count: number;
  score: number;
  description: string;
  round_number: number;
  video_file: string;
  thumbnail_file: string;
  duration_s: number;
  status: string;
  created_at: string;
  team1_string: string;
  team2_string: string;
}

const G5API_URL = "https://g5api-production-998f.up.railway.app";

export function HighlightsContent() {
  const [clips, setClips] = useState<HighlightClip[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClips = useCallback(async () => {
    try {
      const res = await fetch("/api/highlights/all?limit=30");
      const data = await res.json();
      setClips(data.clips || []);
    } catch {
      setClips([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClips();
  }, [fetchClips]);

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
              transition={{ delay: 0.05 * i }}
              className="bg-orbital-card border border-orbital-border overflow-hidden group hover:border-orbital-purple/30 transition-colors"
            >
              {/* Video with auto-generated thumbnail */}
              <VideoPlayer
                src={`${G5API_URL}/highlights-files/${clip.video_file}`}
                thumbnailSrc={clip.thumbnail_file ? `${G5API_URL}/highlights-files/${clip.thumbnail_file}` : undefined}
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
    </div>
  );
}

// Video player that seeks to 8s for a unique thumbnail frame per clip
function VideoPlayer({ src, thumbnailSrc }: { src: string; thumbnailSrc?: string }) {
  const [playing, setPlaying] = useState(false);
  const [thumbReady, setThumbReady] = useState(false);
  const thumbVideoRef = useRef<HTMLVideoElement>(null);

  // Seek the thumbnail video to 8s once it has enough data
  useEffect(() => {
    if (playing || thumbnailSrc) return;
    const video = thumbVideoRef.current;
    if (!video) return;

    const handleCanPlay = () => {
      video.currentTime = Math.min(8, video.duration * 0.4);
    };
    const handleSeeked = () => {
      video.pause();
      setThumbReady(true);
    };

    video.addEventListener("loadedmetadata", handleCanPlay);
    video.addEventListener("seeked", handleSeeked);

    return () => {
      video.removeEventListener("loadedmetadata", handleCanPlay);
      video.removeEventListener("seeked", handleSeeked);
    };
  }, [playing, thumbnailSrc, src]);

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
      {thumbnailSrc ? (
        <img src={thumbnailSrc} alt="" className="w-full h-full object-cover" />
      ) : (
        <>
          {/* Hidden video that loads and seeks to 8s for a unique frame */}
          <video
            ref={thumbVideoRef}
            muted
            playsInline
            preload="auto"
            className={`w-full h-full object-cover pointer-events-none ${thumbReady ? "" : "opacity-0"}`}
            src={src}
          />
          {!thumbReady && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 size={20} className="text-orbital-purple/40 animate-spin" />
            </div>
          )}
        </>
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
