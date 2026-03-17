"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Loader2 } from "lucide-react";

interface VideoPlayerProps {
  src: string;
  clipId: number;
}

export function VideoPlayer({ src, clipId }: VideoPlayerProps) {
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
        preload="metadata"
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
