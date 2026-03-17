"use client";

import { useState, useCallback } from "react";
import { Download, Loader2 } from "lucide-react";

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

function getTierBadge(rating: number) {
  if (rating >= 1.30) return { label: "ELITE", color: "#FFD700" };
  if (rating >= 1.15) return { label: "PRO", color: "#A855F7" };
  if (rating >= 1.00) return { label: "SKILLED", color: "#22C55E" };
  if (rating >= 0.85) return { label: "AVERAGE", color: "#F59E0B" };
  return { label: "ROOKIE", color: "#EF4444" };
}

function getRatingColor(rating: number) {
  if (rating >= 1.20) return "#22C55E";
  if (rating >= 0.80) return "#E2E8F0";
  return "#EF4444";
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = src;
  });
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawSpacedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  const align = ctx.textAlign;
  if (align === "center") {
    const totalW = Array.from(text).reduce((w, c) => w + ctx.measureText(c).width + spacing, -spacing);
    x -= totalW / 2;
  } else if (align === "right") {
    const totalW = Array.from(text).reduce((w, c) => w + ctx.measureText(c).width + spacing, -spacing);
    x -= totalW;
  }
  const savedAlign = ctx.textAlign;
  ctx.textAlign = "left";
  for (const char of text) {
    ctx.fillText(char, x, y);
    x += ctx.measureText(char).width + spacing;
  }
  ctx.textAlign = savedAlign;
}

