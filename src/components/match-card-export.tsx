"use client";

import { useState, useCallback } from "react";
import { Share2, Download, Loader2 } from "lucide-react";
import type { Match, PlayerStats, MapStats, Team } from "@/lib/api";

interface MatchCardExportProps {
  match: Match;
  playerStats: PlayerStats[];
  mapStats: MapStats[];
  team1?: Team | null;
  team2?: Team | null;
}

export function MatchCardExport({ match, playerStats, mapStats, team1, team2 }: MatchCardExportProps) {
  const [loading, setLoading] = useState(false);

  const generateCard = useCallback(async (): Promise<string> => {
    const W = 1080;
    const H = 1080;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // Wait for fonts to load
    await document.fonts.ready;

    // Background
    ctx.fillStyle = "#0A0A0A";
    ctx.fillRect(0, 0, W, H);

    // Purple gradient top
    const topGrad = ctx.createLinearGradient(0, 0, W, 0);
    topGrad.addColorStop(0, "rgba(168,85,247,0.15)");
    topGrad.addColorStop(0.5, "rgba(168,85,247,0.05)");
    topGrad.addColorStop(1, "rgba(168,85,247,0.15)");
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, W, 200);

    // Grid lines (subtle)
    ctx.strokeStyle = "rgba(168,85,247,0.04)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Header: ORBITAL ROXA
    ctx.font = "700 14px 'Orbitron', monospace";
    ctx.fillStyle = "rgba(168,85,247,0.6)";
    ctx.textAlign = "center";
    ctx.fillText("ORBITAL ROXA", W / 2, 40);

    // Tournament/Season name
    const seasonName = match.season_id ? `CUP #${match.season_id}` : "PARTIDA";
    ctx.font = "800 11px 'Orbitron', monospace";
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillText(seasonName, W / 2, 60);

    // Map name
    const mapName = mapStats[0]?.map_name || "N/A";
    ctx.font = "700 16px 'Orbitron', monospace";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText(mapName.replace("de_", "").toUpperCase(), W / 2, 90);

    // Divider line
    ctx.strokeStyle = "rgba(168,85,247,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W * 0.15, 105);
    ctx.lineTo(W * 0.85, 105);
    ctx.stroke();

    // Team logos (if available)
    const loadImg = (url: string): Promise<HTMLImageElement> =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });

    // Team 1 logo
    const logoSize = 120;
    const logoY = 140;
    try {
      if (team1?.logo) {
        const img = await loadImg(team1.logo);
        ctx.drawImage(img, W / 2 - 250 - logoSize / 2, logoY, logoSize, logoSize);
      }
    } catch { /* no logo */ }

    // Team 2 logo
    try {
      if (team2?.logo) {
        const img = await loadImg(team2.logo);
        ctx.drawImage(img, W / 2 + 250 - logoSize / 2, logoY, logoSize, logoSize);
      }
    } catch { /* no logo */ }

    // Team names
    const t1Name = (team1?.name || match.team1_string || "Time 1").toUpperCase();
    const t2Name = (team2?.name || match.team2_string || "Time 2").toUpperCase();

    ctx.font = "800 22px 'Orbitron', monospace";
    ctx.textAlign = "center";

    // Team 1 name
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(t1Name.length > 14 ? t1Name.slice(0, 14) : t1Name, W / 2 - 250, logoY + logoSize + 35);

    // Team 2 name
    ctx.fillText(t2Name.length > 14 ? t2Name.slice(0, 14) : t2Name, W / 2 + 250, logoY + logoSize + 35);

    // Scores
    const isBO1 = mapStats.length <= 1;

    // If BO1, show round score; if BO3+, show map wins
    let displayScore1: number, displayScore2: number;
    if (isBO1) {
      displayScore1 = mapStats[0]?.team1_score || 0;
      displayScore2 = mapStats[0]?.team2_score || 0;
    } else {
      displayScore1 = mapStats.filter(m => (m.team1_score || 0) > (m.team2_score || 0)).length;
      displayScore2 = mapStats.filter(m => (m.team2_score || 0) > (m.team1_score || 0)).length;
    }

    // Winner highlight
    const winner = displayScore1 > displayScore2 ? 1 : displayScore1 < displayScore2 ? 2 : 0;

    // Score display
    ctx.font = "900 72px 'Orbitron', monospace";
    ctx.fillStyle = winner === 1 ? "#22C55E" : "rgba(255,255,255,0.6)";
    ctx.textAlign = "right";
    ctx.fillText(String(displayScore1), W / 2 - 30, 230);

    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "400 36px 'Orbitron', monospace";
    ctx.textAlign = "center";
    ctx.fillText("—", W / 2, 225);

    ctx.font = "900 72px 'Orbitron', monospace";
    ctx.fillStyle = winner === 2 ? "#22C55E" : "rgba(255,255,255,0.6)";
    ctx.textAlign = "left";
    ctx.fillText(String(displayScore2), W / 2 + 30, 230);

    // BO3 map scores
    if (!isBO1) {
      ctx.font = "600 13px 'JetBrains Mono', monospace";
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.textAlign = "center";
      const mapScoreStr = mapStats.map(m => `${m.team1_score}:${m.team2_score}`).join("  |  ");
      ctx.fillText(mapScoreStr, W / 2, 260);
    }

    // Divider
    const divY = isBO1 ? 280 : 290;
    ctx.strokeStyle = "rgba(168,85,247,0.2)";
    ctx.beginPath();
    ctx.moveTo(60, divY);
    ctx.lineTo(W - 60, divY);
    ctx.stroke();

    // Player stats table
    const statsY = divY + 30;

    // Get all stats sorted by rating (both teams mixed)
    const allStats = [...playerStats].sort((a, b) => (b.rating || 0) - (a.rating || 0));

    // Find MVP
    const mvp = allStats[0];

    // Draw stats header
    ctx.font = "700 10px 'Orbitron', monospace";
    ctx.fillStyle = "rgba(168,85,247,0.5)";
    ctx.textAlign = "left";
    const cols = { name: 80, kills: 420, deaths: 500, assists: 570, adr: 640, kdr: 720, hs: 800, rating: 900 };
    ctx.fillText("JOGADOR", cols.name, statsY);
    ctx.fillText("K", cols.kills, statsY);
    ctx.fillText("D", cols.deaths, statsY);
    ctx.fillText("A", cols.assists, statsY);
    ctx.fillText("ADR", cols.adr, statsY);
    ctx.fillText("K/D", cols.kdr, statsY);
    ctx.fillText("HS%", cols.hs, statsY);
    ctx.fillText("RATING", cols.rating, statsY);

    // Draw each player
    let rowY = statsY + 25;
    for (const ps of allStats.slice(0, 10)) {
      const isTeam1 = ps.team_id === match.team1_id;
      const isMvp = ps === mvp;

      // Team color dot
      ctx.fillStyle = isTeam1 ? "#A855F7" : "#F59E0B";
      ctx.beginPath();
      ctx.arc(65, rowY - 4, 4, 0, Math.PI * 2);
      ctx.fill();

      // MVP star
      if (isMvp) {
        ctx.fillStyle = "#FFD700";
        ctx.font = "14px sans-serif";
        ctx.fillText("★", 45, rowY);
      }

      // Player name
      ctx.font = isMvp ? "700 13px 'JetBrains Mono', monospace" : "400 13px 'JetBrains Mono', monospace";
      ctx.fillStyle = isMvp ? "#FFD700" : "#FFFFFF";
      ctx.textAlign = "left";
      const name = (ps.name || ps.steam_id).slice(0, 16);
      ctx.fillText(name, cols.name, rowY);

      // Stats
      ctx.font = "400 13px 'JetBrains Mono', monospace";
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillText(String(ps.kills), cols.kills, rowY);

      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillText(String(ps.deaths), cols.deaths, rowY);
      ctx.fillText(String(ps.assists), cols.assists, rowY);

      const adr = ps.roundsplayed > 0 ? Math.round(ps.damage / ps.roundsplayed) : 0;
      ctx.fillStyle = adr >= 80 ? "#22C55E" : "rgba(255,255,255,0.7)";
      ctx.fillText(String(adr), cols.adr, rowY);

      const kdr = ps.deaths > 0 ? (ps.kills / ps.deaths).toFixed(2) : ps.kills.toFixed(2);
      ctx.fillStyle = parseFloat(kdr) >= 1.0 ? "#22C55E" : "#EF4444";
      ctx.fillText(kdr, cols.kdr, rowY);

      const hsp = ps.kills > 0 ? Math.round((ps.headshot_kills / ps.kills) * 100) : 0;
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillText(`${hsp}%`, cols.hs, rowY);

      const rating = (ps.rating || 0).toFixed(2);
      ctx.fillStyle = parseFloat(rating) >= 1.15 ? "#A855F7" : parseFloat(rating) >= 1.0 ? "#22C55E" : "#EF4444";
      ctx.font = "700 13px 'JetBrains Mono', monospace";
      ctx.fillText(rating, cols.rating, rowY);

      rowY += 28;
    }

    // MVP Section
    if (mvp) {
      const mvpY = H - 130;
      ctx.strokeStyle = "rgba(168,85,247,0.2)";
      ctx.beginPath();
      ctx.moveTo(60, mvpY - 20);
      ctx.lineTo(W - 60, mvpY - 20);
      ctx.stroke();

      ctx.font = "700 10px 'Orbitron', monospace";
      ctx.fillStyle = "rgba(255,215,0,0.6)";
      ctx.textAlign = "center";
      ctx.fillText("★ MVP DA PARTIDA ★", W / 2, mvpY);

      ctx.font = "800 20px 'Orbitron', monospace";
      ctx.fillStyle = "#FFD700";
      ctx.fillText((mvp.name || mvp.steam_id).toUpperCase(), W / 2, mvpY + 30);

      const mvpAdr = mvp.roundsplayed > 0 ? Math.round(mvp.damage / mvp.roundsplayed) : 0;
      const mvpHsp = mvp.kills > 0 ? Math.round((mvp.headshot_kills / mvp.kills) * 100) : 0;
      ctx.font = "600 13px 'JetBrains Mono', monospace";
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillText(
        `${mvp.kills}K / ${mvp.deaths}D / ${mvp.assists}A  |  ADR ${mvpAdr}  |  HS ${mvpHsp}%  |  Rating ${(mvp.rating || 0).toFixed(2)}`,
        W / 2, mvpY + 55
      );
    }

    // Footer
    ctx.font = "600 11px 'JetBrains Mono', monospace";
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.textAlign = "center";
    ctx.fillText("orbitalroxa.com.br", W / 2, H - 25);

    // Corner accents
    const cornerLen = 20;
    ctx.strokeStyle = "rgba(168,85,247,0.4)";
    ctx.lineWidth = 2;
    // Top-left
    ctx.beginPath(); ctx.moveTo(10, 10 + cornerLen); ctx.lineTo(10, 10); ctx.lineTo(10 + cornerLen, 10); ctx.stroke();
    // Top-right
    ctx.beginPath(); ctx.moveTo(W - 10 - cornerLen, 10); ctx.lineTo(W - 10, 10); ctx.lineTo(W - 10, 10 + cornerLen); ctx.stroke();
    // Bottom-left
    ctx.beginPath(); ctx.moveTo(10, H - 10 - cornerLen); ctx.lineTo(10, H - 10); ctx.lineTo(10 + cornerLen, H - 10); ctx.stroke();
    // Bottom-right
    ctx.beginPath(); ctx.moveTo(W - 10 - cornerLen, H - 10); ctx.lineTo(W - 10, H - 10); ctx.lineTo(W - 10, H - 10 - cornerLen); ctx.stroke();

    return canvas.toDataURL("image/png");
  }, [match, playerStats, mapStats, team1, team2]);

  const handleExport = useCallback(async () => {
    setLoading(true);
    try {
      const dataUrl = await generateCard();
      const fileName = `${(match.team1_string || "team1").replace(/[^a-zA-Z0-9]/g, "_")}_vs_${(match.team2_string || "team2").replace(/[^a-zA-Z0-9]/g, "_")}_match${match.id}.png`;

      // Try native share on mobile
      if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
        try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], fileName, { type: "image/png" });
          await navigator.share({ files: [file], title: `${match.team1_string} vs ${match.team2_string}` });
          return;
        } catch { /* fallback to download */ }
      }

      // Download
      const link = document.createElement("a");
      link.download = fileName;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Erro ao gerar card:", err);
    } finally {
      setLoading(false);
    }
  }, [generateCard, match]);

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 text-orbital-purple font-[family-name:var(--font-jetbrains)] text-xs transition-colors disabled:opacity-40"
      aria-label="Compartilhar resultado"
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <Share2 size={12} />}
      <Download size={10} />
      CARD
    </button>
  );
}
