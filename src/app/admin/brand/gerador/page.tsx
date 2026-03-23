"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Download, Trophy, User, BarChart3, Calendar, Megaphone, Loader2, RefreshCw } from "lucide-react";
import { Match, Team, LeaderboardEntry, PlayerStats, MapStats, getStatusType, parseMapStats } from "@/lib/api";

type TemplateType = "resultado" | "spotlight" | "top5" | "stat" | "countdown" | "anuncio";

const TEMPLATES: { id: TemplateType; label: string; icon: typeof Trophy; desc: string }[] = [
  { id: "resultado", label: "RESULTADO", icon: Trophy, desc: "Score da partida com times e MVP" },
  { id: "spotlight", label: "PLAYER SPOTLIGHT", icon: User, desc: "Destaque de jogador com stats" },
  { id: "top5", label: "TOP 5", icon: BarChart3, desc: "Ranking dos melhores jogadores" },
  { id: "stat", label: "STAT DO DIA", icon: BarChart3, desc: "Estatística curiosa em destaque" },
  { id: "countdown", label: "COUNTDOWN", icon: Calendar, desc: "Contagem regressiva pro evento" },
  { id: "anuncio", label: "ANÚNCIO", icon: Megaphone, desc: "Texto livre com estilo ORBITAL" },
];

const W = 1080, H = 1080;