async function generateCard(
  displayName: string,
  steamId: string,
  stats: PlayerCardStats,
): Promise<string> {
  const W = 600;
  const H = 900;
  const canvas = document.createElement("canvas");
  canvas.width = W * 2; // 2x for retina
  canvas.height = H * 2;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(2, 2);

  const purple = "#A855F7";
  const bg = "#0A0A0A";
  const cardBg = "#111111";
  const textMain = "#E2E8F0";
  const textDim = "#64748B";
  const tier = getTierBadge(stats.avgRating);
  const rc = getRatingColor(stats.avgRating);

  // ── Background ──
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Grid pattern
  ctx.strokeStyle = "rgba(168,85,247,0.04)";
  ctx.lineWidth = 0.5;
  for (let x = 0; x < W; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Top accent line
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, "transparent");
  grad.addColorStop(0.3, purple);
  grad.addColorStop(0.7, "#C084FC");
  grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 3);

  // Border
  ctx.strokeStyle = "rgba(168,85,247,0.25)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

  // Corner brackets
  const cs = 24;
  ctx.strokeStyle = purple;
  ctx.lineWidth = 2;
  // Top-left
  ctx.beginPath(); ctx.moveTo(0, cs); ctx.lineTo(0, 0); ctx.lineTo(cs, 0); ctx.stroke();
  // Top-right
  ctx.beginPath(); ctx.moveTo(W - cs, 0); ctx.lineTo(W, 0); ctx.lineTo(W, cs); ctx.stroke();
  // Bottom-left
  ctx.beginPath(); ctx.moveTo(0, H - cs); ctx.lineTo(0, H); ctx.lineTo(cs, H); ctx.stroke();
  // Bottom-right
  ctx.beginPath(); ctx.moveTo(W - cs, H); ctx.lineTo(W, H); ctx.lineTo(W, H - cs); ctx.stroke();

  // ── Header bar ──
  ctx.fillStyle = "rgba(168,85,247,0.04)";
  ctx.fillRect(0, 3, W, 42);
  ctx.strokeStyle = "rgba(168,85,247,0.2)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 45); ctx.lineTo(W, 45); ctx.stroke();

  ctx.font = "800 11px Orbitron, monospace";
  ctx.fillStyle = purple;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  drawSpacedText(ctx, "ORBITAL ROXA", 24, 24, 3);

  ctx.font = "400 8px Orbitron, monospace";
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.textAlign = "right";
  drawSpacedText(ctx, "PLAYER CARD", W - 24, 24, 2);
  ctx.textAlign = "left";

  // ── Avatar ──
  let avatarY = 95;
  const avatarSize = 120;
  const avatarCX = W / 2;
  const avatarCY = avatarY + avatarSize / 2;

  // Glow
  const glowGrad = ctx.createRadialGradient(avatarCX, avatarCY, avatarSize / 2, avatarCX, avatarCY, avatarSize);
  glowGrad.addColorStop(0, "rgba(168,85,247,0.2)");
  glowGrad.addColorStop(1, "transparent");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(avatarCX - avatarSize, avatarCY - avatarSize, avatarSize * 2, avatarSize * 2);

  // Purple rings
  ctx.strokeStyle = "rgba(168,85,247,0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(avatarCX, avatarCY, avatarSize / 2 + 12, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = "rgba(168,85,247,0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(avatarCX, avatarCY, avatarSize / 2 + 4, 0, Math.PI * 2); ctx.stroke();

  // Avatar image
  try {
    const avatarImg = await loadImage(`/api/steam/avatar-image/${steamId}`);
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarCX, avatarCY, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatarImg, avatarCX - avatarSize / 2, avatarCY - avatarSize / 2, avatarSize, avatarSize);
    ctx.restore();
  } catch {
    // Fallback circle
    ctx.fillStyle = "#1A1A1A";
    ctx.beginPath();
    ctx.arc(avatarCX, avatarCY, avatarSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "800 36px Orbitron, monospace";
    ctx.fillStyle = textDim;
    ctx.textAlign = "center";
    ctx.fillText(displayName.charAt(0).toUpperCase(), avatarCX, avatarCY + 12);
    ctx.textAlign = "left";
  }

  // ── Player name ──
  let nameY = avatarY + avatarSize + 30;
  ctx.font = "800 24px Orbitron, monospace";
  ctx.fillStyle = textMain;
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(168,85,247,0.25)";
  ctx.shadowBlur = 20;
  ctx.fillText(displayName.toUpperCase(), W / 2, nameY);
  ctx.shadowBlur = 0;

  // Sub-label
  ctx.font = "400 10px 'JetBrains Mono', monospace";
  ctx.fillStyle = textDim;
  drawSpacedText(ctx, "CS2 PLAYER", W / 2, nameY + 20, 2);

  // ── Rating ──
  let ratingY = nameY + 55;
  ctx.font = "400 9px Orbitron, monospace";
  ctx.fillStyle = textDim;
  drawSpacedText(ctx, "RATING GERAL", W / 2, ratingY, 3);

  ctx.font = "900 42px Orbitron, monospace";
  ctx.fillStyle = rc;
  ctx.shadowColor = rc + "55";
  ctx.shadowBlur = 25;
  ctx.fillText(stats.avgRating > 0 ? stats.avgRating.toFixed(2) : "—", W / 2, ratingY + 40);
  ctx.shadowBlur = 0;

  // Tier badge
  const tierY = ratingY + 60;
  const tierText = tier.label;
  ctx.font = "700 9px Orbitron, monospace";
  // Measure with spacing
  const tierCharW = Array.from(tierText).reduce((w, c) => w + ctx.measureText(c).width + 2, -2);
  const tierW = tierCharW + 24;
  ctx.fillStyle = tier.color + "15";
  ctx.fillRect(W / 2 - tierW / 2, tierY - 8, tierW, 20);
  ctx.strokeStyle = tier.color + "55";
  ctx.lineWidth = 1;
  ctx.strokeRect(W / 2 - tierW / 2, tierY - 8, tierW, 20);
  ctx.fillStyle = tier.color;
  drawSpacedText(ctx, tierText, W / 2, tierY + 6, 2);

  // ── Separator ──
  let sepY = tierY + 30;
  const sepGrad = ctx.createLinearGradient(40, sepY, W - 40, sepY);
  sepGrad.addColorStop(0, "transparent");
  sepGrad.addColorStop(0.5, "rgba(168,85,247,0.3)");
  sepGrad.addColorStop(1, "transparent");
  ctx.fillStyle = sepGrad;
  ctx.fillRect(40, sepY, W - 80, 1);

  ctx.font = "400 8px Orbitron, monospace";
  ctx.fillStyle = purple;
  drawSpacedText(ctx, "ESTATÍSTICAS", W / 2, sepY + 16, 3);

  // ── Stats grid ──
  ctx.textAlign = "center";
  const gridY = sepY + 35;
  const cellW = 240;
  const cellH = 70;
  const gap = 12;
  const gridX = (W - cellW * 2 - gap) / 2;

  const statItems = [
    { label: "K / D", value: stats.kdr.toFixed(2), color: stats.kdr >= 1.0 ? "#22C55E" : "#EF4444" },
    { label: "HS %", value: `${Math.round(stats.hsp)}%`, color: purple },
    { label: "KILLS", value: stats.kills.toLocaleString("pt-BR"), color: textMain },
    { label: "DEATHS", value: stats.deaths.toLocaleString("pt-BR"), color: "#EF4444" },
    { label: "VITÓRIAS", value: stats.wins.toString(), color: "#22C55E" },
    { label: "ADR", value: stats.adr.toString(), color: "#F59E0B" },
  ];

  for (let i = 0; i < statItems.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = gridX + col * (cellW + gap);
    const y = gridY + row * (cellH + gap);
    const s = statItems[i];

    // Cell bg
    ctx.fillStyle = "rgba(255,255,255,0.02)";
    ctx.fillRect(x, y, cellW, cellH);
    ctx.strokeStyle = "rgba(168,85,247,0.12)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, cellW, cellH);

    // Top accent micro-line
    const microGrad = ctx.createLinearGradient(x + cellW * 0.2, y, x + cellW * 0.8, y);
    microGrad.addColorStop(0, "transparent");
    microGrad.addColorStop(0.5, "rgba(168,85,247,0.4)");
    microGrad.addColorStop(1, "transparent");
    ctx.fillStyle = microGrad;
    ctx.fillRect(x + cellW * 0.2, y, cellW * 0.6, 1);

    // Label
    ctx.font = "400 9px 'JetBrains Mono', monospace";
    ctx.fillStyle = "rgba(237,237,237,0.4)";
    drawSpacedText(ctx, s.label, x + cellW / 2, y + 22, 2);

    // Value
    ctx.font = "700 26px 'JetBrains Mono', monospace";
    ctx.fillStyle = s.color;
    ctx.fillText(s.value, x + cellW / 2, y + 52);
  }

  // ── Secondary stats ──
  const secY = gridY + 3 * (cellH + gap) + 10;
  ctx.strokeStyle = "rgba(168,85,247,0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(32, secY); ctx.lineTo(W - 32, secY); ctx.stroke();

  const secItems = [
    { label: "ASSISTS", value: stats.assists.toLocaleString("pt-BR") },
    { label: "MVPs", value: stats.mvp.toString() },
    { label: "MAPAS", value: stats.total_maps.toString() },
  ];
  const secSpacing = W / (secItems.length + 1);
  for (let i = 0; i < secItems.length; i++) {
    const x = secSpacing * (i + 1);
    ctx.font = "700 18px 'JetBrains Mono', monospace";
    ctx.fillStyle = textMain;
    ctx.fillText(secItems[i].value, x, secY + 28);
    ctx.font = "400 7px Orbitron, monospace";
    ctx.fillStyle = textDim;
    drawSpacedText(ctx, secItems[i].label, x, secY + 42, 2);
  }

  // ── Footer ──
  ctx.strokeStyle = "rgba(168,85,247,0.15)";
  ctx.beginPath(); ctx.moveTo(0, H - 48); ctx.lineTo(W, H - 48); ctx.stroke();
  ctx.fillStyle = "rgba(168,85,247,0.03)";
  ctx.fillRect(0, H - 48, W, 48);

  ctx.font = "400 10px 'JetBrains Mono', monospace";
  ctx.fillStyle = "rgba(168,85,247,0.5)";
  drawSpacedText(ctx, "orbitalroxa.com.br", W / 2, H - 22, 1);

  ctx.textAlign = "left";

  return canvas.toDataURL("image/png");
}

export function PlayerCardExport({ steamId, displayName, stats }: PlayerCardExportProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (exporting) return;
    setExporting(true);

    try {
      const dataUrl = await generateCard(displayName, steamId, stats);

      const fileName = `${displayName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}_orbital_card.png`;

      if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
        try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], fileName, { type: "image/png" });
          await navigator.share({ files: [file], title: `${displayName} - ORBITAL ROXA` });
          return;
        } catch { /* fall through */ }
      }

      const link = document.createElement("a");
      link.download = fileName;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Player card export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [displayName, exporting, stats, steamId]);

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="inline-flex items-center gap-1.5 px-3 py-1 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 hover:bg-orbital-purple/20 transition-all font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-orbital-purple disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {exporting ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
      {exporting ? "GERANDO..." : "EXPORTAR CARD"}
    </button>
  );
}
