"use client";

import { useRef, useState, useCallback } from "react";
import { toPng } from "html-to-image";
import { Download } from "lucide-react";

export interface PlayerCardStats {
  kills: number;
  deaths: number;
  assists: number;
  wins: number;
  total_maps: number;
  mvp: number;
  kdr: number;
  hsp: number;
  avgRating: number;
  adr: number;
}

interface PlayerCardExportProps {
  steamId: string;
  displayName: string;
  stats: PlayerCardStats;
}

function getTierBadge(rating: number): { label: string; color: string; bg: string } {
  if (rating >= 1.30) return { label: "ELITE", color: "#FFD700", bg: "rgba(255,215,0,0.15)" };
  if (rating >= 1.15) return { label: "PRO", color: "#A855F7", bg: "rgba(168,85,247,0.15)" };
  if (rating >= 1.00) return { label: "SKILLED", color: "#22C55E", bg: "rgba(34,197,94,0.15)" };
  if (rating >= 0.85) return { label: "AVERAGE", color: "#F59E0B", bg: "rgba(245,158,11,0.15)" };
  return { label: "ROOKIE", color: "#EF4444", bg: "rgba(239,68,68,0.15)" };
}

function getRatingColor(rating: number): string {
  if (rating >= 1.20) return "#22C55E";
  if (rating >= 0.80) return "#EDEDED";
  return "#EF4444";
}