export default function GeradorPage() {
  const [template, setTemplate] = useState<TemplateType>("resultado");
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Template-specific state
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [countdownDate, setCountdownDate] = useState("2026-05-15");
  const [countdownTitle, setCountdownTitle] = useState("ORBITAL ROXA CUP #2");
  const [anuncioTitle, setAnuncioTitle] = useState("");
  const [anuncioSubtitle, setAnuncioSubtitle] = useState("");
  const [statTitle, setStatTitle] = useState("");
  const [statValue, setStatValue] = useState("");
  const [statDesc, setStatDesc] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [mRes, tRes, lRes] = await Promise.all([
        fetch("/api/matches", { credentials: "include" }).then(r => r.json()).catch(() => ({ matches: [] })),
        fetch("/api/teams", { credentials: "include" }).then(r => r.json()).catch(() => ({ teams: [] })),
        fetch("/api/leaderboard/players", { credentials: "include" }).then(r => r.json()).catch(() => ({ leaderboard: [] })),
      ]);
      setMatches((mRes.matches || []).filter((m: Match) => getStatusType(m) === "finished"));
      setTeams(tRes.teams || []);
      setLeaderboard(lRes.leaderboard || lRes || []);
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ═══ CANVAS DRAWING ═══

  const drawBackground = (ctx: CanvasRenderingContext2D) => {
    // Dark gradient background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#0A0A0A");
    grad.addColorStop(0.5, "#0F0A15");
    grad.addColorStop(1, "#0A0A0A");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Grid lines (subtle)
    ctx.strokeStyle = "rgba(168, 85, 247, 0.04)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Corner accents
    ctx.strokeStyle = "#A855F7";
    ctx.lineWidth = 2;
    const L = 40;
    // Top-left
    ctx.beginPath(); ctx.moveTo(20, 20 + L); ctx.lineTo(20, 20); ctx.lineTo(20 + L, 20); ctx.stroke();
    // Top-right
    ctx.beginPath(); ctx.moveTo(W - 20 - L, 20); ctx.lineTo(W - 20, 20); ctx.lineTo(W - 20, 20 + L); ctx.stroke();
    // Bottom-left
    ctx.beginPath(); ctx.moveTo(20, H - 20 - L); ctx.lineTo(20, H - 20); ctx.lineTo(20 + L, H - 20); ctx.stroke();
    // Bottom-right
    ctx.beginPath(); ctx.moveTo(W - 20 - L, H - 20); ctx.lineTo(W - 20, H - 20); ctx.lineTo(W - 20, H - 20 - L); ctx.stroke();
  };

  const drawBranding = (ctx: CanvasRenderingContext2D) => {
    // Bottom bar
    ctx.fillStyle = "rgba(168, 85, 247, 0.1)";
    ctx.fillRect(0, H - 60, W, 60);
    ctx.fillStyle = "#A855F7";
    ctx.fillRect(0, H - 62, W, 2);

    ctx.font = "bold 16px 'Orbitron', monospace";
    ctx.fillStyle = "#A855F7";
    ctx.textAlign = "center";
    ctx.fillText("ORBITAL ROXA", W / 2, H - 28);

    ctx.font = "12px 'JetBrains Mono', monospace";
    ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
    ctx.fillText("orbitalroxa.com.br  |  @orbitalroxa.gg", W / 2, H - 12);
  };

  const drawResultado = async (ctx: CanvasRenderingContext2D) => {
    if (!selectedMatch) return;
    const match = matches.find(m => m.id === selectedMatch);
    if (!match) return;

    // Fetch map stats
    let mapStats: MapStats[] = [];
    try {
      const res = await fetch(`/api/mapstats/${match.id}`);
      if (res.ok) {
        const d = await res.json();
        mapStats = Array.isArray(d) ? d : parseMapStats(d as Record<string, unknown>) as MapStats[];
      }
    } catch { /* */ }

    // Fetch player stats for MVP
    let mvpName = "", mvpKills = 0, mvpRating = 0;
    try {
      const res = await fetch(`/api/playerstats/match/${match.id}`);
      if (res.ok) {
        const d = await res.json();
        const stats: PlayerStats[] = d.playerstats || d.playerStats || d || [];
        if (stats.length > 0) {
          const best = stats.reduce((a, b) => ((b.kills / Math.max(1, b.deaths)) > (a.kills / Math.max(1, a.deaths)) ? b : a));
          mvpName = best.name;
          mvpKills = best.kills;
          mvpRating = best.kills / Math.max(1, best.deaths);
        }
      }
    } catch { /* */ }

    drawBackground(ctx);

    // Header
    ctx.font = "bold 18px 'Orbitron', monospace";
    ctx.fillStyle = "#A855F7";
    ctx.textAlign = "center";
    ctx.fillText("RESULTADO", W / 2, 80);

    // Purple line
    ctx.fillStyle = "#A855F7";
    ctx.fillRect(W / 2 - 60, 90, 120, 2);

    // Teams
    const t1 = teams.find(t => t.id === match.team1_id);
    const t2 = teams.find(t => t.id === match.team2_id);

    ctx.font = "bold 36px 'Orbitron', monospace";
    ctx.fillStyle = "#E2E8F0";
    ctx.textAlign = "right";
    ctx.fillText(match.team1_string || t1?.name || "Time 1", W / 2 - 80, 280);

    ctx.textAlign = "left";
    ctx.fillText(match.team2_string || t2?.name || "Time 2", W / 2 + 80, 280);

    // Score
    ctx.font = "bold 120px 'Orbitron', monospace";
    ctx.textAlign = "center";
    const winner = match.team1_score > match.team2_score ? 1 : 2;
    ctx.fillStyle = winner === 1 ? "#22C55E" : "#E2E8F0";
    ctx.textAlign = "right";
    ctx.fillText(String(match.team1_score), W / 2 - 30, 460);

    ctx.fillStyle = "rgba(148, 163, 184, 0.3)";
    ctx.textAlign = "center";
    ctx.font = "bold 60px 'Orbitron', monospace";
    ctx.fillText(":", W / 2, 440);

    ctx.font = "bold 120px 'Orbitron', monospace";
    ctx.fillStyle = winner === 2 ? "#22C55E" : "#E2E8F0";
    ctx.textAlign = "left";
    ctx.fillText(String(match.team2_score), W / 2 + 30, 460);

    // Map scores
    if (mapStats.length > 0) {
      ctx.font = "16px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      let y = 520;
      for (const ms of mapStats) {
        const mapName = (ms.map_name || "").replace("de_", "").charAt(0).toUpperCase() + (ms.map_name || "").replace("de_", "").slice(1);
        ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
        ctx.fillText(`${mapName}  ${ms.team1_score} - ${ms.team2_score}`, W / 2, y);
        y += 30;
      }
    }

    // MVP
    if (mvpName) {
      ctx.fillStyle = "rgba(168, 85, 247, 0.1)";
      ctx.fillRect(W / 2 - 200, 680, 400, 80);
      ctx.strokeStyle = "rgba(168, 85, 247, 0.3)";
      ctx.strokeRect(W / 2 - 200, 680, 400, 80);

      ctx.font = "12px 'Orbitron', monospace";
      ctx.fillStyle = "#A855F7";
      ctx.textAlign = "center";
      ctx.fillText("MVP", W / 2, 710);

      ctx.font = "bold 24px 'Orbitron', monospace";
      ctx.fillStyle = "#E2E8F0";
      ctx.fillText(mvpName, W / 2, 740);

      ctx.font = "14px 'JetBrains Mono', monospace";
      ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
      ctx.fillText(`${mvpKills} kills  |  ${mvpRating.toFixed(2)} K/D`, W / 2, 760);
    }

    // Status badge
    ctx.fillStyle = "#22C55E";
    ctx.font = "bold 14px 'Orbitron', monospace";
    ctx.textAlign = "center";
    ctx.fillText("FINALIZADO", W / 2, 860);

    drawBranding(ctx);
  };

  const drawSpotlight = (ctx: CanvasRenderingContext2D) => {
    const entry = (Array.isArray(leaderboard) ? leaderboard : []).find(
      (e: LeaderboardEntry) => (e.steamId || (e as unknown as { steam_id: string }).steam_id) === selectedPlayer
    );
    if (!entry) return;

    drawBackground(ctx);

    // Header
    ctx.font = "bold 16px 'Orbitron', monospace";
    ctx.fillStyle = "#A855F7";
    ctx.textAlign = "center";
    ctx.fillText("PLAYER SPOTLIGHT", W / 2, 80);
    ctx.fillRect(W / 2 - 80, 90, 160, 2);

    // Player name
    ctx.font = "bold 48px 'Orbitron', monospace";
    ctx.fillStyle = "#E2E8F0";
    ctx.fillText(entry.name, W / 2, 280);

    // Stats grid
    const stats = [
      { label: "RATING", value: (entry.average_rating || 0).toFixed(2) },
      { label: "K/D", value: entry.deaths > 0 ? (entry.kills / entry.deaths).toFixed(2) : entry.kills.toFixed(0) },
      { label: "HS%", value: `${entry.hsp || 0}%` },
      { label: "KILLS", value: String(entry.kills) },
      { label: "WINS", value: String(entry.wins) },
      { label: "MAPS", value: String(entry.total_maps) },
    ];

    const cols = 3, rows = 2;
    const boxW = 260, boxH = 120, startX = (W - cols * boxW - (cols - 1) * 20) / 2, startY = 380;

    for (let i = 0; i < stats.length; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      const x = startX + col * (boxW + 20), y = startY + row * (boxH + 20);

      ctx.fillStyle = "rgba(168, 85, 247, 0.05)";
      ctx.fillRect(x, y, boxW, boxH);
      ctx.strokeStyle = "rgba(168, 85, 247, 0.2)";
      ctx.strokeRect(x, y, boxW, boxH);

      ctx.font = "bold 36px 'Orbitron', monospace";
      ctx.fillStyle = "#A855F7";
      ctx.textAlign = "center";
      ctx.fillText(stats[i].value, x + boxW / 2, y + 55);

      ctx.font = "12px 'Orbitron', monospace";
      ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
      ctx.fillText(stats[i].label, x + boxW / 2, y + 85);
    }

    drawBranding(ctx);
  };

  const drawTop5 = (ctx: CanvasRenderingContext2D) => {
    drawBackground(ctx);

    ctx.font = "bold 18px 'Orbitron', monospace";
    ctx.fillStyle = "#A855F7";
    ctx.textAlign = "center";
    ctx.fillText("TOP 5 JOGADORES", W / 2, 80);
    ctx.fillRect(W / 2 - 80, 90, 160, 2);

    const sorted = (Array.isArray(leaderboard) ? leaderboard : [])
      .sort((a: LeaderboardEntry, b: LeaderboardEntry) => (b.average_rating || 0) - (a.average_rating || 0))
      .slice(0, 5);

    const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
    const colors = ["#FFD700", "#C0C0C0", "#CD7F32", "#A855F7", "#A855F7"];

    for (let i = 0; i < sorted.length; i++) {
      const y = 180 + i * 150;
      const p = sorted[i];

      // Row background
      ctx.fillStyle = i === 0 ? "rgba(255, 215, 0, 0.05)" : "rgba(168, 85, 247, 0.03)";
      ctx.fillRect(60, y, W - 120, 120);
      ctx.strokeStyle = i === 0 ? "rgba(255, 215, 0, 0.2)" : "rgba(168, 85, 247, 0.1)";
      ctx.strokeRect(60, y, W - 120, 120);

      // Rank
      ctx.font = "36px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(medals[i], 90, y + 70);

      // Name
      ctx.font = "bold 28px 'Orbitron', monospace";
      ctx.fillStyle = colors[i];
      ctx.textAlign = "left";
      ctx.fillText(p.name, 160, y + 55);

      // Stats
      ctx.font = "16px 'JetBrains Mono', monospace";
      ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
      const kd = p.deaths > 0 ? (p.kills / p.deaths).toFixed(2) : p.kills.toFixed(0);
      ctx.fillText(`${(p.average_rating || 0).toFixed(2)} rating  |  ${p.kills} kills  |  ${kd} K/D  |  ${p.hsp || 0}% HS`, 160, y + 85);
    }

    drawBranding(ctx);
  };

  const drawCountdown = (ctx: CanvasRenderingContext2D) => {
    drawBackground(ctx);

    const target = new Date(countdownDate + "T12:00:00");
    const now = new Date();
    const diff = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 86400000));

    // Big number
    ctx.font = "bold 200px 'Orbitron', monospace";
    ctx.fillStyle = "#A855F7";
    ctx.textAlign = "center";
    ctx.fillText(String(diff), W / 2, 480);

    ctx.font = "bold 36px 'Orbitron', monospace";
    ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
    ctx.fillText("DIAS", W / 2, 540);

    ctx.font = "bold 28px 'Orbitron', monospace";
    ctx.fillStyle = "#E2E8F0";
    ctx.fillText(countdownTitle, W / 2, 680);

    ctx.font = "18px 'JetBrains Mono', monospace";
    ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
    ctx.fillText(target.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }), W / 2, 720);

    // Glow effect around number
    ctx.shadowColor = "#A855F7";
    ctx.shadowBlur = 40;
    ctx.fillStyle = "rgba(168, 85, 247, 0.1)";
    ctx.fillRect(W / 2 - 200, 300, 400, 260);
    ctx.shadowBlur = 0;

    drawBranding(ctx);
  };

  const drawStat = (ctx: CanvasRenderingContext2D) => {
    drawBackground(ctx);

    ctx.font = "bold 16px 'Orbitron', monospace";
    ctx.fillStyle = "#A855F7";
    ctx.textAlign = "center";
    ctx.fillText("STAT DO DIA", W / 2, 80);
    ctx.fillRect(W / 2 - 50, 90, 100, 2);

    // Title
    ctx.font = "bold 28px 'Orbitron', monospace";
    ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
    ctx.fillText(statTitle || "ORBITAL ROXA CUP #1", W / 2, 320);

    // Big value
    ctx.font = "bold 160px 'Orbitron', monospace";
    ctx.fillStyle = "#A855F7";
    ctx.fillText(statValue || "153", W / 2, 560);

    // Description
    ctx.font = "bold 24px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#E2E8F0";
    ctx.fillText(statDesc || "kills por leoking_ no campeonato", W / 2, 660);

    drawBranding(ctx);
  };

  const drawAnuncio = (ctx: CanvasRenderingContext2D) => {
    drawBackground(ctx);

    // Big title
    const lines = (anuncioTitle || "ORBITAL ROXA CUP #2").split("\n");
    ctx.font = "bold 52px 'Orbitron', monospace";
    ctx.fillStyle = "#E2E8F0";
    ctx.textAlign = "center";
    let y = 400 - (lines.length - 1) * 35;
    for (const line of lines) {
      ctx.fillText(line, W / 2, y);
      y += 70;
    }

    // Subtitle
    if (anuncioSubtitle) {
      ctx.font = "24px 'JetBrains Mono', monospace";
      ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
      ctx.fillText(anuncioSubtitle, W / 2, y + 40);
    }

    // Purple accent line
    ctx.fillStyle = "#A855F7";
    ctx.fillRect(W / 2 - 100, y + 70, 200, 3);

    drawBranding(ctx);
  };

  const generate = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setGenerating(true);
    await document.fonts.ready;

    ctx.clearRect(0, 0, W, H);

    switch (template) {
      case "resultado": await drawResultado(ctx); break;
      case "spotlight": drawSpotlight(ctx); break;
      case "top5": drawTop5(ctx); break;
      case "stat": drawStat(ctx); break;
      case "countdown": drawCountdown(ctx); break;
      case "anuncio": drawAnuncio(ctx); break;
    }

    setPreviewUrl(canvas.toDataURL("image/png"));
    setGenerating(false);
  };

  const downloadImage = () => {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = `orbital_${template}_${Date.now()}.png`;
    a.click();
  };

  const inputClass = "w-full bg-[#111] border border-orbital-border px-3 py-2 text-orbital-text font-[family-name:var(--font-jetbrains)] text-xs placeholder:text-orbital-text-dim/50 focus:outline-none focus:border-orbital-purple/50";
  const labelClass = "font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-wider text-orbital-purple mb-1 block";

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={24} className="text-orbital-purple animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-orbitron)] text-lg tracking-wider text-orbital-text">GERADOR DE CARDS</h1>
          <p className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] text-orbital-text-dim">Crie imagens 1080x1080 prontas pro Instagram</p>
        </div>
      </div>

      {/* Template selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {TEMPLATES.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => { setTemplate(t.id); setPreviewUrl(null); }}
              className={`p-3 border text-center transition-all ${template === t.id ? "bg-orbital-purple/10 border-orbital-purple/50 text-orbital-purple" : "bg-[#0A0A0A] border-orbital-border text-orbital-text-dim hover:border-orbital-purple/30"}`}
            >
              <Icon size={18} className="mx-auto mb-1.5" />
              <div className="font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider">{t.label}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          <div className="bg-[#0A0A0A] border border-orbital-border p-5 space-y-4">
            <div className="font-[family-name:var(--font-orbitron)] text-[0.7rem] tracking-wider text-orbital-purple">CONFIGURAÇÃO</div>

            {template === "resultado" && (
              <div>
                <label className={labelClass}>PARTIDA</label>
                <select value={selectedMatch || ""} onChange={e => setSelectedMatch(Number(e.target.value))} className={inputClass}>
                  <option value="">Selecione...</option>
                  {matches.map(m => (
                    <option key={m.id} value={m.id}>#{m.id} {m.team1_string} {m.team1_score}:{m.team2_score} {m.team2_string}</option>
                  ))}
                </select>
              </div>
            )}

            {template === "spotlight" && (
              <div>
                <label className={labelClass}>JOGADOR</label>
                <select value={selectedPlayer} onChange={e => setSelectedPlayer(e.target.value)} className={inputClass}>
                  <option value="">Selecione...</option>
                  {(Array.isArray(leaderboard) ? leaderboard : []).map((p: LeaderboardEntry) => (
                    <option key={p.steamId || (p as unknown as { steam_id: string }).steam_id} value={p.steamId || (p as unknown as { steam_id: string }).steam_id}>
                      {p.name} — {(p.average_rating || 0).toFixed(2)} rating
                    </option>
                  ))}
                </select>
              </div>
            )}

            {template === "countdown" && (
              <>
                <div>
                  <label className={labelClass}>TÍTULO</label>
                  <input type="text" value={countdownTitle} onChange={e => setCountdownTitle(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>DATA DO EVENTO</label>
                  <input type="date" value={countdownDate} onChange={e => setCountdownDate(e.target.value)} className={inputClass} />
                </div>
              </>
            )}

            {template === "stat" && (
              <>
                <div>
                  <label className={labelClass}>TÍTULO</label>
                  <input type="text" value={statTitle} onChange={e => setStatTitle(e.target.value)} placeholder="ORBITAL ROXA CUP #1" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>VALOR (grande)</label>
                  <input type="text" value={statValue} onChange={e => setStatValue(e.target.value)} placeholder="153" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>DESCRIÇÃO</label>
                  <input type="text" value={statDesc} onChange={e => setStatDesc(e.target.value)} placeholder="kills por leoking_ no campeonato" className={inputClass} />
                </div>
              </>
            )}

            {template === "anuncio" && (
              <>
                <div>
                  <label className={labelClass}>TÍTULO (use \n pra quebrar linha)</label>
                  <textarea value={anuncioTitle} onChange={e => setAnuncioTitle(e.target.value)} placeholder="ORBITAL ROXA\nCUP #2" rows={3} className={`${inputClass} resize-none`} />
                </div>
                <div>
                  <label className={labelClass}>SUBTÍTULO</label>
                  <input type="text" value={anuncioSubtitle} onChange={e => setAnuncioSubtitle(e.target.value)} placeholder="Em breve." className={inputClass} />
                </div>
              </>
            )}

            {template === "top5" && (
              <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
                Gera automaticamente com os top 5 do leaderboard atual ({(Array.isArray(leaderboard) ? leaderboard : []).length} jogadores).
              </p>
            )}

            <button onClick={generate} disabled={generating}
              className="w-full py-3 bg-orbital-purple hover:bg-orbital-purple/80 disabled:opacity-40 text-white font-[family-name:var(--font-orbitron)] text-[0.7rem] tracking-wider transition-colors flex items-center justify-center gap-2"
            >
              {generating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              GERAR CARD
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-3">
          <div className="bg-[#0A0A0A] border border-orbital-border p-2">
            {previewUrl ? (
              <motion.img initial={{ opacity: 0 }} animate={{ opacity: 1 }} src={previewUrl} alt="Card preview" className="w-full aspect-square object-contain" />
            ) : (
              <div className="w-full aspect-square flex items-center justify-center text-orbital-text-dim">
                <div className="text-center">
                  <Trophy size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="font-[family-name:var(--font-jetbrains)] text-xs">Selecione um template e clique GERAR</p>
                </div>
              </div>
            )}
          </div>
          {previewUrl && (
            <button onClick={downloadImage}
              className="w-full py-2.5 bg-green-500/10 border border-green-500/30 hover:border-green-500/60 text-green-400 font-[family-name:var(--font-orbitron)] text-[0.7rem] tracking-wider transition-colors flex items-center justify-center gap-2"
            >
              <Download size={16} />
              DOWNLOAD PNG (1080x1080)
            </button>
          )}
        </div>
      </div>

      {/* Hidden canvas */}
      <canvas ref={canvasRef} width={W} height={H} className="hidden" />
    </div>
  );
}