export function PlayerCardExport({ steamId, displayName, stats }: PlayerCardExportProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!cardRef.current || exporting) return;
    setExporting(true);

    try {
      // Generate PNG at 2x resolution
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
      });

      // Try Web Share API on mobile
      if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
        try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], `${displayName}-orbital-card.png`, { type: "image/png" });
          await navigator.share({
            title: `${displayName} - ORBITAL ROXA`,
            files: [file],
          });
          setExporting(false);
          return;
        } catch {
          // Fallback to download if share fails/cancels
        }
      }

      // Download fallback
      const link = document.createElement("a");
      link.download = `${displayName}-orbital-card.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Player card export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [displayName, exporting]);

  const tier = getTierBadge(stats.avgRating);
  const ratingColor = getRatingColor(stats.avgRating);
  const avatarUrl = `/api/steam/avatar-image/${steamId}`;

  return (
    <>
      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={exporting}
        className="inline-flex items-center gap-1.5 px-3 py-1 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 hover:bg-orbital-purple/20 transition-all font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-orbital-purple disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download size={11} />
        {exporting ? "GERANDO..." : "EXPORTAR CARD"}
      </button>

      {/* Hidden Card for Capture */}
      <div
        ref={cardRef}
        style={{
          position: "fixed",
          left: "-9999px",
          top: "0",
          width: "600px",
          height: "900px",
          backgroundColor: "#0A0A0A",
          fontFamily: "Arial, Helvetica, sans-serif",
          overflow: "hidden",
          zIndex: -1,
        }}
      >
        {/* Background Pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle at 50% 0%, rgba(168,85,247,0.08) 0%, transparent 60%), " +
              "radial-gradient(circle at 80% 100%, rgba(168,85,247,0.05) 0%, transparent 40%)",
          }}
        />

        {/* Border Frame */}
        <div
          style={{
            position: "absolute",
            inset: "8px",
            border: "1px solid rgba(168,85,247,0.25)",
            pointerEvents: "none",
          }}
        />

        {/* Corner Accents */}
        {[
          { top: "8px", left: "8px" },
          { top: "8px", right: "8px" },
          { bottom: "8px", left: "8px" },
          { bottom: "8px", right: "8px" },
        ].map((pos, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              ...pos,
              width: "20px",
              height: "20px",
              borderTop: pos.top ? "2px solid #A855F7" : "none",
              borderBottom: pos.bottom ? "2px solid #A855F7" : "none",
              borderLeft: pos.left === "8px" ? "2px solid #A855F7" : "none",
              borderRight: pos.right === "8px" ? "2px solid #A855F7" : "none",
            }}
          />
        ))}

        {/* Header - ORBITAL ROXA */}
        <div
          style={{
            position: "relative",
            textAlign: "center",
            paddingTop: "32px",
            paddingBottom: "8px",
          }}
        >
          <div
            style={{
              fontFamily: "'Orbitron', Arial, sans-serif",
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: "6px",
              color: "#A855F7",
              textTransform: "uppercase",
            }}
          >
            ORBITAL ROXA
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "9px",
              color: "rgba(237,237,237,0.4)",
              letterSpacing: "3px",
              marginTop: "4px",
            }}
          >
            CS2 PLAYER CARD
          </div>
        </div>

        {/* Avatar Section */}
        <div
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "center",
            paddingTop: "20px",
            paddingBottom: "16px",
          }}
        >
          {/* Glow Rings */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "180px",
              height: "180px",
              borderRadius: "50%",
              border: "1px solid rgba(168,85,247,0.1)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "160px",
              height: "160px",
              borderRadius: "50%",
              border: "1px solid rgba(168,85,247,0.2)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "200px",
              height: "200px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)",
            }}
          />

          {/* Avatar Image */}
          <div
            style={{
              width: "130px",
              height: "130px",
              borderRadius: "50%",
              border: "3px solid rgba(168,85,247,0.6)",
              overflow: "hidden",
              position: "relative",
              boxShadow: "0 0 30px rgba(168,85,247,0.3), 0 0 60px rgba(168,85,247,0.1)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl}
              alt={displayName}
              width={130}
              height={130}
              style={{
                width: "130px",
                height: "130px",
                objectFit: "cover",
                display: "block",
              }}
              crossOrigin="anonymous"
            />
          </div>
        </div>

        {/* Player Name */}
        <div
          style={{
            textAlign: "center",
            padding: "0 40px",
          }}
        >
          <div
            style={{
              fontFamily: "'Orbitron', Arial, sans-serif",
              fontSize: "26px",
              fontWeight: 700,
              color: "#EDEDED",
              letterSpacing: "3px",
              textTransform: "uppercase",
              lineHeight: 1.2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {displayName}
          </div>
        </div>

        {/* Rating Section */}
        <div
          style={{
            textAlign: "center",
            paddingTop: "24px",
            paddingBottom: "8px",
          }}
        >
          <div
            style={{
              fontFamily: "'Orbitron', Arial, sans-serif",
              fontSize: "72px",
              fontWeight: 700,
              color: ratingColor,
              lineHeight: 1,
              letterSpacing: "2px",
              textShadow: `0 0 40px ${ratingColor}33`,
            }}
          >
            {stats.avgRating.toFixed(2)}
          </div>
          <div
            style={{
              display: "inline-block",
              marginTop: "8px",
              padding: "4px 16px",
              backgroundColor: tier.bg,
              border: `1px solid ${tier.color}40`,
              fontFamily: "'Orbitron', Arial, sans-serif",
              fontSize: "11px",
              fontWeight: 700,
              color: tier.color,
              letterSpacing: "4px",
            }}
          >
            {tier.label}
          </div>
        </div>

        {/* Separator */}
        <div
          style={{
            margin: "20px 40px",
            height: "1px",
            background: "linear-gradient(90deg, transparent, rgba(168,85,247,0.3), transparent)",
          }}
        />

        {/* Stats Grid - 2 columns x 3 rows */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px 20px",
            padding: "0 50px",
          }}
        >
          {[
            { label: "K/D", value: stats.kdr.toFixed(2), color: stats.kdr >= 1.0 ? "#22C55E" : "#EF4444" },
            { label: "HS%", value: `${Math.round(stats.hsp)}%`, color: stats.hsp >= 50 ? "#22C55E" : "#EDEDED" },
            { label: "KILLS", value: stats.kills.toLocaleString(), color: "#EDEDED" },
            { label: "DEATHS", value: stats.deaths.toLocaleString(), color: "#EDEDED" },
            { label: "WINS", value: stats.wins.toString(), color: "#22C55E" },
            { label: "ADR", value: stats.adr.toString(), color: stats.adr >= 80 ? "#22C55E" : "#EDEDED" },
          ].map((stat, i) => (
            <div
              key={i}
              style={{
                backgroundColor: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(168,85,247,0.12)",
                padding: "14px 16px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "9px",
                  color: "rgba(237,237,237,0.4)",
                  letterSpacing: "2px",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                }}
              >
                {stat.label}
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "22px",
                  fontWeight: 700,
                  color: stat.color,
                  lineHeight: 1,
                }}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            left: 0,
            right: 0,
            textAlign: "center",
          }}
        >
          <div
            style={{
              margin: "0 40px 12px",
              height: "1px",
              background: "linear-gradient(90deg, transparent, rgba(168,85,247,0.2), transparent)",
            }}
          />
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "10px",
              color: "rgba(168,85,247,0.5)",
              letterSpacing: "3px",
            }}
          >
            orbitalroxa.com.br
          </div>
        </div>
      </div>
    </>
  );
}
